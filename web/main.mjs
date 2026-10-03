import { crown } from "/crown.mjs"

const ui = crown()

const style = document.createElement("style")
style.textContent = `
  :root {
    color-scheme: light;
    --ink: #1c1915;
    --muted: #5e584e;
    --paper: #f3efe4;
    --panel: #fffdf8;
    --line: #ddd4c4;
    --accent: #2f5d50;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background: var(--paper);
    color: var(--ink);
    font: 16px/1.5 "Iowan Old Style", Palatino, "Palatino Linotype", serif;
  }
  main {
    max-width: 40rem;
    margin: 0 auto;
    padding: 2.5rem 1.25rem 4rem;
  }
  h1 {
    margin: 0;
    font-size: 2rem;
    font-weight: 500;
    letter-spacing: -0.03em;
  }
  .lede, .health {
    color: var(--muted);
    margin: 0.35rem 0 0;
  }
  label {
    display: block;
    margin: 1.75rem 0 0.4rem;
    font-size: 0.85rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  textarea, pre {
    width: 100%;
    margin: 0;
    padding: 0.85rem 1rem;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--panel);
    color: var(--ink);
    font: 14px/1.45 ui-monospace, "Cascadia Code", "Source Code Pro", monospace;
  }
  textarea {
    min-height: 9rem;
    resize: vertical;
  }
  button {
    margin-top: 0.75rem;
    border: 0;
    border-radius: 999px;
    padding: 0.45rem 1rem;
    background: var(--accent);
    color: #f7f4ec;
    font: inherit;
    cursor: pointer;
  }
  button:disabled { opacity: 0.6; cursor: wait; }
  pre {
    min-height: 5rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
`
document.head.append(style)

const main = document.createElement("main")
const title = document.createElement("h1")
title.textContent = "Civil Grone"
const lede = document.createElement("p")
lede.className = "lede"
lede.textContent = "A crown for the page."
const health = document.createElement("p")
health.className = "health"
health.textContent = "Checking API…"
const sourceLabel = document.createElement("label")
sourceLabel.htmlFor = "crown-source"
sourceLabel.textContent = "Crown"
const source = document.createElement("textarea")
source.id = "crown-source"
source.spellcheck = false
source.value = "value 'hello from crown'\n"
const run = document.createElement("button")
run.type = "button"
run.textContent = "Run"
const outputLabel = document.createElement("label")
outputLabel.htmlFor = "crown-output"
outputLabel.textContent = "Result"
const output = document.createElement("pre")
output.id = "crown-output"
output.tabIndex = 0
main.append(title, lede, health, sourceLabel, source, run, outputLabel, output)
document.body.append(main)

function format(value) {
  if (typeof value === "string") {
    return value
  }
  if (typeof value === "undefined") {
    return "undefined"
  }
  try {
    return JSON.stringify(value, null, 2) ?? String(value)
  } catch {
    return String(value)
  }
}

run.addEventListener("click", async () => {
  run.disabled = true
  try {
    const program = source.value.endsWith("\n") ? source.value : `${source.value}\n`
    ui.clear_error()
    await ui.run(program)
    const value = ui.current()
    const error = ui.current_error()
    output.textContent = error ? String(error) : format(value)
  } finally {
    run.disabled = false
  }
})

try {
  const response = await fetch("/api/health")
  const text = await response.text()
  health.textContent = `API ${response.status} ${text}`
} catch (error) {
  health.textContent = `API unavailable (${error.message})`
}
