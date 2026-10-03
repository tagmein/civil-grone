import { button } from "../starryui/packages/button/index.ts"
import { codefield, field, input } from "../starryui/packages/field/index.ts"
import { frame } from "../starryui/packages/frame/index.ts"
import { column, row } from "../starryui/packages/layout/index.ts"
import { loading } from "../starryui/packages/loading/index.ts"
import { markdown } from "../starryui/packages/markdown/index.ts"
import { notice } from "../starryui/packages/notice/index.ts"
import { split } from "../starryui/packages/split/index.ts"
import { table } from "../starryui/packages/table/index.ts"
import { tabs } from "../starryui/packages/tabs/index.ts"
import {
 applyTheme,
 attachStyle,
 attachThemeVariables,
 useThemeDimensions,
} from "../starryui/packages/theme/index.ts"
import { themeMidnight } from "../starryui/packages/theme-midnight/index.ts"
import { dialog } from "../starryui/packages/dialog/index.ts"
import { tree } from "../starryui/packages/tree/index.ts"
import { tray, traySpacer } from "../starryui/packages/tray/index.ts"
import {
 withClick,
 withOnInput,
 withTextContent,
 withValue,
} from "../starryui/packages/traits/index.ts"

export { themeMidnight }

let reportError = (error: unknown) => {
 console.error(error)
}

export function setOnError(handler: (message: string) => void) {
 reportError = (error) => {
  const message = error instanceof Error ? error.message : String(error)
  handler(message)
 }
}

async function callCrown(fn: unknown, ...args: unknown[]) {
 if (typeof fn !== "function") {
  return undefined
 }
 const result = await fn(...args)
 if (result && typeof result._check_error === "function") {
  const error = result._check_error()
  if (error) {
   throw new Error(error)
  }
  return result.current()
 }
 return result
}

function guard(fn: unknown) {
 return async (...args: unknown[]) => {
  try {
   return await callCrown(fn, ...args)
  } catch (error) {
   reportError(error)
   return undefined
  }
 }
}

export function shell(theme = themeMidnight) {
 attachThemeVariables(document.body, theme.variables)
 attachStyle(theme, "body", theme.facets.body)
 useThemeDimensions.tiny()
 const ui = createUi(theme)
 const trayElement = ui.tray()
 const status = document.createElement("div")
 const main = ui.column()
 main.style.minHeight = "0"
 document.body.append(trayElement, status, main)
 return {
  main,
  tray: trayElement,
  setStatus(message: string, tone = "error") {
   status.replaceChildren()
   if (message) {
    status.append(ui.notice(tone, message))
   }
  },
 }
}

