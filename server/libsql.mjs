import { createClient } from "@libsql/client"
import { randomUUID } from "crypto"
import fs from "fs/promises"
import path from "path"
import { createAccounts, ensureAccountSchema } from "./accounts.mjs"

const accounts = createAccounts()

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
    schema: (request) => withUser(connectionsFile, request, (client) => readSchema(client)),
    rows: (request) => withUser(connectionsFile, request, (client) => readRows(client, request.body)),
    query: (request) => withUser(connectionsFile, request, (client) => runScript(client, request.body)),
    mutate: (request) => withUser(connectionsFile, request, (client) => mutate(client, request.body)),
    notesList: (request) => withUser(connectionsFile, request, (client, user) => listNotes(client, user)),
    notesGet: (request) => withUser(connectionsFile, request, (client, user) => getNote(client, request.body, user)),
    notesSave: (request) => withUser(connectionsFile, request, (client, user) => saveNote(client, request.body, user)),
    notesDelete: (request) => withUser(connectionsFile, request, (client, user) => deleteNote(client, request.body, user)),
    notesShare: (request) => withUser(connectionsFile, request, (client, user) => shareNote(client, request.body, user)),
    notesUnshare: (request) => withUser(connectionsFile, request, (client, user) => unshareNote(client, request.body, user)),
    notesEnsure: (request) => withUser(connectionsFile, request, async (client) => {
      await ensureNotes(client)
      return ok({})
    }),
    authSession: (request) => withConnection(connectionsFile, request?.body, async (client) => {
      await ensureNotes(client)
      return accounts.session(client, request)
    }),
    authSignup: (request) => withConnection(connectionsFile, request?.body, async (client) => {
      await ensureNotes(client)
      return accounts.signup(client, request)
    }),
    authLogin: (request) => withConnection(connectionsFile, request?.body, async (client) => {
      await ensureNotes(client)
      return accounts.login(client, request)
    }),
    authLogout: (request) => withConnection(connectionsFile, request?.body, async (client) => {
      await ensureNotes(client)
      return accounts.logout(client, request)
    }),
    authTotpBegin: (request) => withAccount(connectionsFile, request, (client, _user, req) => accounts.totpBegin(client, req)),
    authTotpConfirm: (request) => withAccount(connectionsFile, request, (client, _user, req) => accounts.totpConfirm(client, req)),
    authTotpLogin: (request) => withConnection(connectionsFile, request?.body, async (client) => {
      await ensureNotes(client)
      return accounts.totpLogin(client, request)
    }),
    authWebauthnRegisterOptions: (request) => withAccount(connectionsFile, request, (client, _user, req) => accounts.webauthnRegisterOptions(client, req)),
    authWebauthnRegisterVerify: (request) => withAccount(connectionsFile, request, (client, _user, req) => accounts.webauthnRegisterVerify(client, req)),
    authWebauthnLoginOptions: (request) => withConnection(connectionsFile, request?.body, async (client) => {
      await ensureNotes(client)
      return accounts.webauthnLoginOptions(client, request)
    }),
    authWebauthnLoginVerify: (request) => withConnection(connectionsFile, request?.body, async (client) => {
      await ensureNotes(client)
      return accounts.webauthnLoginVerify(client, request)
    }),
    authFactorRemove: (request) => withAccount(connectionsFile, request, (client, _user, req) => accounts.factorRemove(client, req)),
    authProfile: (request) => withAccount(connectionsFile, request, (client, _user, req) => accounts.profile(client, req)),
    authInvites: (request) => withAccount(connectionsFile, request, (client, _user, req) => accounts.invites(client, req)),
    authInvitesSend: (request) => withAccount(connectionsFile, request, (client, _user, req) => accounts.invitesSend(client, req)),
    authInvitesRefill: (request) => withAccount(connectionsFile, request, (client, _user, req) => accounts.invitesRefill(client, req)),
    authUsers: (request) => withAccount(connectionsFile, request, (client, _user, req) => accounts.users(client, req)),
    authUsersLimit: (request) => withAccount(connectionsFile, request, (client, _user, req) => accounts.usersLimit(client, req)),
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

async function withUser(file, request, run) {
  return withConnection(file, request?.body, async (client) => {
    await ensureNotes(client)
    const auth = await accounts.requireUser(client, request)
    if (auth.response) {
      return auth.response
    }
    return run(client, auth.user)
  })
}

async function withAccount(file, request, run) {
  return withUser(file, request, (client, user) => run(client, user, request))
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
  const summaries = normalizeSummaries(body?.summaries, table)
  const summary = {}
  for (const [name, action] of Object.entries(summaries)) {
    summary[name] = await columnSummaryValue(client, table.name, name, action, where)
  }
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
    summary,
  })
}

