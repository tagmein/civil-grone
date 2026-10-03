import { createClient } from "@libsql/client"
import { randomUUID } from "crypto"
import fs from "fs/promises"
import path from "path"

const MAX_ROWS = 500
const DEFAULT_PAGE_SIZE = 100

export function createDb(root) {
  const base = process.env.GRONE_DATA_DIR || path.join(root, "data")
  const connectionsFile = path.join(base, "connections.json")
  const databasesDir = path.join(base, "databases")

  return {
    list: () => listConnections(connectionsFile),
    create: (body) => createConnection(connectionsFile, databasesDir, body),
    remove: (body) => removeConnection(connectionsFile, body),
    schema: (body) => withConnection(connectionsFile, body, (client) => readSchema(client)),
    rows: (body) => withConnection(connectionsFile, body, (client) => readRows(client, body)),
    query: (body) => withConnection(connectionsFile, body, (client) => runScript(client, body)),
    mutate: (body) => withConnection(connectionsFile, body, (client) => mutate(client, body)),
    notesList: (body) => withConnection(connectionsFile, body, (client) => listNotes(client)),
    notesGet: (body) => withConnection(connectionsFile, body, (client) => getNote(client, body)),
    notesSave: (body) => withConnection(connectionsFile, body, (client) => saveNote(client, body)),
    notesDelete: (body) => withConnection(connectionsFile, body, (client) => deleteNote(client, body)),
    notesEnsure: (body) => withConnection(connectionsFile, body, async (client) => {
      await ensureNotes(client)
      return ok({})
    }),
  }
}

function ok(json) {
  return { status: 200, json }
}

function fail(status, error) {
  return { status, json: { error } }
}

async function readConnections(file) {
  try {
    const text = await fs.readFile(file, "utf8")
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    if (error.code === "ENOENT") {
      return []
    }
    throw error
  }
}

async function writeConnections(file, connections) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(connections, null, 2))
}

function publicConnection(connection) {
  return {
    id: connection.id,
    name: connection.name,
    kind: connection.kind,
    label: connection.kind === "local" ? path.basename(connection.url.slice("file:".length)) : connection.url,
    hasToken: Boolean(connection.authToken),
  }
}

async function listConnections(file) {
  const connections = await readConnections(file)
  return ok({ connections: connections.map(publicConnection) })
}

async function createConnection(file, databasesDir, body) {
  const name = text(body?.name)
  if (!name) {
    return fail(400, "name is required")
  }
  const kind = body?.kind === "remote" ? "remote" : "local"
  const id = randomUUID()
  let url = ""
  let authToken = ""
  if (kind === "local") {
    await fs.mkdir(databasesDir, { recursive: true })
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "database"
    const filename = `${slug}-${id.slice(0, 8)}.db`
    url = `file:${path.join(databasesDir, filename)}`
    const client = open({ url })
    try {
      await client.execute("SELECT 1")
    } finally {
      client.close()
    }
  } else {
    url = text(body?.url)
    authToken = text(body?.authToken)
    if (!url.startsWith("libsql://") && !url.startsWith("https://") && !url.startsWith("http://")) {
      return fail(400, "remote url must start with libsql://, https://, or http://")
    }
    const client = open({ url, authToken })
    try {
      await client.execute("SELECT 1")
    } catch (error) {
      return fail(400, error.message)
    } finally {
      client.close()
    }
  }
  const connections = await readConnections(file)
  const connection = { id, name, kind, url, authToken }
  connections.push(connection)
  await writeConnections(file, connections)
  return ok({ connection: publicConnection(connection) })
}

async function removeConnection(file, body) {
  const id = text(body?.connectionId)
  const connections = await readConnections(file)
  const next = connections.filter((item) => item.id !== id)
  if (next.length === connections.length) {
    return fail(404, "connection not found")
  }
  await writeConnections(file, next)
  return ok({ ok: true })
}

async function withConnection(file, body, run) {
  const id = text(body?.connectionId)
  if (!id) {
    return fail(400, "connectionId is required")
  }
  const connections = await readConnections(file)
  const connection = connections.find((item) => item.id === id)
  if (!connection) {
    return fail(404, "connection not found")
  }
  const client = open(connection)
  try {
    return await run(client)
  } catch (error) {
    return fail(400, error.message)
  } finally {
    client.close()
  }
}

function open(connection) {
  return createClient({
    url: connection.url,
    authToken: connection.authToken || undefined,
  })
}

function quoteIdent(name) {
  return `"${String(name).replaceAll('"', '""')}"`
}