export function createUi(theme = themeMidnight) {
 const themedButton = applyTheme(theme, button)
 const themedColumn = applyTheme(theme, column)
 const themedRow = applyTheme(theme, row)
 const themedFrame = applyTheme(theme, frame)
 const themedSplit = applyTheme(theme, split)
 const themedTabs = applyTheme(theme, tabs)
 const themedTree = applyTheme(theme, tree)
 const themedTable = applyTheme(theme, table)
 const themedNotice = applyTheme(theme, notice)
 const themedDialog = applyTheme(theme, dialog)
 const themedField = applyTheme(theme, field)
 const themedInput = applyTheme(theme, input)
 const themedCode = applyTheme(theme, codefield)
 const themedMarkdown = applyTheme(theme, markdown)
 const themedLoading = applyTheme(theme, loading)
 const themedTray = applyTheme(theme, tray)

 return {
  append(parent: HTMLElement, child: HTMLElement) {
   parent.append(child)
   return child
  },
  button(label: string, onClick?: unknown) {
   const traits = [withTextContent(label)]
   if (onClick) {
    traits.push(withClick(() => void guard(onClick)()))
   }
   return themedButton.add(...traits)()
  },
  clear(parent: HTMLElement) {
   parent.replaceChildren()
  },
  code(value: string, onInput?: unknown, onSubmit?: unknown) {
   const box = themedCode.add(
    withValue(value ?? ""),
    withOnInput((next) => void guard(onInput)(next)),
   )()
   box.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
     event.preventDefault()
     void guard(onSubmit)()
    }
   })
   return box
  },
  column() {
   return themedColumn({ themeFacets: ["document"] })
  },
  dialog(title: string) {
   return themedDialog({ title })
  },
  field(label: string, value: string, onInput?: unknown) {
   const control = themedInput.add(
    withValue(value ?? ""),
    withOnInput((next) => void guard(onInput)(next)),
   )()
   return themedField({
    label,
    content(container) {
     container.append(control)
    },
   })
  },
  frame() {
   const element = themedFrame()
   element.style.height = "auto"
   element.style.marginBottom = "var(--dimension3)"
   return element
  },
  heading(text: string) {
   const element = document.createElement("h2")
   element.textContent = text
   return element
  },
  input(value: string, onInput?: unknown) {
   return themedInput.add(
    withValue(value ?? ""),
    withOnInput((next) => void guard(onInput)(next)),
   )()
  },
  loading(text: string) {
   return themedLoading.add(withTextContent(text))()
  },
  markdown(source: string) {
   return themedMarkdown({ source: source ?? "" })
  },
  notice(tone: string, text: string) {
   const allowed = tone === "error" || tone === "empty" ? tone : "info"
   return themedNotice({ tone: allowed, text })
  },
  row() {
   const element = themedRow()
   element.style.flexGrow = "0"
   element.style.gap = "var(--dimension2)"
   element.style.alignItems = "center"
   element.style.padding = "var(--dimension2)"
   return element
  },
  spacer() {
   return traySpacer(theme)
  },
  split(direction: "row" | "column", ratio: number) {
   const instance = themedSplit({ direction, ratio })
   instance.element.style.flex = "1"
   instance.element.style.minHeight = "0"
   return instance
  },
  table(config: Record<string, unknown>) {
   return themedTable({
    columns: config.columns as [],
    rows: config.rows as [],
    sort: config.sort as [],
    filters: config.filters as [],
    page: config.page as number,
    pageSize: config.pageSize as number,
    total: config.total as number,
    editable: Boolean(config.editable),
    onSort: (sort) => void guard(config.onSort)(sort),
    onFilter: (filters) => void guard(config.onFilter)(filters),
    onPage: (page) => void guard(config.onPage)(page),
    onSelectRow: (index) => void guard(config.onSelectRow)(index),
    onCellEdit: (row, columnName, value) => void guard(config.onCellEdit)(row, columnName, value),
   })
  },
  tabs(items: { id: string; title: string }[], active: string, onSelect?: unknown) {
   return themedTabs({
    active,
    items,
    onSelect: (id) => void guard(onSelect)(id),
   })
  },
  text(value: string) {
   const element = document.createElement("span")
   element.textContent = value
   return element
  },
  tray() {
   return themedTray()
  },
  tree(nodes: unknown[], selectedId: string, onSelect?: unknown) {
   return themedTree({
    nodes: nodes as [],
    selectedId,
    onSelect: (id) => void guard(onSelect)(id),
   })
  },
 }
}

