import assert from "node:assert/strict"
import fs from "fs/promises"
import http from "http"
import os from "os"
import path from "path"
import test from "node:test"
import { clipCrownSource } from "../server/clip.mjs"
import { handleApi, parseBody } from "../server/dispatch.mjs"
import { listen } from "../server/host.mjs"

const root = process.cwd()

function request(routePath, extra = {}) {
  return handleApi({
    method: extra.method ?? "GET",
    path: routePath,
    query: extra.query ?? {},
    headers: extra.headers ?? {},
    body: extra.body ?? null,
  }, { production: extra.production ?? false, root })
}

test("clip keeps the unified runtime and exports crown", async () => {
  const source = await fs.readFile(path.join(root, "crown"), "utf8")
  const clipped = clipCrownSource(source)
  assert.equal(clipped.startsWith("/* UNIFIED */"), true)
  assert.equal(clipped.includes("#!/usr/bin/node"), false)
  assert.equal(clipped.includes("export { crown }\n"), true)
  globalThis.fs = fs
  globalThis.path = path
  const mod = await import(`data:text/javascript,${encodeURIComponent(clipped)}`)
  assert.equal(typeof mod.crown, "function")
})

test("health returns ok", async () => {
  const result = await request("health")
  assert.equal(result.status, 200)
  assert.equal(result.headers["content-type"], "application/json; charset=utf-8")
  assert.deepEqual(JSON.parse(result.body), { ok: true })
})

test("echo returns the method and path", async () => {
  const result = await request("echo", { method: "POST" })
  assert.equal(result.status, 200)
  assert.deepEqual(JSON.parse(result.body), { method: "POST", path: "echo" })
})

test("notes list requires a connection", async () => {
  const result = await request("notes/list", { method: "POST", body: {} })
  assert.equal(result.status, 400)
  assert.equal(JSON.parse(result.body).error, "connectionId is required")
})

test("missing route is 404", async () => {
  const result = await request("missing")
  assert.equal(result.status, 404)
  assert.equal(result.body, "not found")
})

test("parent segments are rejected", async () => {
  const result = await request("../secret")
  assert.equal(result.status, 400)
  assert.equal(result.body, "invalid path")
})

test("empty path is rejected", async () => {
  const result = await request("")
  assert.equal(result.status, 400)
  assert.equal(result.body, "invalid path")
})

test("handler failures become 500 and production masks them", async () => {
  const fail = path.join(root, "server/routes/fail.mcr")
  await fs.writeFile(fail, "error 'boom'\n")
  try {
    const dev = await request("fail")
    assert.equal(dev.status, 500)
    assert.equal(dev.body, "boom")
    const prod = await request("fail", { production: true })
    assert.equal(prod.status, 500)
    assert.equal(prod.body, "internal error")
  } finally {
    await fs.unlink(fail)
  }
})

test("parseBody reads json and plain text", () => {
  assert.equal(parseBody("", "application/json"), null)
  assert.deepEqual(parseBody('{"n":1}', "application/json; charset=utf-8"), { n: 1 })
  assert.equal(parseBody("plain", "text/plain"), "plain")
  assert.throws(() => parseBody("{", "application/json"))
})

