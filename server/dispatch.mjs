import fs from "fs/promises"
import path from "path"
import { clipCrownSource } from "./clip.mjs"
import { createDb } from "./libsql.mjs"

const crownModules = new Map()

function loadCrown(root) {
  if (!crownModules.has(root)) {
    crownModules.set(root, importCrown(root))
  }
  return crownModules.get(root)
}

async function importCrown(root) {
  const source = await fs.readFile(path.join(root, "crown"), "utf8")
  globalThis.fs = fs
  globalThis.path = path
  globalThis.basePath = root
  globalThis.debug = process.env.CROWN_DEBUG === "1"
  return import(`data:text/javascript,${encodeURIComponent(clipCrownSource(source))}`)
}

export function parseQuery(searchParams) {
  const query = {}
  for (const [key, value] of searchParams.entries()) {
    query[key] = value
  }
  return query
}

export function lowerHeaders(headers) {
  const out = {}
  if (!headers) {
    return out
  }
  for (const [key, value] of Object.entries(headers)) {
    if (value == null) {
      continue
    }
    out[key.toLowerCase()] = Array.isArray(value) ? value.join(", ") : String(value)
  }
  return out
}

export function parseBody(bodyText, contentType) {
  if (bodyText == null || bodyText === "") {
    return null
  }
  if (contentType && contentType.includes("application/json")) {
    return JSON.parse(bodyText)
  }
  return bodyText
}

function normalizeResponse(current) {
  if (!current || typeof current !== "object" || Array.isArray(current)) {
    return {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
      body: "handler did not return a response",
    }
  }
  const status = Number.isInteger(current.status) ? current.status : 200
  const headers = {}
  if (current.headers && typeof current.headers === "object" && !Array.isArray(current.headers)) {
    for (const [key, value] of Object.entries(current.headers)) {
      headers[String(key).toLowerCase()] = String(value)
    }
  }
  if ("json" in current) {
    if (!headers["content-type"]) {
      headers["content-type"] = "application/json; charset=utf-8"
    }
    return {
      status,
      headers,
      body: JSON.stringify(current.json ?? null),
    }
  }
  if (!headers["content-type"]) {
    headers["content-type"] = "text/plain; charset=utf-8"
  }
  return {
    status,
    headers,
    body: current.body == null ? "" : String(current.body),
  }
}

function maskProduction(response, production) {
  if (production && response.status >= 500) {
    return {
      status: response.status,
      headers: { "content-type": "text/plain; charset=utf-8" },
      body: "internal error",
    }
  }
  return response
}

export async function handleApi(request, { production = false, root = process.cwd() } = {}) {
  const { crown } = await loadCrown(root)
  const serverDir = path.join(root, "server")
  const scope = crown()
  const payload = {
    method: request.method,
    path: request.path,
    query: request.query ?? {},
    headers: request.headers ?? {},
    body: request.body ?? null,
  }
  const db = createDb(root)
  scope.set("request", crown().value(payload))
  scope.set("exists", crown().value(async (rel) => fileExists(serverDir, rel)))
  scope.set("db", crown().value(db))

  // Crown's point walks the loaded module on a child scope and then drops that
  // scope, so handler errors never reach the router's try. Run the module here
  // and rethrow so router.mcr can turn the message into a 500 response.
  const originalLoad = scope.load.bind(scope)
  let loadedRel = null
  scope.load = async (filePath, ...rest) => {
    loadedRel = filePath
    return originalLoad(filePath, ...rest)
  }
  scope.point = async () => {
    const fn = scope.current()
    if (typeof fn !== "function") {
      throw new Error(`current value must be function, got ${typeof fn}`)
    }
    const absolute = path.resolve(serverDir, String(loadedRel))
    const child = crown(null, new Map(), path.dirname(absolute))
    child.set("request", crown().value(payload))
    child.set("db", crown().value(db))
    const result = await fn(child)
    const error = result._check_error()
    if (error) {
      throw new Error(error)
    }
    scope.value(result.current())
    return scope
  }

  await scope.runFile(path.join(serverDir, "router.mcr"))
  const error = scope._check_error()
  if (error) {
    return maskProduction({
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
      body: error,
    }, production)
  }
  return maskProduction(normalizeResponse(scope.current()), production)
}

async function fileExists(serverDir, rel) {
  const base = path.resolve(serverDir)
  const target = path.resolve(base, String(rel))
  if (target !== base && !target.startsWith(`${base}${path.sep}`)) {
    return false
  }
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}
