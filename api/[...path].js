import { handleApi, lowerHeaders, parseBody, parseQuery } from "../server/dispatch.mjs"

function apiPath(req) {
  const fromQuery = req.query?.path
  if (Array.isArray(fromQuery)) {
    return fromQuery.map(String).join("/")
  }
  if (typeof fromQuery === "string") {
    return fromQuery
  }
  const url = new URL(req.url || "/", "http://localhost")
  if (url.pathname === "/api") {
    return ""
  }
  if (url.pathname.startsWith("/api/")) {
    return decodeURIComponent(url.pathname.slice("/api/".length))
  }
  return ""
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString("utf8")
}

export default async function handler(req, res) {
  const production = process.env.NODE_ENV === "production"
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`)
    const bodyText = await readBody(req)
    let body = null
    try {
      body = parseBody(bodyText, req.headers["content-type"])
    } catch {
      res.writeHead(400, { "content-type": "text/plain; charset=utf-8" })
      res.end("invalid json")
      return
    }
    const forwarded = req.headers["x-forwarded-proto"]
    const proto = typeof forwarded === "string" && forwarded ? forwarded.split(",")[0].trim() : "http"
    const result = await handleApi({
      method: req.method || "GET",
      path: apiPath(req),
      query: parseQuery(url.searchParams),
      headers: lowerHeaders(req.headers),
      body,
      origin: `${proto}://${req.headers.host || "localhost"}`,
    }, { production })
    res.writeHead(result.status, result.headers)
    res.end(result.body)
  } catch (error) {
    console.error(error)
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" })
    res.end(production ? "internal error" : error.message)
  }
}
