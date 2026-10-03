import * as esbuild from "esbuild"
import fs from "fs/promises"
import path from "path"
import { clipCrownSource } from "../server/clip.mjs"

const root = process.cwd()
const webDir = path.join(root, "web")
const publicDir = path.join(root, "public")

await esbuild.build({
  entryPoints: [path.join(webDir, "bind.ts")],
  bundle: true,
  format: "esm",
  outfile: path.join(webDir, "starry.mjs"),
  platform: "browser",
  external: ["/crown.mjs"],
  plugins: [
    {
      name: "starryui",
      setup(build) {
        build.onResolve({ filter: /^@starryui\// }, (args) => {
          const spec = args.path.slice("@starryui/".length)
          const [pkg, ...rest] = spec.split("/")
          let file = path.join(root, "starryui/packages", pkg, rest.join("/") || "index.ts")
          if (file.endsWith(".js")) {
            file = `${file.slice(0, -3)}.ts`
          }
          return { path: file }
        })
      },
    },
  ],
})

await fs.mkdir(publicDir, { recursive: true })
await fs.copyFile(path.join(webDir, "index.html"), path.join(publicDir, "index.html"))
await fs.copyFile(path.join(webDir, "starry.mjs"), path.join(publicDir, "starry.mjs"))
await fs.copyFile(path.join(webDir, "favicon.ico"), path.join(publicDir, "favicon.ico"))
const source = await fs.readFile(path.join(root, "crown"), "utf8")
await fs.writeFile(path.join(publicDir, "crown.mjs"), clipCrownSource(source))
const entries = await fs.readdir(webDir)
for (const name of entries) {
  if (name.endsWith(".cr")) {
    await fs.copyFile(path.join(webDir, name), path.join(publicDir, name))
  }
}