export async function api(path: string, body?: unknown) {
 const response = await fetch(`/api/${path}`, {
  method: body === undefined ? "GET" : "POST",
  headers: body === undefined ? undefined : { "content-type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
 })
 const text = await response.text()
 let data: { error?: string } | null = null
 try {
  data = text ? JSON.parse(text) : null
 } catch {
  data = { error: text }
 }
 if (!response.ok) {
  throw new Error(data?.error || text || response.statusText)
 }
 return data
}

export function id() {
 return crypto.randomUUID()
}

export function schemaNodes(schema: { tables?: { name: string; columns: { name: string; type: string }[] }[] }) {
 return (schema?.tables ?? []).map((table) => ({
  id: table.name,
  label: table.name,
  expanded: true,
  children: table.columns.map((column) => ({
   id: `${table.name}.${column.name}`,
   label: column.type ? `${column.name} ${column.type}` : column.name,
  })),
 }))
}

export function tableId(value: string) {
 const text = String(value ?? "")
 const dot = text.indexOf(".")
 return dot === -1 ? text : text.slice(0, dot)
}

export function noteNodes(notes: { id: string; title: string }[]) {
 return (notes ?? []).map((note) => ({ id: note.id, label: note.title || "Untitled" }))
}

export function parseDataset(body: string) {
 try {
  const parsed = JSON.parse(body || "{}")
  return {
   columns: Array.isArray(parsed.columns) ? parsed.columns : [],
   rows: Array.isArray(parsed.rows) ? parsed.rows : [],
   sort: Array.isArray(parsed.sort) ? parsed.sort : [],
   filters: Array.isArray(parsed.filters) ? parsed.filters : [],
   sourceSql: typeof parsed.sourceSql === "string" ? parsed.sourceSql : "",
  }
 } catch {
  return { columns: [], rows: [], sort: [], filters: [], sourceSql: "" }
 }
}

export function stringifyDataset(dataset: unknown) {
 return JSON.stringify(dataset)
}

export function asDataset(value: unknown) {
 if (!value || typeof value !== "object") {
  return null
 }
 if (Array.isArray((value as { columns?: unknown }).columns) && Array.isArray((value as { rows?: unknown }).rows)) {
  return value
 }
 if (Array.isArray(value) && value.every((row) => row && typeof row === "object" && !Array.isArray(row))) {
  const names = [...new Set(value.flatMap((row) => Object.keys(row as object)))]
  return {
   columns: names.map((name) => ({ name, type: "" })),
   rows: value.map((row) => names.map((name) => (row as Record<string, unknown>)[name])),
   sort: [],
   filters: [],
  }
 }
 return null
}

export function visibleRows(dataset: {
 columns?: { name: string }[]
 rows?: unknown[][]
 sort?: { column: string; direction: string }[]
 filters?: { column: string; op: string; value: string }[]
}) {
 const columns = dataset?.columns ?? []
 let rows = (dataset?.rows ?? []).slice()
 for (const filter of dataset?.filters ?? []) {
  const index = columns.findIndex((column) => column.name === filter.column)
  if (index < 0) {
   continue
  }
  rows = rows.filter((row) => matchFilter(row[index], filter.op, filter.value ?? ""))
 }
 const sort = dataset?.sort ?? []
 if (sort.length > 0) {
  rows.sort((left, right) => {
   for (const item of sort) {
    const index = columns.findIndex((column) => column.name === item.column)
    if (index < 0) {
     continue
    }
    const compared = compareCells(left[index], right[index])
    if (compared !== 0) {
     return item.direction === "desc" ? -compared : compared
    }
   }
   return 0
  })
 }
 return rows
}

function matchFilter(cell: unknown, op: string, value: string) {
 const text = cell == null ? "" : String(cell)
 if (op === "empty") {
  return text === ""
 }
 if (op === "contains") {
  return text.toLowerCase().includes(value.toLowerCase())
 }
 if (op === "eq") {
  return text === value
 }
 if (op === "neq") {
  return text !== value
 }
 if (op === "gt") {
  return Number(cell) > Number(value)
 }
 if (op === "lt") {
  return Number(cell) < Number(value)
 }
 return true
}

function compareCells(left: unknown, right: unknown) {
 if (typeof left === "number" && typeof right === "number") {
  return left - right
 }
 return String(left ?? "").localeCompare(String(right ?? ""), undefined, { numeric: true })
}

export function pipelineBlocks() {
 return [
  {
   id: id(),
   kind: "markdown",
   name: "",
   body: "# Customers, then orders\n\nThe Crown block reads the customers dataset and builds the next query.",
  },
  {
   id: id(),
   kind: "sql",
   name: "customers",
   body: "SELECT id, name FROM customers WHERE active = 1",
  },
  {
   id: id(),
   kind: "crown",
   name: "orderSql",
   body: "get datasets\nat customers\nat rows\nto rows\nget inList\ncall [ get rows ] 0\nto ids\ntemplate 'SELECT id, customer_id, total FROM orders WHERE customer_id IN (%0)' [ get ids ]\n",
  },
  {
   id: id(),
   kind: "sql",
   name: "orders",
   body: "",
  },
  {
   id: id(),
   kind: "dataset",
   name: "orderRows",
   body: '{"columns":[],"rows":[],"sort":[],"filters":[]}',
  },
 ]
}

export function blankBlock(kind: string) {
 const bodies: Record<string, string> = {
  markdown: "",
  crown: "get datasets\n",
  javascript: "return previous\n",
  sql: "SELECT 1\n",
  dataset: stringifyDataset({ columns: [], rows: [], sort: [], filters: [] }),
 }
 return { id: id(), kind, name: "", body: bodies[kind] ?? "", output: null }
}

export function insertBlock(blocks: unknown[], index: number, block: unknown) {
 const next = blocks.slice()
 next.splice(index, 0, block)
 return next
}

export function moveBlock(blocks: unknown[], index: number, delta: number) {
 const next = blocks.slice()
 const target = index + delta
 if (target < 0 || target >= next.length) {
  return next
 }
 const [item] = next.splice(index, 1)
 next.splice(target, 0, item)
 return next
}

export function removeBlock(blocks: unknown[], index: number) {
 return blocks.filter((_, itemIndex) => itemIndex !== index)
}

export function makeSql(connectionId: string) {
 return async (statement: string, args: unknown[] = []) => {
  const data = await api("databases/query", { connectionId, sql: statement, args }) as {
   results?: { columns: unknown[]; rows: unknown[][] }[]
  }
  const first = data.results?.find((result) => result.columns?.length) ?? data.results?.[data.results.length - 1]
  return {
   columns: first?.columns ?? [],
   rows: first?.rows ?? [],
   sort: [],
   filters: [],
   sourceSql: statement,
  }
 }
}

export function bindingsBefore(blocks: { name?: string; kind?: string; body?: string; output?: unknown }[], index: number, sql: unknown, helpers: unknown) {
 const datasets: Record<string, unknown> = {}
 let previous: unknown = null
 for (let cursor = 0; cursor < index; cursor += 1) {
  const block = blocks[cursor]
  const published = block.kind === "dataset" ? parseDataset(block.body ?? "") : block.output ?? null
  if (block.name) {
   datasets[block.name] = published
  }
  previous = published
 }
 return { datasets, inList, previous, sql, ...(helpers as object) }
}

export function inList(rows: unknown[], columnIndex = 0) {
 const ids = (rows ?? []).map((row) => {
  const value = Array.isArray(row) ? row[columnIndex] : row
  if (typeof value === "number") {
   return String(value)
  }
  return `'${String(value ?? "").replaceAll("'", "''")}'`
 })
 return ids.length ? ids.join(", ") : "NULL"
}

export async function runUserCrown(source: string, bindings: Record<string, unknown>) {
 const mod = await import("/crown.mjs") as { crown: (context?: unknown, names?: Map<unknown, unknown>, basePath?: string) => CrownScope }
 const scope = mod.crown()
 for (const [key, value] of Object.entries(bindings)) {
  scope.set(key, mod.crown().value(value))
 }
 const program = source.endsWith("\n") ? source : `${source}\n`
 await scope.run(program)
 const error = scope._check_error()
 if (error) {
  throw new Error(error)
 }
 return scope.current()
}

interface CrownScope {
 current(): unknown
 run(source: string): Promise<unknown>
 set(name: string, value: unknown): unknown
 value(value: unknown): unknown
 _check_error(): string | undefined
}

export async function runUserJavaScript(source: string, bindings: Record<string, unknown>) {
 const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
 ) => (...values: unknown[]) => Promise<unknown>
 const runner = new AsyncFunction("sql", "datasets", "previous", "inList", source)
 return runner(bindings.sql, bindings.datasets, bindings.previous, bindings.inList)
}