async function readSchema(client) {
  const master = await client.execute(
    "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name",
  )
  const tables = []
  for (const row of master.rows) {
    const name = String(row.name ?? row[0])
    const type = String(row.type ?? row[1])
    const info = await client.execute({
      sql: "SELECT name, type, pk FROM pragma_table_info(?)",
      args: [name],
    })
    const columns = info.rows.map((column) => ({
      name: String(column.name ?? column[0]),
      type: String(column.type ?? column[1] ?? ""),
      pk: Number(column.pk ?? column[2] ?? 0),
    }))
    tables.push({
      name,
      type,
      columns,
      primaryKey: columns.filter((column) => column.pk > 0).sort((a, b) => a.pk - b.pk).map((column) => column.name),
    })
  }
  return ok({ tables })
}

async function readRows(client, body) {
  const schema = await readSchema(client)
  const table = schema.json.tables.find((item) => item.name === body?.table)
  if (!table) {
    return fail(404, "table not found")
  }
  const pageSize = clamp(body?.pageSize ?? DEFAULT_PAGE_SIZE, 1, MAX_ROWS)
  const page = Math.max(0, Number(body?.page) || 0)
  const sort = normalizeSort(body?.sort, table)
  const filters = normalizeFilters(body?.filters, table)
  const where = compileFilters(filters)
  const order = sort.map((item) => `${quoteIdent(item.column)} ${item.direction}`).join(", ")
  let sql = `SELECT * FROM ${quoteIdent(table.name)}`
  if (where.clauses.length) {
    sql += ` WHERE ${where.clauses.join(" AND ")}`
  }
  const sourceSql = order ? `${sql} ORDER BY ${order}` : sql
  const count = await client.execute({
    sql: `SELECT COUNT(*) AS n FROM ${quoteIdent(table.name)}${where.clauses.length ? ` WHERE ${where.clauses.join(" AND ")}` : ""}`,
    args: where.args,
  })
  const total = Number(count.rows[0]?.n ?? count.rows[0]?.[0] ?? 0)
  const result = await client.execute({
    sql: `${sourceSql} LIMIT ? OFFSET ?`,
    args: [...where.args, pageSize, page * pageSize],
  })
  const packed = pack(result, pageSize)
  return ok({
    ...packed,
    columns: packed.columns.map((column) => {
      const declared = table.columns.find((item) => item.name === column.name)
      return {
        ...column,
        type: declared?.type || column.type,
      }
    }),
    sort,
    filters,
    sourceSql,
    total,
    page,
    pageSize,
    primaryKey: table.primaryKey,
    editable: table.primaryKey.length > 0 && table.type === "table",
  })
}

function normalizeSort(sort, table) {
  if (!Array.isArray(sort)) {
    return []
  }
  return sort
    .filter((item) => table.columns.some((column) => column.name === item?.column))
    .filter((item) => item.direction === "asc" || item.direction === "desc")
    .map((item) => ({ column: item.column, direction: item.direction }))
}

function normalizeFilters(filters, table) {
  if (!Array.isArray(filters)) {
    return []
  }
  const ops = new Set(["eq", "neq", "contains", "gt", "lt", "empty"])
  return filters
    .filter((item) => table.columns.some((column) => column.name === item?.column))
    .filter((item) => ops.has(item.op))
    .map((item) => {
      const next = {
        column: item.column,
        op: item.op,
        value: item.value == null ? "" : String(item.value),
      }
      if (item.join === "or" || item.join === "and") {
        next.join = item.join
      }
      return next
    })
}

function compileOne(filter) {
  const ident = quoteIdent(filter.column)
  if (filter.op === "empty") {
    return { clause: `(${ident} IS NULL OR CAST(${ident} AS TEXT) = '')`, args: [] }
  }
  if (filter.value === "") {
    return null
  }
  if (filter.op === "eq") {
    return { clause: `${ident} = ?`, args: [coerce(filter.value)] }
  }
  if (filter.op === "neq") {
    return { clause: `${ident} != ?`, args: [coerce(filter.value)] }
  }
  if (filter.op === "gt") {
    return { clause: `${ident} > ?`, args: [coerce(filter.value)] }
  }
  if (filter.op === "lt") {
    return { clause: `${ident} < ?`, args: [coerce(filter.value)] }
  }
  if (filter.op === "contains") {
    return {
      clause: `CAST(${ident} AS TEXT) LIKE ? ESCAPE '\\'`,
      args: [`%${filter.value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`],
    }
  }
  return null
}

function compileFilters(filters) {
  const groups = new Map()
  for (const filter of filters) {
    const list = groups.get(filter.column) ?? []
    list.push(filter)
    groups.set(filter.column, list)
  }
  const clauses = []
  const args = []
  for (const group of groups.values()) {
    const parts = []
    for (const filter of group) {
      const compiled = compileOne(filter)
      if (!compiled) {
        continue
      }
      if (parts.length === 0) {
        parts.push(compiled.clause)
      } else {
        parts.push(filter.join === "or" ? "OR" : "AND", compiled.clause)
      }
      args.push(...compiled.args)
    }
    if (parts.length > 0) {
      clauses.push(`(${parts.join(" ")})`)
    }
  }
  return { clauses, args }
}