test("dev server serves the page, crown module, and api", async () => {
  const server = await listen({ port: 0 })
  try {
    const { port } = server.address()
    const base = `http://127.0.0.1:${port}`
    const page = await fetch(`${base}/`)
    const html = await page.text()
    assert.equal(page.status, 200)
    assert.match(html, /import\("\/crown\.mjs"\)/)
    assert.match(html, /runFile\("\/app\.cr"\)/)
    assert.match(html, /href="\/favicon\.ico"/)
    const icon = await fetch(`${base}/favicon.ico`)
    assert.equal(icon.status, 200)
    assert.equal(icon.headers.get("content-type"), "image/x-icon")
    const moduleResponse = await fetch(`${base}/crown.mjs`)
    const moduleText = await moduleResponse.text()
    assert.equal(moduleResponse.headers.get("cache-control"), "no-cache")
    assert.equal(moduleText.startsWith("/* UNIFIED */"), true)
    assert.equal(moduleText.includes("export { crown }"), true)
    const health = await fetch(`${base}/api/health`)
    assert.deepEqual(await health.json(), { ok: true })
    const notesPage = await fetch(`${base}/notes`)
    assert.equal(notesPage.status, 200)
    assert.match(await notesPage.text(), /runFile\("\/app\.cr"\)/)
    const notePage = await fetch(`${base}/notes/note-1`)
    assert.equal(notePage.status, 200)
    assert.match(await notePage.text(), /import\("\/crown\.mjs"\)/)
    const nested = await fetch(`${base}/notes/note-1/extra`)
    assert.equal(nested.status, 404)
    const missing = await fetch(`${base}/nope`)
    assert.equal(missing.status, 404)
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})

test("production server caches crown.mjs and masks handler errors", async () => {
  const fail = path.join(root, "server/routes/fail.mcr")
  await fs.writeFile(fail, "error 'boom'\n")
  const server = await listen({ production: true, port: 0 })
  try {
    const { port } = server.address()
    const base = `http://127.0.0.1:${port}`
    const moduleResponse = await fetch(`${base}/crown.mjs`)
    assert.equal(moduleResponse.headers.get("cache-control"), "public, max-age=3600")
    const failed = await fetch(`${base}/api/fail`)
    assert.equal(failed.status, 500)
    assert.equal(await failed.text(), "internal error")
  } finally {
    await fs.unlink(fail)
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})

test("local database supports schema, rows, edits, and notes", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "grone-"))
  process.env.GRONE_DATA_DIR = dataDir
  try {
    const created = await request("databases/create", {
      method: "POST",
      body: { kind: "local", name: "Notes" },
    })
    assert.equal(created.status, 200)
    const connection = JSON.parse(created.body).connection
    assert.equal(connection.kind, "local")
    assert.equal(connection.hasToken, false)
    assert.equal(JSON.parse(created.body).connection.authToken, undefined)

    const listed = await request("databases/list")
    assert.equal(listed.status, 200)
    assert.equal(JSON.parse(listed.body).connections.length, 1)

    const setup = await request("databases/query", {
      method: "POST",
      body: {
        connectionId: connection.id,
        sql: "INSERT INTO missing_table (id) VALUES (1)",
      },
    })
    assert.equal(setup.status, 400)

    const ready = await request("databases/query", {
      method: "POST",
      body: {
        connectionId: connection.id,
        sql: `CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, active INTEGER);
INSERT INTO customers (id, name, active) VALUES (1, 'Ada', 1), (2, 'Grace', 0);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, total INTEGER);
INSERT INTO orders (id, customer_id, total) VALUES (10, 1, 5), (11, 2, 9);`,
      },
    })
    assert.equal(ready.status, 200)
    assert.equal(JSON.parse(ready.body).results.length, 4)

    const schema = await request("databases/schema", {
      method: "POST",
      body: { connectionId: connection.id },
    })
    assert.equal(schema.status, 200)
    const tables = JSON.parse(schema.body).tables
    const customers = tables.find((table) => table.name === "customers")
    assert.deepEqual(customers.primaryKey, ["id"])
    assert.equal(customers.columns.find((column) => column.name === "name").type, "TEXT")

    const rows = await request("databases/rows", {
      method: "POST",
      body: {
        connectionId: connection.id,
        table: "customers",
        sort: [{ column: "name", direction: "asc" }],
        filters: [{ column: "name", op: "contains", value: "Ada" }],
        page: 0,
        pageSize: 100,
      },
    })
    assert.equal(rows.status, 200)
    const grid = JSON.parse(rows.body)
    assert.equal(grid.rows.length, 1)
    assert.deepEqual(grid.columns.map((column) => column.name), ["id", "name", "active"])
    assert.equal(grid.columns.find((column) => column.name === "id").type, "INTEGER")
    assert.equal(grid.columns.find((column) => column.name === "name").type, "TEXT")
    assert.equal(grid.editable, true)
    assert.match(grid.sourceSql, /ORDER BY "name" asc/)
    assert.equal(grid.rows[0][1], "Ada")

    const ranged = await request("databases/rows", {
      method: "POST",
      body: {
        connectionId: connection.id,
        table: "orders",
        filters: [
          { column: "total", op: "gt", value: "4" },
          { column: "total", op: "lt", value: "9", join: "and" },
        ],
      },
    })
    assert.equal(ranged.status, 200)
    assert.deepEqual(JSON.parse(ranged.body).rows.map((row) => row[2]), [5])

    const either = await request("databases/rows", {
      method: "POST",
      body: {
        connectionId: connection.id,
        table: "customers",
        filters: [
          { column: "name", op: "eq", value: "Ada" },
          { column: "name", op: "eq", value: "Grace", join: "or" },
        ],
      },
    })
    assert.equal(either.status, 200)
    assert.deepEqual(
      JSON.parse(either.body).rows.map((row) => row[1]).sort(),
      ["Ada", "Grace"]
    )

    const renamed = await request("databases/mutate", {
      method: "POST",
      body: {
        connectionId: connection.id,
        action: "update",
        table: "customers",
        column: "name",
        value: "Ada Lovelace",
        primaryKey: { id: 1 },
      },
    })
    assert.equal(renamed.status, 200)

    const inserted = await request("databases/mutate", {
      method: "POST",
      body: {
        connectionId: connection.id,
        action: "insert",
        table: "customers",
        row: { id: 3, name: "Edsger", active: 1 },
      },
    })
    assert.equal(inserted.status, 200)

    const quoted = await request("databases/rows", {
      method: "POST",
      body: { connectionId: connection.id, table: 'customers"; drop table customers; --' },
    })
    assert.equal(quoted.status, 404)

    const legacy = await request("databases/query", {
      method: "POST",
      body: {
        connectionId: connection.id,
        sql: `CREATE TABLE grone_note (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO grone_note (id, title, updated_at) VALUES ('legacy', 'Legacy', '2020-01-01T00:00:00.000Z')`,
      },
    })
    assert.equal(legacy.status, 200)

    const ensured = await request("notes/ensure", {
      method: "POST",
      body: { connectionId: connection.id },
    })
    assert.equal(ensured.status, 200)
    const withNotes = await request("databases/schema", {
      method: "POST",
      body: { connectionId: connection.id },
    })
    const names = JSON.parse(withNotes.body).tables.map((table) => table.name)
    assert.ok(names.includes("grone_note"))
    assert.ok(names.includes("grone_block"))
    const noteTable = JSON.parse(withNotes.body).tables.find((table) => table.name === "grone_note")
    assert.ok(noteTable.columns.some((column) => column.name === "archived"))

    const saved = await request("notes/save", {
      method: "POST",
      body: {
        connectionId: connection.id,
        note: {
          id: "note-1",
          title: "Pipeline",
          blocks: [
            { id: "b1", kind: "markdown", name: "", body: "# Customers" },
            {
              id: "b2",
              kind: "dataset",
              name: "customers",
              body: JSON.stringify({
                columns: [{ name: "id", type: "INTEGER" }],
                rows: [[1]],
                sort: [{ column: "id", direction: "asc" }],
                filters: [],
                sourceSql: "SELECT id FROM customers",
              }),
            },
          ],
        },
      },
    })
    assert.equal(saved.status, 200)
    const note = JSON.parse(saved.body).note
    assert.equal(note.blocks.length, 2)
    assert.equal(note.archived, 0)
    assert.equal(note.blocks[1].kind, "dataset")
    const dataset = JSON.parse(note.blocks[1].body)
    assert.deepEqual(dataset.sort, [{ column: "id", direction: "asc" }])

    const archived = await request("notes/save", {
      method: "POST",
      body: {
        connectionId: connection.id,
        note: { ...note, archived: 1 },
      },
    })
    assert.equal(archived.status, 200)
    assert.equal(JSON.parse(archived.body).note.archived, 1)
    const listedNotes = await request("notes/list", {
      method: "POST",
      body: { connectionId: connection.id },
    })
    const notes = JSON.parse(listedNotes.body).notes
    assert.equal(notes.find((item) => item.id === "legacy").archived, 0)
    assert.equal(notes.find((item) => item.id === "note-1").archived, 1)
    const { archived: archivedFlag, ...withoutFlag } = JSON.parse(archived.body).note
    assert.equal(archivedFlag, 1)
    const kept = await request("notes/save", {
      method: "POST",
      body: {
        connectionId: connection.id,
        note: { ...withoutFlag, title: "Pipeline kept" },
      },
    })
    assert.equal(JSON.parse(kept.body).note.archived, 1)
    assert.equal(JSON.parse(kept.body).note.title, "Pipeline kept")

    const fetched = await request("notes/get", {
      method: "POST",
      body: { connectionId: connection.id, id: "note-1" },
    })
    assert.equal(JSON.parse(fetched.body).note.title, "Pipeline kept")
    assert.equal(JSON.parse(fetched.body).note.archived, 1)

    const removed = await request("notes/delete", {
      method: "POST",
      body: { connectionId: connection.id, id: "note-1" },
    })
    assert.equal(removed.status, 200)
    const gone = await request("notes/get", {
      method: "POST",
      body: { connectionId: connection.id, id: "note-1" },
    })
    assert.equal(gone.status, 404)
  } finally {
    delete process.env.GRONE_DATA_DIR
    await fs.rm(dataDir, { recursive: true, force: true })
  }
})

test("vercel catch-all reads the path from query segments", async () => {
  const { default: handler } = await import("../api/[...path].js")
  const req = httpRequest({
    method: "GET",
    url: "/api/health",
    headers: { host: "localhost" },
    query: { path: ["health"] },
  })
  const res = httpResponse()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(JSON.parse(res.body), { ok: true })
})

function httpRequest({ method, url, headers, query }) {
  const req = new http.IncomingMessage(null)
  req.method = method
  req.url = url
  req.headers = headers
  req.query = query
  req.push(null)
  return req
}

function httpResponse() {
  const res = new http.ServerResponse(httpRequest({
    method: "GET",
    url: "/",
    headers: {},
  }))
  const chunks = []
  const originalEnd = res.end.bind(res)
  res.end = (chunk, ...rest) => {
    if (chunk) {
      chunks.push(Buffer.from(chunk))
    }
    res.body = Buffer.concat(chunks).toString("utf8")
    return originalEnd(chunk, ...rest)
  }
  const originalWriteHead = res.writeHead.bind(res)
  res.writeHead = (status, headers) => {
    res.statusCode = status
    return originalWriteHead(status, headers)
  }
  return res
}