export function primaryKey(grid: { rows?: unknown[][]; columns?: { name: string }[]; primaryKey?: string[] }, rowIndex: number) {
 const row = grid?.rows?.[rowIndex] ?? []
 const key: Record<string, unknown> = {}
 for (const name of grid?.primaryKey ?? []) {
  const index = (grid.columns ?? []).findIndex((column) => column.name === name)
  key[name] = index >= 0 ? row[index] : null
 }
 return key
}

export function nextSql(blocks: { kind?: string; body?: string }[], index: number, sql: string) {
 const next = blocks.map((block) => ({ ...block }))
 const following = next[index + 1]
 if (following && following.kind === "sql") {
  following.body = sql
  return next
 }
 next.splice(index + 1, 0, { id: id(), kind: "sql", name: "", body: sql, output: null })
 return next
}

export function saveDatasetBlock(blocks: unknown[], index: number, value: unknown) {
 const data = asDataset(value)
 if (!data) {
  return blocks
 }
 const next = blocks.slice()
 next.splice(index + 1, 0, {
  id: id(),
  kind: "dataset",
  name: "",
  body: stringifyDataset(data),
  output: null,
 })
 return next
}

export function rowFromDrafts(columns: { name: string; draft?: unknown }[]) {
 const row: Record<string, unknown> = {}
 for (const column of columns ?? []) {
  if (column.draft != null && column.draft !== "") {
   row[column.name] = column.draft
  }
 }
 return row
}

export function outputText(value: unknown) {
 if (typeof value === "string") {
  return value
 }
 if (value == null) {
  return ""
 }
 try {
  return JSON.stringify(value, null, 2)
 } catch {
  return String(value)
 }
}