function normalizeSummaries(summaries, table) {
  if (!summaries || typeof summaries !== "object" || Array.isArray(summaries)) {
    return {}
  }
  const allowed = new Set(["sum", "avg", "count"])
  const next = {}
  for (const [name, action] of Object.entries(summaries)) {
    if (table.columns.some((column) => column.name === name) && allowed.has(action)) {
      next[name] = action
    }
  }
  return next
}

async function columnSummaryValue(client, tableName, column, action, where) {
  const ident = quoteIdent(column)
  const from = `FROM ${quoteIdent(tableName)}${where.clauses.length ? ` WHERE ${where.clauses.join(" AND ")}` : ""}`
  if (action === "sum") {
    const result = await client.execute({
      sql: `SELECT COALESCE(SUM(${ident}), 0) AS v ${from}`,
      args: where.args,
    })
    return `Sum ${formatNumber(cellValue(result.rows[0], "v", 0))}`
  }
  if (action === "avg") {
    const result = await client.execute({
      sql: `SELECT AVG(${ident}) AS v ${from}`,
      args: where.args,
    })
    const value = cellValue(result.rows[0], "v", 0)
    return value == null ? "Avg" : `Avg ${formatNumber(value)}`
  }
  if (action === "count") {
    const result = await client.execute({
      sql: `SELECT
        SUM(CASE WHEN ${ident} IS NULL OR lower(CAST(${ident} AS TEXT)) IN ('', '0', 'false', 'f', 'no') THEN 0 ELSE 1 END) AS t,
        SUM(CASE WHEN ${ident} IS NULL OR lower(CAST(${ident} AS TEXT)) IN ('', '0', 'false', 'f', 'no') THEN 1 ELSE 0 END) AS f
        ${from}`,
      args: where.args,
    })
    const t = Number(cellValue(result.rows[0], "t", 0) ?? 0)
    const f = Number(cellValue(result.rows[0], "f", 1) ?? 0)
    return `${t}T/${f}F`
  }
  return ""
}

function cellValue(row, name, index) {
  if (!row) {
    return null
  }
  if (row[name] != null) {
    return row[name]
  }
  return row[index] ?? null
}

function formatNumber(value) {
  if (typeof value === "bigint") {
    return value.toString()
  }
  const number = Number(value ?? 0)
  if (!Number.isFinite(number)) {
    return String(value)
  }
  if (Number.isInteger(number)) {
    return String(number)
  }
  return String(Math.round(number * 100) / 100)
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
  if (action === "addColumn" || action === "dropColumn") {
    if (table.type !== "table") {
      return fail(400, "views can't be changed")
    }
    const name = ident(action === "addColumn" ? body?.name : body?.column)
    if (!name) {
      return fail(400, "column name is required")
    }
    const exists = table.columns.some((column) => column.name.toLowerCase() === name.toLowerCase())
    if (action === "addColumn") {
      if (exists) {
        return fail(400, "column already exists")
      }
      const type = columnType(body?.type)
      if (!type) {
        return fail(400, "type must be TEXT, INTEGER, REAL, BOOLEAN, NUMERIC, or BLOB")
      }
      try {
        await client.execute(`ALTER TABLE ${quoteIdent(table.name)} ADD COLUMN ${quoteIdent(name)} ${type}`)
      } catch (error) {
        return fail(400, error.message)
      }
      return ok({ ok: true })
    }
    if (!exists) {
      return fail(404, "column not found")
    }
    if (table.primaryKey.some((column) => column.toLowerCase() === name.toLowerCase())) {
      return fail(400, "cannot remove a primary key column")
    }
    try {
      await client.execute(`ALTER TABLE ${quoteIdent(table.name)} DROP COLUMN ${quoteIdent(name)}`)
    } catch (error) {
      return fail(400, error.message)
    }
    return ok({ ok: true })
  }
  return fail(400, "action must be update, insert, delete, addColumn, or dropColumn")
}

const columnTypes = new Set(["TEXT", "INTEGER", "REAL", "BLOB", "NUMERIC", "BOOLEAN"])

function ident(value) {
  const name = text(value)
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : ""
}

function columnType(value) {
  const type = text(value).toUpperCase()
  return columnTypes.has(type) ? type : ""
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
  if (!names.includes("owner_id")) {
    await client.execute("ALTER TABLE grone_note ADD COLUMN owner_id TEXT")
  }
  if (!names.includes("created_at")) {
    await client.execute("ALTER TABLE grone_note ADD COLUMN created_at TEXT NOT NULL DEFAULT ''")
  }
  await client.execute("UPDATE grone_note SET created_at = updated_at WHERE created_at IS NULL OR created_at = ''")
  await ensureAccountSchema(client)
}

