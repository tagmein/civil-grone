import fs from "fs/promises"
import http from "http"
import path from "path"
import { clipCrownSource } from "./clip.mjs"
import { handleApi, lowerHeaders, parseBody, parseQuery } from "./dispatch.mjs"

const root = process.cwd()
const webDir = path.join(root, "web")

const pages = {
  "/": "index.html",
  "/index.html": "index.html",
  "/starry.mjs": "starry.mjs",
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".cr": "text/plain; charset=utf-8",
}

let cachedCrown

async function crownModule(production) {
  if (production && cachedCrown) {
    return cachedCrown
  }
  const source = await fs.readFile(path.join(root, "crown"), "utf8")
  const clipped = clipCrownSource(source)
  if (production) {
    cachedCrown = clipped
  }
  return clipped
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on("data", (chunk) => chunks.push(chunk))
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
    req.on("error", reject)
  })
}

export function listen(options = {}) {
  const production = options.production === true
  const port = options.port ?? (Number(process.env.PORT) || 3000)
  const server = http.createServer(async (req, res) => {
    try {
      await handleRequest(req, res, production)
    } catch (error) {
      console.error(error)
      if (res.headersSent) {
        res.end()
        return
      }
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" })
      res.end(production ? "internal error" : error.message)
    }
  })

  const shutdown = () => {
    server.close()
  }
  process.once("SIGTERM", shutdown)
  process.once("SIGINT", shutdown)
  server.on("close", () => {
    process.off("SIGTERM", shutdown)
    process.off("SIGINT", shutdown)
  })

  return new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, () => {
      const address = server.address()
      const actual = typeof address === "object" && address ? address.port : port
      console.log(`civil-grone ${production ? "production" : "dev"} http://localhost:${actual}`)
      resolve(server)
    })
  })
}

async function handleRequest(req, res, production) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`)
  if (!production) {
    console.log(req.method, url.pathname)
  }
  if (req.method === "GET" && url.pathname === "/crown.mjs") {
    const body = await crownModule(production)
    const headers = {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": production ? "public, max-age=3600" : "no-cache",
    }
    res.writeHead(200, headers)
    res.end(body)
    return
  }
  if (req.method === "GET" && url.pathname.endsWith(".cr")) {
    const name = path.basename(url.pathname)
    if (name !== url.pathname.slice(1) || !name.endsWith(".cr")) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
      res.end("not found")
      return
    }
    const body = await fs.readFile(path.join(webDir, name))
    res.writeHead(200, {
      "content-type": types[".cr"],
      "cache-control": production ? "public, max-age=3600" : "no-cache",
    })
    res.end(body)
    return
  }
  if (req.method === "GET" && url.pathname in pages) {
    const filename = pages[url.pathname]
    const body = await fs.readFile(path.join(webDir, filename))
    const headers = {
      "content-type": types[path.extname(filename)] || "application/octet-stream",
    }
    if (!production) {
      headers["cache-control"] = "no-cache"
    }
    res.writeHead(200, headers)
    res.end(body)
    return
  }
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
    const bodyText = await readBody(req)
    let body = null
    try {
      body = parseBody(bodyText, req.headers["content-type"])
    } catch {
      res.writeHead(400, { "content-type": "text/plain; charset=utf-8" })
      res.end("invalid json")
      return
    }
    const routePath = url.pathname === "/api" ? "" : decodeURIComponent(url.pathname.slice("/api/".length))
    const result = await handleApi({
      method: req.method,
      path: routePath,
      query: parseQuery(url.searchParams),
      headers: lowerHeaders(req.headers),
      body,
    }, { production, root })
    res.writeHead(result.status, result.headers)
    res.end(result.body)
    return
  }
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
  res.end("not found")
}
