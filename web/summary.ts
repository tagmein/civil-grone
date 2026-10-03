const summaryStorageKey = "civil-grone.columnSummaries"

export type SummaryAction = "" | "sum" | "avg" | "count"

type SummaryStore = Record<string, Record<string, Record<string, SummaryAction>>>

export function columnSummaryKind(type: unknown) {
 const text = String(type ?? "").toUpperCase()
 if (text.includes("BOOL")) {
  return "boolean"
 }
 if (text.includes("INT")) {
  return "integer"
 }
 if (/REAL|FLOA|DOUB|DEC|NUM|MONEY/.test(text)) {
  return "numeric"
 }
 return ""
}

export function summaryOptions(type: unknown) {
 const kind = columnSummaryKind(type)
 if (kind === "boolean") {
  return [
   { value: "", label: "None" },
   { value: "count", label: "Count" },
  ]
 }
 if (kind === "integer") {
  return [
   { value: "", label: "None" },
   { value: "sum", label: "Sum" },
   { value: "avg", label: "Average" },
   { value: "count", label: "Count" },
  ]
 }
 if (kind === "numeric") {
  return [
   { value: "", label: "None" },
   { value: "sum", label: "Sum" },
   { value: "avg", label: "Average" },
  ]
 }
 return []
}

function readStore(): SummaryStore {
 try {
  if (typeof localStorage === "undefined") {
   return {}
  }
  const parsed = JSON.parse(localStorage.getItem(summaryStorageKey) || "{}")
  return parsed && typeof parsed === "object" ? parsed : {}
 } catch {
  return {}
 }
}

function writeStore(store: SummaryStore) {
 try {
  if (typeof localStorage === "undefined") {
   return
  }
  localStorage.setItem(summaryStorageKey, JSON.stringify(store))
 } catch {
  // The current page still uses the value passed to the grid.
 }
}

function normalizeAction(value: unknown): SummaryAction {
 if (value === "sum" || value === "avg" || value === "count") {
  return value
 }
 return ""
}

export function columnSummary(connectionId: string, table: string, column: string) {
 return normalizeAction(readStore()[String(connectionId ?? "")]?.[String(table ?? "")]?.[String(column ?? "")])
}

export function writeColumnSummary(connectionId: string, table: string, column: string, action: string) {
 const id = String(connectionId ?? "")
 const tableName = String(table ?? "")
 const columnName = String(column ?? "")
 if (!id || !tableName || !columnName) {
  return
 }
 const store = readStore()
 const tables = { ...(store[id] ?? {}) }
 const columns = { ...(tables[tableName] ?? {}) }
 const next = normalizeAction(action)
 if (next) {
  columns[columnName] = next
  tables[tableName] = columns
  store[id] = tables
 } else {
  delete columns[columnName]
  if (Object.keys(columns).length === 0) {
   delete tables[tableName]
  } else {
   tables[tableName] = columns
  }
  if (Object.keys(tables).length === 0) {
   delete store[id]
  } else {
   store[id] = tables
  }
 }
 writeStore(store)
}

export function tableSummaries(connectionId: string, table: string) {
 const columns = readStore()[String(connectionId ?? "")]?.[String(table ?? "")] ?? {}
 const result: Record<string, SummaryAction> = {}
 for (const [name, action] of Object.entries(columns)) {
  const next = normalizeAction(action)
  if (next) {
   result[name] = next
  }
 }
 return result
}