async function runScript(client, body) {
  const sql = text(body?.sql)
  if (!sql) {
    return fail(400, "sql is required")
  }
  const statements = splitSql(sql)
  if (statements.length === 0) {
    return fail(400, "sql is required")
  }
  const args = Array.isArray(body?.args) ? body.args.map(coerce) : []
  if (statements.length > 1 && args.length > 0) {
    return fail(400, "arguments are only supported for a single statement")
  }
  const results = []
  for (const statement of statements) {
    const result = await client.execute({
      sql: statement,
      args: statements.length === 1 ? args : [],
    })
    results.push(pack(result, MAX_ROWS))
  }
  return ok({ results })
}

async function mutate(client, body) {
  const schema = await readSchema(client)
  const table = schema.json.tables.find((item) => item.name === body?.table && item.type === "table")
  if (!table) {
    return fail(404, "table not found")
  }
  const action = body?.action
  if ((action === "update" || action === "delete") && table.primaryKey.length === 0) {
    return fail(400, "No primary key, this grid is read-only")
  }
  const key = body?.primaryKey ?? {}
  const where = table.primaryKey.map((name) => `${quoteIdent(name)} = ?`).join(" AND ")
  const keyArgs = table.primaryKey.map((name) => coerce(key[name]))
  if (action === "update" || action === "delete") {
   for (const name of table.primaryKey) {
    if (!(name in key)) {
     return fail(400, `primary key ${name} is required`)
    }
   }
  }
  if (action === "update") {
    if (!table.columns.some((column) => column.name === body?.column)) {
      return fail(400, "column not found")
    }
    await client.execute({
      sql: `UPDATE ${quoteIdent(table.name)} SET ${quoteIdent(body.column)} = ? WHERE ${where}`,
      args: [coerce(body.value), ...keyArgs],
    })
    return ok({ ok: true })
  }
  if (action === "delete") {
    await client.execute({
      sql: `DELETE FROM ${quoteIdent(table.name)} WHERE ${where}`,
      args: keyArgs,
    })
    return ok({ ok: true })
  }
  if (action === "insert") {
    const row = body?.row && typeof body.row === "object" ? body.row : null
    if (!row) {
      return fail(400, "row is required")
    }
    const names = Object.keys(row).filter((name) => table.columns.some((column) => column.name === name))
    if (names.length === 0) {
      return fail(400, "row is empty")
    }
    await client.execute({
      sql: `INSERT INTO ${quoteIdent(table.name)} (${names.map(quoteIdent).join(", ")}) VALUES (${names.map(() => "?").join(", ")})`,
      args: names.map((name) => coerce(row[name])),
    })
    return ok({ ok: true })
  }
  return fail(400, "action must be update, insert, or delete")
}

