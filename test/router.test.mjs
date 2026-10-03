import assert from "node:assert/strict"
import fs from "fs/promises"
import http from "http"
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

test("nested route notes/list", async () => {
  const result = await request("notes/list")
  assert.equal(result.status, 200)
  assert.deepEqual(JSON.parse(result.body), { notes: [] })
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
    assert.match(html, /type="module" src="\/crown\.mjs"/)
    assert.match(html, /type="module" src="\/main\.mjs"/)
    const moduleResponse = await fetch(`${base}/crown.mjs`)
    const moduleText = await moduleResponse.text()
    assert.equal(moduleResponse.headers.get("cache-control"), "no-cache")
    assert.equal(moduleText.startsWith("/* UNIFIED */"), true)
    assert.equal(moduleText.includes("export { crown }"), true)
    const health = await fetch(`${base}/api/health`)
    assert.deepEqual(await health.json(), { ok: true })
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
