import fs from "fs/promises"
import path from "path"
import { clipCrownSource } from "../server/clip.mjs"

const root = process.cwd()
const publicDir = path.join(root, "public")
await fs.mkdir(publicDir, { recursive: true })
await fs.copyFile(path.join(root, "web/index.html"), path.join(publicDir, "index.html"))
await fs.copyFile(path.join(root, "web/main.mjs"), path.join(publicDir, "main.mjs"))
const source = await fs.readFile(path.join(root, "crown"), "utf8")
await fs.writeFile(path.join(publicDir, "crown.mjs"), clipCrownSource(source))