async function ensureNotes(client) {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS grone_note (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS grone_block (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      kind TEXT NOT NULL,
      name TEXT,
      body TEXT NOT NULL
    );
  `)
  const info = await client.execute({
    sql: "SELECT name FROM pragma_table_info(?)",
    args: ["grone_note"],
  })
  const names = info.rows.map((row) => String(row.name ?? row[0]))
  if (!names.includes("archived")) {
    await client.execute("ALTER TABLE grone_note ADD COLUMN archived INTEGER NOT NULL DEFAULT 0")
  }
}

function noteSummary(row) {
  return {
    id: String(row.id ?? row[0]),
    title: String(row.title ?? row[1]),
    updated_at: String(row.updated_at ?? row[2]),
    archived: archivedFlag(row.archived ?? row[3]),
  }
}

function archivedFlag(value) {
  return value === true || value === 1 || value === 1n || value === "1" ? 1 : 0
}

async function listNotes(client) {
  await ensureNotes(client)
  const result = await client.execute("SELECT id, title, updated_at, archived FROM grone_note ORDER BY updated_at DESC")
  return ok({
    notes: result.rows.map(noteSummary),
  })
}

async function getNote(client, body) {
  await ensureNotes(client)
  const id = text(body?.id)
  const note = await client.execute({
    sql: "SELECT id, title, updated_at, archived FROM grone_note WHERE id = ?",
    args: [id],
  })
  if (note.rows.length === 0) {
    return fail(404, "note not found")
  }
  const blocks = await client.execute({
    sql: "SELECT id, position, kind, name, body FROM grone_block WHERE note_id = ? ORDER BY position",
    args: [id],
  })
  const row = note.rows[0]
  return ok({
    note: {
      ...noteSummary(row),
      blocks: blocks.rows.map((block) => ({
        id: String(block.id ?? block[0]),
        position: Number(block.position ?? block[1]),
        kind: String(block.kind ?? block[2]),
        name: block.name == null && block[3] == null ? "" : String(block.name ?? block[3]),
        body: String(block.body ?? block[4] ?? ""),
      })),
    },
  })
}

async function saveNote(client, body) {
  await ensureNotes(client)
  const note = body?.note
  const id = text(note?.id)
  const title = text(note?.title) || "Untitled"
  if (!id) {
    return fail(400, "note id is required")
  }
  const blocks = Array.isArray(note?.blocks) ? note.blocks : []
  const updatedAt = new Date().toISOString()
  let archived = archivedFlag(note?.archived)
  if (note?.archived == null) {
    const existing = await client.execute({
      sql: "SELECT archived FROM grone_note WHERE id = ?",
      args: [id],
    })
    if (existing.rows.length > 0) {
      const row = existing.rows[0]
      archived = archivedFlag(row.archived ?? row[0])
    }
  }
  const tx = await client.transaction("write")
  try {
    await tx.execute({
      sql: `INSERT INTO grone_note (id, title, updated_at, archived) VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET title = excluded.title, updated_at = excluded.updated_at, archived = excluded.archived`,
      args: [id, title, updatedAt, archived],
    })
    await tx.execute({ sql: "DELETE FROM grone_block WHERE note_id = ?", args: [id] })
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index]
      const kind = text(block?.kind)
      if (!["markdown", "crown", "javascript", "sql", "select", "dataset"].includes(kind)) {
        throw new Error(`unknown block kind ${kind}`)
      }
      await tx.execute({
        sql: "INSERT INTO grone_block (id, note_id, position, kind, name, body) VALUES (?, ?, ?, ?, ?, ?)",
        args: [
          text(block?.id) || randomUUID(),
          id,
          index,
          kind,
          text(block?.name),
          block?.body == null ? "" : String(block.body),
        ],
      })
    }
    await tx.commit()
  } catch (error) {
    await tx.rollback()
    throw error
  }
  return getNote(client, { id })
}

async function deleteNote(client, body) {
  await ensureNotes(client)
  const id = text(body?.id)
  const tx = await client.transaction("write")
  try {
    await tx.execute({ sql: "DELETE FROM grone_block WHERE note_id = ?", args: [id] })
    await tx.execute({ sql: "DELETE FROM grone_note WHERE id = ?", args: [id] })
    await tx.commit()
  } catch (error) {
    await tx.rollback()
    throw error
  }
  return ok({ ok: true })
}

function pack(result, cap) {
  const columns = (result.columns ?? []).map((column) => {
    if (typeof column === "string") {
      return { name: column, type: "" }
    }
    return {
      name: String(column?.name ?? ""),
      type: String(column?.type || column?.decltype || ""),
    }
  })
  const rows = result.rows.map((row) => columns.map((column, index) => normalizeCell(cellAt(row, column, index))))
  return {
    columns,
    rows: rows.slice(0, cap),
    rowsAffected: Number(result.rowsAffected ?? 0),
    truncated: rows.length > cap,
  }
}

function cellAt(row, column, index) {
  if (row && typeof row === "object" && column.name in row) {
    return row[column.name]
  }
  return row?.[index]
}

function normalizeCell(value) {
  if (typeof value === "bigint") {
    return value.toString()
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString("base64")
  }
  return value ?? null
}

function splitSql(sql) {
  const parts = []
  let current = ""
  let quote = ""
  for (let index = 0; index < sql.length; index += 1) {
    const ch = sql[index]
    if (quote) {
      current += ch
      if (ch === quote) {
        if (sql[index + 1] === quote) {
          current += sql[index + 1]
          index += 1
        } else {
          quote = ""
        }
      }
      continue
    }
    if (ch === "'" || ch === '"') {
      quote = ch
      current += ch
      continue
    }
    if (ch === "-" && sql[index + 1] === "-") {
      const end = sql.indexOf("\n", index)
      const stop = end === -1 ? sql.length : end
      current += sql.slice(index, stop)
      index = stop - 1
      continue
    }
    if (ch === ";") {
      if (current.trim()) {
        parts.push(current.trim())
      }
      current = ""
      continue
    }
    current += ch
  }
  if (current.trim()) {
    parts.push(current.trim())
  }
  return parts
}

function coerce(value) {
  if (typeof value !== "string") {
    return value
  }
  if (/^-?\d+$/.test(value)) {
    return Number(value)
  }
  if (/^-?\d+\.\d+$/.test(value)) {
    return Number(value)
  }
  return value
}

function text(value) {
  return value == null ? "" : String(value).trim()
}

function clamp(value, min, max) {
  const number = Number(value)
  if (!Number.isFinite(number)) {
    return min
  }
  return Math.min(max, Math.max(min, Math.trunc(number)))
}
