import { button } from "../starryui/packages/button/index.ts"
import { checkbox, codefield, field, input } from "../starryui/packages/field/index.ts"
import { paintExamples, paintHome } from "./examples.ts"
import { frame } from "../starryui/packages/frame/index.ts"
import { column, row } from "../starryui/packages/layout/index.ts"
import { loading } from "../starryui/packages/loading/index.ts"
import { markdown } from "../starryui/packages/markdown/index.ts"
import { attachMenu, menu } from "../starryui/packages/menu/index.ts"
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

export function toggleFullscreen() {
 const result = document.fullscreenElement
  ? document.exitFullscreen()
  : document.documentElement.requestFullscreen()
 return result.catch((error) => {
  reportError(error)
 })
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
 const themedCheck = applyTheme(theme, checkbox)
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
 const themedMenu = applyTheme(theme, menu)
 const themedLoading = applyTheme(theme, loading)
 const themedTray = applyTheme(theme, tray)
 const liveMenus: { anchor: HTMLElement; instance: { element: HTMLElement; isOpen: boolean; close(): void } }[] = []
 let menuListening = false

 function pruneMenus() {
  for (let index = liveMenus.length - 1; index >= 0; index -= 1) {
   const entry = liveMenus[index]
   if (!entry.anchor.isConnected) {
    if (entry.instance.isOpen) {
     entry.instance.close()
    }
    liveMenus.splice(index, 1)
   }
  }
 }

 function closeOpenMenus(except?: { close(): void }) {
  for (const entry of liveMenus) {
   if (entry.instance !== except && entry.instance.isOpen) {
    entry.instance.close()
   }
  }
 }

 function ensureMenuListeners() {
  if (menuListening) {
   return
  }
  menuListening = true
  document.addEventListener("click", (event) => {
   const target = event.target
   if (!(target instanceof Node)) {
    return
   }
   for (const entry of liveMenus) {
    if (!entry.instance.isOpen) {
     continue
    }
    if (entry.instance.element.contains(target) || entry.anchor.contains(target)) {
     continue
    }
    entry.instance.close()
   }
  }, true)
  document.addEventListener("keydown", (event) => {
   if (event.key !== "Escape") {
    return
   }
   if (!liveMenus.some((entry) => entry.instance.isOpen)) {
    return
   }
   event.stopPropagation()
   closeOpenMenus()
  })
 }

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
  check(checked: boolean, onChange?: unknown) {
   return themedCheck.add(
    withValue(checked ? "true" : "false"),
    withOnInput((next) => void guard(onChange)(next)),
   )()
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
   element.style.overflow = "visible"
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
  nameInput(value: string, onInput?: unknown) {
   const element = themedInput.add(
    withValue(value ?? ""),
    withOnInput((next) => void guard(onInput)(next)),
   )()
   element.style.flex = "1 1 10rem"
   element.style.maxWidth = "16rem"
   element.style.minWidth = "8rem"
   element.style.width = "auto"
   return element
  },
  loading(text: string) {
   return themedLoading.add(withTextContent(text))()
  },
  menu(anchor: HTMLElement, entries: unknown) {
   pruneMenus()
   const items = Array.isArray(entries) ? entries as { id?: string; label?: string; action?: unknown }[] : []
   const instance = themedMenu({
    content(container) {
     container.setAttribute("role", "menu")
     for (const item of items) {
      const row = document.createElement("div")
      row.setAttribute("role", "menuitem")
      row.textContent = item.id === "fullscreen"
       ? (document.fullscreenElement ? "Exit fullscreen" : "Fullscreen")
       : String(item.label ?? "")
      row.addEventListener("click", () => {
       if (item.id === "fullscreen") {
        void toggleFullscreen()
       }
       instance.close()
       if (item.id !== "fullscreen") {
        void guard(item.action)()
       }
      })
      container.append(row)
     }
    },
   })
   const open = instance.open.bind(instance)
   const close = instance.close.bind(instance)
   instance.open = () => {
    closeOpenMenus(instance)
    open()
    anchor.setAttribute("aria-expanded", "true")
   }
   instance.close = () => {
    if (!instance.isOpen) {
     return
    }
    close()
    anchor.setAttribute("aria-expanded", "false")
   }
   anchor.setAttribute("aria-haspopup", "menu")
   anchor.setAttribute("aria-expanded", "false")
   attachMenu(anchor, instance)
   ensureMenuListeners()
   liveMenus.push({ anchor, instance })
   return anchor
  },
  markdown(source: string) {
   return themedMarkdown({ source: source ?? "" })
  },
  notice(tone: string, text: string) {
   const allowed = tone === "error" || tone === "empty" ? tone : "info"
   return themedNotice({ tone: allowed, text })
  },
  pillar() {
   const element = document.createElement("span")
   element.setAttribute("aria-hidden", "true")
   element.style.alignSelf = "stretch"
   element.style.backgroundColor = "var(--theme0)"
   element.style.borderTop = "1px solid var(--theme4)"
   element.style.borderRight = "1px solid var(--theme4)"
   element.style.borderBottom = "1px solid var(--theme4)"
   element.style.borderLeft = "none"
   element.style.boxSizing = "border-box"
   element.style.flex = "0 0 var(--dimension3)"
   element.style.marginLeft = "-1px"
   element.style.width = "var(--dimension3)"
   return element
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
  stepBar() {
   const element = themedRow()
   element.style.flexGrow = "0"
   element.style.flexWrap = "nowrap"
   element.style.alignItems = "stretch"
   element.style.gap = "0"
   element.style.overflow = "visible"
   element.style.padding = "0"
   return element
  },
  stepTools() {
   const element = themedRow()
   element.style.flex = "1 1 auto"
   element.style.minWidth = "0"
   element.style.gap = "var(--dimension2)"
   element.style.alignItems = "center"
   element.style.padding = "var(--dimension2)"
   return element
  },
  stepError(id: string, message: string) {
   const element = themedNotice({ tone: "error", text: message })
   element.setAttribute("data-step-error", String(id))
   element.style.margin = "0 var(--dimension2) var(--dimension2)"
   return element
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
    archived: Array.isArray(config.archived) ? (config.archived as boolean[]) : undefined,
    onSort: (sort) => void guard(config.onSort)(sort),
    onFilter: (filters) => void guard(config.onFilter)(filters),
    onPage: typeof config.onPage === "function" ? (page: number) => void guard(config.onPage)(page) : undefined,
    selectedIndex: typeof config.selectedIndex === "number" ? config.selectedIndex : undefined,
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

const connectionStorageKey = "civil-grone.connectionId"

function normalizePath(pathname: string) {
 const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
 try {
  return decodeURIComponent(trimmed)
 } catch {
  return trimmed
 }
}

export function readRoute() {
 if (typeof location === "undefined") {
  return { section: "", noteId: "" }
 }
 const match = normalizePath(location.pathname).match(/^\/notes(?:\/([^/]+))?$/)
 if (!match) {
  return { section: "", noteId: "" }
 }
 return { section: "notes", noteId: match[1] ?? "" }
}

export function writeRoute(section: string, noteId: string, example: string, mode: string) {
 if (typeof location === "undefined" || typeof history === "undefined") {
  return
 }
 const safeSection = section || "databases"
 const id = safeSection === "notes" ? String(noteId ?? "") : ""
 const demo = safeSection === "examples" ? String(example ?? "") : ""
 const next = safeSection === "notes" ? (id ? `/notes/${encodeURIComponent(id)}` : "/notes") : "/"
 const data = { section: safeSection, noteId: id, example: demo }
 const samePath = normalizePath(location.pathname) === normalizePath(next)
 const prev = history.state && typeof history.state === "object"
  ? history.state as { section?: string; noteId?: string; example?: string }
  : null
 const sameState = prev?.section === data.section && (prev?.noteId ?? "") === data.noteId && (prev?.example ?? "") === data.example
 if (samePath && sameState) {
  return
 }
 if (mode === "replace") {
  history.replaceState(data, "", next)
  return
 }
 history.pushState(data, "", next)
}

export function onRoute(handler: unknown) {
 if (typeof window === "undefined") {
  return
 }
 window.addEventListener("popstate", () => {
  const route = readRoute()
  const stored = history.state && typeof history.state === "object"
   ? history.state as { section?: string; example?: string }
   : {}
  if (route.section === "notes") {
   void guard(handler)("notes", route.noteId, "")
   return
  }
  void guard(handler)(String(stored.section || "databases"), "", String(stored.example || ""))
 })
}

export function readConnectionId() {
 try {
  if (typeof localStorage === "undefined") {
   return ""
  }
  return localStorage.getItem(connectionStorageKey) ?? ""
 } catch {
  return ""
 }
}

export function writeConnectionId(id: string) {
 try {
  if (typeof localStorage === "undefined") {
   return
  }
  const text = String(id ?? "")
  if (text) {
   localStorage.setItem(connectionStorageKey, text)
  } else {
   localStorage.removeItem(connectionStorageKey)
  }
 } catch {
  // Selection still works for this session when storage is blocked.
 }
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

export function noteNodes(
 notes: { id: string; title: string; archived?: number | boolean }[],
 mode?: string,
) {
 return (notes ?? []).filter((note) => {
  const archived = note.archived === true || note.archived === 1
  if (mode === "only") {
   return archived
  }
  if (mode === "show") {
   return true
  }
  return !archived
 }).map((note) => {
  const title = note.title || "Untitled"
  const archived = note.archived === true || note.archived === 1
  return {
   id: note.id,
   label: archived ? `${title} (archived)` : title,
  }
 })
}

type ArchiveView = "hide" | "show" | "only"

function archiveViewOf(value: unknown): ArchiveView {
 if (value === "show" || value === "only") {
  return value
 }
 return "hide"
}

function archiveFlags(rows: unknown[], archived: unknown) {
 const flags = Array.isArray(archived) ? archived : []
 return rows.map((_, index) => flags[index] === true || flags[index] === 1)
}

function emptyDataset() {
 return {
  columns: [] as { name: string; type?: string }[],
  rows: [] as unknown[][],
  sort: [] as { column: string; direction: string }[],
  filters: [] as { column: string; op: string; value?: string; join?: string }[],
  sourceSql: "",
  archived: [] as boolean[],
  archiveView: "hide" as ArchiveView,
 }
}

export function parseDataset(body: string) {
 try {
  const parsed = JSON.parse(body || "{}")
  const rows = Array.isArray(parsed.rows) ? parsed.rows : []
  return {
   columns: Array.isArray(parsed.columns) ? parsed.columns : [],
   rows,
   sort: Array.isArray(parsed.sort) ? parsed.sort : [],
   filters: Array.isArray(parsed.filters) ? parsed.filters : [],
   sourceSql: typeof parsed.sourceSql === "string" ? parsed.sourceSql : "",
   archived: archiveFlags(rows, parsed.archived),
   archiveView: archiveViewOf(parsed.archiveView),
  }
 } catch {
  return emptyDataset()
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
 filters?: { column: string; op: string; value?: string; join?: string }[]
 archived?: unknown[]
 archiveView?: unknown
}) {
 const columns = dataset?.columns ?? []
 const source = dataset?.rows ?? []
 const flags = archiveFlags(source, dataset?.archived)
 const view = archiveViewOf(dataset?.archiveView)
 let rows = source.filter((_, index) => {
  if (view === "only") {
   return flags[index]
  }
  if (view === "show") {
   return true
  }
  return !flags[index]
 })
 const groups = new Map<string, { op: string; value?: string; join?: string }[]>()
 for (const filter of dataset?.filters ?? []) {
  const list = groups.get(filter.column) ?? []
  list.push(filter)
  groups.set(filter.column, list)
 }
 for (const [column, filters] of groups) {
  const index = columns.findIndex((item) => item.name === column)
  if (index < 0) {
   continue
  }
  rows = rows.filter((row) => matchColumn(row[index], filters))
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

export function editorRows(dataset: Parameters<typeof visibleRows>[0]) {
 const source = dataset?.rows ?? []
 const flags = archiveFlags(source, dataset?.archived)
 const rows = visibleRows(dataset)
 return {
  rows,
  archived: rows.map((row) => {
   const index = source.indexOf(row)
   return index >= 0 && Boolean(flags[index])
  }),
 }
}

export function archiveViewLabel(view: unknown) {
 const normalized = archiveViewOf(view)
 if (normalized === "show") {
  return "Show archived"
 }
 if (normalized === "only") {
  return "Only archived"
 }
 return "Hide archived"
}

export function datasetSourceIndex(rows: unknown[] | undefined, row: unknown) {
 if (!Array.isArray(rows) || !Array.isArray(row)) {
  return -1
 }
 return rows.indexOf(row)
}

export function shownRowIndex(shown: unknown[] | undefined, source: unknown[] | undefined, sourceIndex: unknown) {
 if (typeof sourceIndex !== "number" || !Array.isArray(shown) || !Array.isArray(source)) {
  return -1
 }
 const row = source[sourceIndex]
 if (!Array.isArray(row)) {
  return -1
 }
 return shown.indexOf(row)
}

export function datasetRowPicked(dataset: { rows?: unknown[] } | null, sourceIndex: unknown) {
 const rows = dataset?.rows ?? []
 return typeof sourceIndex === "number" && sourceIndex >= 0 && sourceIndex < rows.length
}

export function rowArchived(dataset: { rows?: unknown[]; archived?: unknown[] } | null, sourceIndex: unknown) {
 const rows = dataset?.rows ?? []
 if (typeof sourceIndex !== "number" || sourceIndex < 0 || sourceIndex >= rows.length) {
  return false
 }
 return archiveFlags(rows, dataset?.archived)[sourceIndex]
}

export function editDatasetCell(
 dataset: { columns?: { name: string }[]; rows?: unknown[][] },
 sourceIndex: number,
 columnName: string,
 value: string,
) {
 const row = dataset?.rows?.[sourceIndex]
 if (!Array.isArray(row)) {
  return dataset
 }
 const columnIndex = (dataset.columns ?? []).findIndex((column) => column.name === columnName)
 if (columnIndex < 0) {
  return dataset
 }
 row[columnIndex] = value
 return dataset
}

export function addDatasetRow(dataset: {
 columns?: { name?: string }[]
 rows?: unknown[][]
 archived?: boolean[]
 archiveView?: ArchiveView
}) {
 const columns = dataset?.columns ?? []
 if (columns.length === 0) {
  return -1
 }
 const rows = dataset.rows ?? []
 const flags = archiveFlags(rows, dataset.archived)
 rows.push(columns.map(() => ""))
 flags.push(false)
 dataset.rows = rows
 dataset.archived = flags
 if (archiveViewOf(dataset.archiveView) === "only") {
  dataset.archiveView = "show"
 }
 return rows.length - 1
}

export function toggleDatasetArchive(dataset: { rows?: unknown[][]; archived?: boolean[] }, sourceIndex: number) {
 const rows = dataset?.rows ?? []
 if (sourceIndex < 0 || sourceIndex >= rows.length) {
  return false
 }
 const flags = archiveFlags(rows, dataset.archived)
 flags[sourceIndex] = !flags[sourceIndex]
 dataset.archived = flags
 return flags[sourceIndex]
}

export function setArchiveView(dataset: { archiveView?: ArchiveView }, view: unknown) {
 dataset.archiveView = archiveViewOf(view)
 return dataset.archiveView
}

function matchColumn(cell: unknown, filters: { op: string; value?: string; join?: string }[]) {
 let matched: boolean | null = null
 for (const filter of filters) {
  if (filter.op !== "empty" && (filter.value ?? "") === "") {
   continue
  }
  const next = matchFilter(cell, filter.op, filter.value ?? "")
  if (matched == null) {
   matched = next
  } else if (filter.join === "or") {
   matched = matched || next
  } else {
   matched = matched && next
  }
 }
 return matched ?? true
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

const customersOrdersSql = `CREATE TABLE IF NOT EXISTS customers (
 id INTEGER PRIMARY KEY,
 name TEXT,
 active INTEGER
);
CREATE TABLE IF NOT EXISTS orders (
 id INTEGER PRIMARY KEY,
 customer_id INTEGER,
 total REAL
);
INSERT OR IGNORE INTO customers (id, name, active) VALUES
 (1, 'Ada', 1),
 (2, 'Grace', 1),
 (3, 'Lin', 0);
INSERT OR IGNORE INTO orders (id, customer_id, total) VALUES
 (10, 1, 12.5),
 (11, 1, 4),
 (12, 2, 9);
`

const customersOrdersMatch = "SELECT id, name FROM customers WHERE active = 1"

export function pipelineTemplates() {
 return [
  {
   id: "blank",
   title: "Blank",
   detail: "Start with one empty markdown block.",
   sampleSql: "",
   tables: [] as string[],
   match: "",
   blocks() {
    return [blankBlock("markdown")]
   },
  },
  {
   id: "customers-orders",
   title: "Customers, then orders",
   detail: "A Crown block reads the customers dataset and builds the next orders query.",
   sampleSql: customersOrdersSql,
   tables: ["customers", "orders"],
   match: customersOrdersMatch,
   blocks: pipelineBlocks,
  },
 ]
}

export function sampleForNote(note: { blocks?: { body?: string }[] } | null) {
 const bodies = (note?.blocks ?? []).map((block) => block.body ?? "").join("\n")
 return pipelineTemplates().find((template) => template.match && bodies.includes(template.match)) ?? null
}

export function sampleReady(tables: { name?: string }[] | null, template: { tables?: string[] }) {
 const names = new Set((tables ?? []).map((table) => table.name))
 return (template?.tables ?? []).every((name) => names.has(name))
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

export function hideStepError(blockId: string) {
 const id = String(blockId ?? "")
 if (!id) {
  return
 }
 const escaped = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(id) : id
 document.querySelector(`[data-step-error="${escaped}"]`)?.remove()
}

export function retainStepErrors(
 errors: Record<string, string> | null,
 note: { blocks?: { id?: string }[] } | null,
 bannerId: string,
) {
 const ids = new Set((note?.blocks ?? []).map((block) => String(block?.id ?? "")))
 const next: Record<string, string> = {}
 for (const [id, message] of Object.entries(errors ?? {})) {
  if (ids.has(id) && message) {
   next[id] = message
  }
 }
 const banner = String(bannerId ?? "")
 return {
  errors: next,
  bannerId: banner && next[banner] ? banner : "",
 }
}

export function isElement(value: unknown) {
 return typeof HTMLElement !== "undefined" && value instanceof HTMLElement
}

export function trackUi<T extends { dialog(title: string): { element: HTMLElement } }>(ui: T): T {
 const tracked = {
  ...ui,
  dialog(title: string) {
   const instance = ui.dialog(title)
   instance.element.setAttribute("data-example-dialog", "1")
   return instance
  },
 }
 return tracked as T
}

export function clearScreen(container: HTMLElement) {
 container.removeAttribute("data-screen")
 container.removeAttribute("data-demo")
 document.querySelectorAll("[data-example-dialog]").forEach((node) => node.remove())
}

export function renderExamples(
 container: HTMLElement,
 ui: Parameters<typeof paintExamples>[1],
 onHome: unknown,
 onList: unknown,
 onOpen: unknown,
 onImport: unknown,
 activeId: unknown,
) {
 paintExamples(container, ui, {
  home() {
   void guard(onHome)()
  },
  list() {
   void guard(onList)()
  },
  open(id) {
   void guard(onOpen)(id)
  },
 }, typeof activeId === "string" ? activeId : "", {
  importExample(title, blocks) {
   void guard(onImport)(title, blocks)
  },
  run(source, datasets, writeDataset, refresh) {
   return runUserCrown(source, {
    datasets,
    previous: null,
    inList,
    sql: async () => ({ columns: [], rows: [], sort: [], filters: [], sourceSql: "" }),
    ui: trackUi(ui),
    starry: { asDataset, id, isElement, parseDataset, stringifyDataset, visibleRows },
    writeDataset,
    refresh,
   })
  },
 })
}

export function renderHome(
 container: HTMLElement,
 ui: Parameters<typeof paintHome>[1],
 onDatabases: unknown,
 onNotes: unknown,
 onExamples: unknown,
) {
 paintHome(container, ui, {
  databases() {
   void guard(onDatabases)()
  },
  notes() {
   void guard(onNotes)()
  },
  examples() {
   void guard(onExamples)()
  },
 })
}