function noteSummary(row, userId) {
  const ownerId = String(row.owner_id ?? row[4] ?? "")
  return {
    id: String(row.id ?? row[0]),
    title: String(row.title ?? row[1]),
    updated_at: String(row.updated_at ?? row[2]),
    archived: archivedFlag(row.archived ?? row[3]),
    owned: userId && ownerId === userId ? 1 : 0,
  }
}

function archivedFlag(value) {
  return value === true || value === 1 || value === 1n || value === "1" ? 1 : 0
}

async function listNotes(client, user) {
  await ensureNotes(client)
  const result = await client.execute({
    sql: `SELECT id, title, updated_at, archived, owner_id, created_at FROM grone_note
      WHERE owner_id = ?
        OR id IN (SELECT note_id FROM grone_note_share WHERE user_id = ?)
      ORDER BY updated_at DESC`,
    args: [user.id, user.id],
  })
  let notes = result.rows.map((row) => noteSummary(row, user.id))
  if (user.limited === 1) {
    const presented = await earliestOwnedId(client, user.id)
    notes = notes.filter((note) => note.owned !== 1 || note.id === presented)
  }
  return ok({ notes })
}

async function getNote(client, body, user) {
  await ensureNotes(client)
  const id = text(body?.id)
  const note = await client.execute({
    sql: "SELECT id, title, updated_at, archived, owner_id, created_at FROM grone_note WHERE id = ?",
    args: [id],
  })
  if (note.rows.length === 0) {
    return fail(404, "note not found")
  }
  const access = await canViewNote(client, user, note.rows[0])
  if (!access.ok) {
    return access.response
  }
  const blocks = await client.execute({
    sql: "SELECT id, position, kind, name, body FROM grone_block WHERE note_id = ? ORDER BY position",
    args: [id],
  })
  const collaborators = await client.execute({
    sql: `SELECT u.id, u.username, u.name
      FROM grone_note_share s
      JOIN grone_user u ON u.id = s.user_id
      WHERE s.note_id = ?
      ORDER BY u.username`,
    args: [id],
  })
  const ownerId = String(note.rows[0].owner_id ?? "")
  let owner = null
  if (ownerId) {
    const ownerRow = await client.execute({
      sql: "SELECT id, username, name FROM grone_user WHERE id = ?",
      args: [ownerId],
    })
    if (ownerRow.rows[0]) {
      owner = {
        id: String(ownerRow.rows[0].id),
        username: String(ownerRow.rows[0].username),
        name: String(ownerRow.rows[0].name),
      }
    }
  }
  return ok({
    note: {
      ...noteSummary(note.rows[0], user.id),
      blocks: blocks.rows.map((block) => ({
        id: String(block.id ?? block[0]),
        position: Number(block.position ?? block[1]),
        kind: String(block.kind ?? block[2]),
        name: block.name == null && block[3] == null ? "" : String(block.name ?? block[3]),
        body: String(block.body ?? block[4] ?? ""),
      })),
      collaborators: collaborators.rows.map((person) => ({
        id: String(person.id),
        username: String(person.username),
        name: String(person.name),
      })),
      owner,
    },
  })
}

async function saveNote(client, body, user) {
  await ensureNotes(client)
  const note = body?.note
  const id = text(note?.id)
  const title = text(note?.title) || "Untitled"
  if (!id) {
    return fail(400, "note id is required")
  }
  const blocks = Array.isArray(note?.blocks) ? note.blocks : []
  const updatedAt = new Date().toISOString()
  const existing = await client.execute({
    sql: "SELECT id, title, updated_at, archived, owner_id, created_at FROM grone_note WHERE id = ?",
    args: [id],
  })
  let archived = archivedFlag(note?.archived)
  let ownerId = user.id
  let createdAt = updatedAt
  if (existing.rows.length > 0) {
    const access = await canViewNote(client, user, existing.rows[0])
    if (!access.ok) {
      return access.response
    }
    ownerId = String(existing.rows[0].owner_id ?? user.id)
    createdAt = String(existing.rows[0].created_at || updatedAt)
    if (note?.archived == null) {
      archived = archivedFlag(existing.rows[0].archived)
    }
  } else if (user.limited === 1) {
    const presented = await earliestOwnedId(client, user.id)
    if (presented) {
      return fail(400, "A limited account can keep one note")
    }
  }
  const tx = await client.transaction("write")
  try {
    await tx.execute({
      sql: `INSERT INTO grone_note (id, title, updated_at, archived, owner_id, created_at) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET title = excluded.title, updated_at = excluded.updated_at, archived = excluded.archived`,
      args: [id, title, updatedAt, archived, ownerId, createdAt],
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
  return getNote(client, { id }, user)
}

async function deleteNote(client, body, user) {
  await ensureNotes(client)
  const id = text(body?.id)
  const existing = await client.execute({
    sql: "SELECT id, title, updated_at, archived, owner_id, created_at FROM grone_note WHERE id = ?",
    args: [id],
  })
  if (existing.rows.length === 0) {
    return fail(404, "note not found")
  }
  const access = await canViewNote(client, user, existing.rows[0])
  if (!access.ok) {
    return access.response
  }
  if (!access.owned) {
    return fail(403, "only the owner can delete this note")
  }
  const tx = await client.transaction("write")
  try {
    await tx.execute({ sql: "DELETE FROM grone_block WHERE note_id = ?", args: [id] })
    await tx.execute({ sql: "DELETE FROM grone_note_share WHERE note_id = ?", args: [id] })
    await tx.execute({ sql: "DELETE FROM grone_note WHERE id = ?", args: [id] })
    await tx.commit()
  } catch (error) {
    await tx.rollback()
    throw error
  }
  return ok({ ok: true })
}

async function shareNote(client, body, user) {
  await ensureNotes(client)
  const id = text(body?.id)
  const username = text(body?.username)
  if (!username) {
    return fail(400, "username is required")
  }
  const existing = await client.execute({
    sql: "SELECT id, title, updated_at, archived, owner_id, created_at FROM grone_note WHERE id = ?",
    args: [id],
  })
  if (existing.rows.length === 0) {
    return fail(404, "note not found")
  }
  const access = await canViewNote(client, user, existing.rows[0])
  if (!access.ok) {
    return access.response
  }
  if (!access.owned) {
    return fail(403, "only the owner can invite a collaborator")
  }
  const found = await client.execute({
    sql: "SELECT id FROM grone_user WHERE username = ?",
    args: [username],
  })
  if (found.rows.length === 0) {
    return fail(404, "user not found")
  }
  const collaboratorId = String(found.rows[0].id ?? found.rows[0][0])
  if (collaboratorId === user.id) {
    return fail(400, "you already own this note")
  }
  await client.execute({
    sql: `INSERT INTO grone_note_share (note_id, user_id, created_at) VALUES (?, ?, ?)
      ON CONFLICT(note_id, user_id) DO NOTHING`,
    args: [id, collaboratorId, new Date().toISOString()],
  })
  return getNote(client, { id }, user)
}

async function unshareNote(client, body, user) {
  await ensureNotes(client)
  const id = text(body?.id)
  const collaboratorId = text(body?.userId)
  const existing = await client.execute({
    sql: "SELECT id, title, updated_at, archived, owner_id, created_at FROM grone_note WHERE id = ?",
    args: [id],
  })
  if (existing.rows.length === 0) {
    return fail(404, "note not found")
  }
  const access = await canViewNote(client, user, existing.rows[0])
  if (!access.ok) {
    return access.response
  }
  if (!access.owned) {
    return fail(403, "only the owner can remove a collaborator")
  }
  await client.execute({
    sql: "DELETE FROM grone_note_share WHERE note_id = ? AND user_id = ?",
    args: [id, collaboratorId],
  })
  return getNote(client, { id }, user)
}

async function canViewNote(client, user, row) {
  const ownerId = String(row.owner_id ?? "")
  const id = String(row.id ?? "")
  if (ownerId === user.id) {
    if (user.limited === 1) {
      const presented = await earliestOwnedId(client, user.id)
      if (presented !== id) {
        return { ok: false, response: fail(404, "note not found") }
      }
    }
    return { ok: true, owned: true }
  }
  const share = await client.execute({
    sql: "SELECT note_id FROM grone_note_share WHERE note_id = ? AND user_id = ?",
    args: [id, user.id],
  })
  if (share.rows.length === 0) {
    return { ok: false, response: fail(404, "note not found") }
  }
  return { ok: true, owned: false }
}

async function earliestOwnedId(client, userId) {
  const result = await client.execute({
    sql: `SELECT id FROM grone_note
      WHERE owner_id = ?
      ORDER BY CASE WHEN created_at IS NULL OR created_at = '' THEN updated_at ELSE created_at END ASC, id ASC
      LIMIT 1`,
    args: [userId],
  })
  if (result.rows.length === 0) {
    return ""
  }
  return String(result.rows[0].id ?? result.rows[0][0])
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
