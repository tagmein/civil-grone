export type DatasetColumn = { name?: string; type?: string }

export type DatasetLike = {
 columns?: DatasetColumn[]
 rows?: unknown[][]
 sort?: { column: string; direction?: string }[]
 filters?: { column: string; op?: string; value?: string; join?: string }[]
 sourceSql?: string
 archived?: unknown[]
 archiveView?: string
 baseline?: (unknown[] | null)[]
 pinned?: string[][]
}

export type IncomingDataset = {
 columns?: DatasetColumn[]
 rows?: unknown[][]
}

export type RefreshChoice = "keep" | "take"

export type RefreshChoices = Record<string, RefreshChoice | undefined>

export type RowConflict = {
 sourceIndex: number
 label: string
 summary: string
 removed: boolean
}

type CellDiff = {
 name: string
 index: number
 mine: unknown
 query: unknown
}

type Pairing =
 | { type: "pair"; sourceIndex: number; incomingIndex: number; diffs: CellDiff[] }
 | { type: "keep"; sourceIndex: number }
 | { type: "drop"; sourceIndex: number }
 | { type: "remove"; sourceIndex: number }

const selectOps = ["eq", "neq", "gt", "lt", "contains"] as const

const selectOpLabels: Record<string, string> = {
 eq: "equals",
 neq: "not equals",
 gt: "greater than",
 lt: "less than",
 contains: "contains",
}

export function sameCell(left: unknown, right: unknown) {
 if (Object.is(left, right)) {
  return true
 }
 if (left == null && right == null) {
  return true
 }
 const leftText = left == null ? "" : String(left)
 const rightText = right == null ? "" : String(right)
 if (leftText.trim() === "" || rightText.trim() === "") {
  return leftText === rightText
 }
 const leftNumber = typeof left === "number" ? left : Number(leftText)
 const rightNumber = typeof right === "number" ? right : Number(rightText)
 if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
  return leftNumber === rightNumber
 }
 return leftText === rightText
}

export function readBaseline(value: unknown): (unknown[] | null)[] | undefined {
 if (!Array.isArray(value)) {
  return undefined
 }
 return value.map((row) => (Array.isArray(row) ? row.map((cell) => cell) : null))
}

export function readPinned(value: unknown): string[][] | undefined {
 if (!Array.isArray(value)) {
  return undefined
 }
 return value.map((item) => (Array.isArray(item) ? item.map((name) => String(name)) : []))
}

export function stampBaseline<T extends { rows?: unknown[][] }>(dataset: T) {
 const rows = dataset.rows ?? []
 return {
  ...dataset,
  rows,
  baseline: rows.map((row) => (Array.isArray(row) ? row.map((cell) => cell) : [])),
  pinned: rows.map(() => [] as string[]),
 }
}

export const datasetColumnTypes = ["TEXT", "INTEGER", "REAL", "BOOLEAN", "NUMERIC", "BLOB"]

export function canonicalColumnType(type: unknown) {
 const text = String(type ?? "").trim().toUpperCase()
 if (!text || text === "STRING" || text === "VARCHAR" || text === "CHAR") {
  return "TEXT"
 }
 if (text === "INT" || text === "INTEGER") {
  return "INTEGER"
 }
 if (text === "BOOL" || text === "BOOLEAN") {
  return "BOOLEAN"
 }
 if (text === "FLOAT" || text === "DOUBLE" || text === "REAL") {
  return "REAL"
 }
 if (text === "NUMBER" || text === "NUMERIC" || text === "DECIMAL") {
  return "NUMERIC"
 }
 if (text === "BLOB") {
  return "BLOB"
 }
 return text
}

export function integerBase(value: unknown) {
 const text = String(value ?? "").trim()
 if (!/^\d+$/.test(text)) {
  return null
 }
 const base = Number(text)
 if (base < 2 || base > 36) {
  return null
 }
 return base
}

export function migrateColumnValue(value: unknown, fromType: unknown, toType: unknown, base: number) {
 const from = canonicalColumnType(fromType)
 const to = canonicalColumnType(toType)
 if (from === to) {
  return value
 }
 if (value == null) {
  return ""
 }
 const text = String(value).trim()
 if (text === "") {
  return ""
 }
 if (to === "INTEGER") {
  const parsed = parseInt(text, base)
  return Number.isNaN(parsed) ? value : parsed
 }
 if (to === "REAL" || to === "NUMERIC") {
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : value
 }
 if (to === "BOOLEAN") {
  const lower = text.toLowerCase()
  if (lower === "true" || lower === "yes" || lower === "1") {
   return true
  }
  if (lower === "false" || lower === "no" || lower === "0") {
   return false
  }
  return value
 }
 if (to === "TEXT" || to === "BLOB") {
  return String(value)
 }
 return value
}

export type ColumnDraft = {
 name: string
 type: string
 from: number
 migrate?: boolean
 base?: string | number
}

function remapColumnKey<T extends { column: string }>(items: T[] | undefined, rename: Map<string, string>) {
 const next: T[] = []
 for (const item of items ?? []) {
  const name = rename.get(item.column)
  if (!name) {
   continue
  }
  next.push({ ...item, column: name })
 }
 return next
}

function draftedCell(source: unknown[], draft: ColumnDraft, priorType: unknown) {
 const from = typeof draft?.from === "number" ? draft.from : -1
 const raw = from >= 0 ? source[from] ?? "" : ""
 if (!draft?.migrate || from < 0) {
  return raw
 }
 const base = integerBase(draft.base) ?? 10
 return migrateColumnValue(raw, priorType, draft.type, base)
}

export function applyDatasetColumns(dataset: DatasetLike, drafts: ColumnDraft[]) {
 const previous = dataset?.columns ?? []
 const rename = new Map<string, string>()
 dataset.columns = (drafts ?? []).map((draft) => {
  const name = String(draft?.name ?? "").trim()
  const type = String(draft?.type ?? "").trim()
  const from = typeof draft?.from === "number" ? draft.from : -1
  const prior = from >= 0 ? previous[from] : undefined
  if (prior?.name) {
   rename.set(String(prior.name), name)
  }
  const column: DatasetColumn = prior ? { ...prior, name } : { name }
  if (type) {
   column.type = type
  } else {
   delete column.type
  }
  return column
 })
 const project = (row: unknown[]) => (drafts ?? []).map((draft) => {
  const from = typeof draft?.from === "number" ? draft.from : -1
  return draftedCell(row, draft, from >= 0 ? previous[from]?.type : "")
 })
 dataset.rows = (dataset.rows ?? []).map((row) => project(Array.isArray(row) ? row : []))
 dataset.sort = remapColumnKey(dataset.sort, rename)
 dataset.filters = remapColumnKey(dataset.filters, rename)
 if (Array.isArray(dataset.baseline)) {
  dataset.baseline = dataset.baseline.map((row) => {
   if (!Array.isArray(row)) {
    return null
   }
   return project(row)
  })
 }
 if (Array.isArray(dataset.pinned)) {
  dataset.pinned = dataset.pinned.map((names) => {
   if (!Array.isArray(names)) {
    return []
   }
   const next: string[] = []
   for (const name of names) {
    const renamed = rename.get(String(name))
    if (renamed) {
     next.push(renamed)
    }
   }
   return next
  })
 }
 return dataset
}

function columnName(column: DatasetColumn | undefined, index: number) {
 const name = String(column?.name ?? "").trim()
 return name || `column${index + 1}`
}

function columnList(columns: DatasetColumn[] | undefined) {
 return (columns ?? []).map((column, index) => ({
  name: columnName(column, index),
  type: column?.type ? String(column.type) : "",
 }))
}

function flagsFor(rows: unknown[][], archived: unknown) {
 const flags = Array.isArray(archived) ? archived : []
 return rows.map((_, index) => flags[index] === true || flags[index] === 1)
}

function keyIndexOf(columns: { name: string }[]) {
 return columns.findIndex((column) => column.name.toLowerCase() === "id")
}

function rowKey(row: unknown[] | null | undefined, index: number) {
 if (index < 0 || !row || index >= row.length) {
  return null
 }
 const value = row[index]
 if (value == null || value === "") {
  return null
 }
 return String(value)
}

function projectRow(incomingColumns: { name: string }[], incomingRow: unknown[], columns: { name: string }[]) {
 return columns.map((column) => {
  const index = incomingColumns.findIndex((item) => item.name === column.name)
  return index >= 0 ? incomingRow[index] : undefined
 })
}

function pinsAt(pinned: string[][] | undefined, index: number) {
 const names = pinned?.[index]
 return Array.isArray(names) ? names.map((name) => String(name)) : []
}

function choiceFor(choices: RefreshChoices | undefined, sourceIndex: number): RefreshChoice | "" {
 const value = choices?.[String(sourceIndex)]
 return value === "keep" || value === "take" ? value : ""
}

function cellText(value: unknown) {
 if (value == null || value === "") {
  return "blank"
 }
 return String(value)
}

function analyze(dataset: DatasetLike, incoming: IncomingDataset) {
 const columns = columnList(dataset.columns)
 const incomingColumns = columnList(incoming.columns)
 const rows = dataset.rows ?? []
 const archived = flagsFor(rows, dataset.archived)
 const knownBaseline = Array.isArray(dataset.baseline)
 const keyIndex = keyIndexOf(columns)
 const incomingKey = keyIndexOf(incomingColumns)
 const used = new Set<number>()
 const incomingRows = incoming.rows ?? []
 const pairings: Pairing[] = []

 function takeIncoming(key: string | null, fallback: unknown[] | null) {
  if (key != null && incomingKey >= 0) {
   const found = incomingRows.findIndex((row, index) => !used.has(index) && rowKey(row, incomingKey) === key)
   if (found >= 0) {
    used.add(found)
    return found
   }
   return -1
  }
  if (fallback) {
   const projected = incomingRows.findIndex((row, index) => {
    if (used.has(index)) {
     return false
    }
    const aligned = projectRow(incomingColumns, row, columns)
    return columns.every((column, index) => {
     if (!incomingColumns.some((item) => item.name === column.name)) {
      return true
     }
     return sameCell(fallback[index], aligned[index])
    })
   })
   if (projected >= 0) {
    used.add(projected)
    return projected
   }
  }
  return -1
 }

 rows.forEach((row, sourceIndex) => {
  const current = Array.isArray(row) ? row : []
  const baseline = knownBaseline ? dataset.baseline?.[sourceIndex] : undefined
  const identity = Array.isArray(baseline) ? baseline : current
  const key = rowKey(identity, keyIndex)
  const incomingIndex = takeIncoming(key, Array.isArray(baseline) ? baseline : knownBaseline ? null : current)
  if (incomingIndex < 0) {
   if (baseline === null || archived[sourceIndex] || key == null) {
    pairings.push({ type: "keep", sourceIndex })
    return
   }
   const pins = pinsAt(dataset.pinned, sourceIndex)
   const edited = Array.isArray(baseline) && columns.some((column, index) => {
    if (!incomingColumns.some((item) => item.name === column.name)) {
     return false
    }
    return pins.includes(column.name) || !sameCell(current[index], baseline[index])
   })
   if (baseline === undefined || edited) {
    pairings.push({ type: "remove", sourceIndex })
    return
   }
   pairings.push({ type: "drop", sourceIndex })
   return
  }
  const aligned = projectRow(incomingColumns, incomingRows[incomingIndex] ?? [], columns)
  const pins = pinsAt(dataset.pinned, sourceIndex)
  const diffs: CellDiff[] = []
  columns.forEach((column, index) => {
   if (!incomingColumns.some((item) => item.name === column.name)) {
    return
   }
   const mine = current[index]
   const query = aligned[index]
   if (Array.isArray(baseline)) {
    const base = baseline[index]
    if (pins.includes(column.name)) {
     if (sameCell(query, base) || sameCell(query, mine)) {
      return
     }
     diffs.push({ name: column.name, index, mine, query })
     return
    }
    if (!sameCell(mine, base) && !sameCell(query, mine)) {
     diffs.push({ name: column.name, index, mine, query })
    }
    return
   }
   if (!sameCell(mine, query)) {
    diffs.push({ name: column.name, index, mine, query })
   }
  })
  pairings.push({ type: "pair", sourceIndex, incomingIndex, diffs })
 })

 const extras = incomingRows.map((_, index) => index).filter((index) => !used.has(index))
 return { columns, incomingColumns, rows, archived, pairings, extras, incomingRows }
}

function conflictFrom(pairing: Pairing, rows: unknown[][], columns: { name: string }[], keyIndex: number): RowConflict | null {
 if (pairing.type !== "pair" && pairing.type !== "remove") {
  return null
 }
 const current = Array.isArray(rows[pairing.sourceIndex]) ? rows[pairing.sourceIndex] : []
 const key = rowKey(current, keyIndex)
 const label = key == null ? `Row ${pairing.sourceIndex + 1}` : `id ${key}`
 if (pairing.type === "remove") {
  return {
   sourceIndex: pairing.sourceIndex,
   label,
   summary: `${label} is no longer in the query.`,
   removed: true,
  }
 }
 if (pairing.diffs.length === 0) {
  return null
 }
 const summary = pairing.diffs
  .map((diff) => `${diff.name}: mine ${cellText(diff.mine)}, query ${cellText(diff.query)}`)
  .join("; ")
 return {
  sourceIndex: pairing.sourceIndex,
  label,
  summary,
  removed: false,
 }
}

export function listDatasetConflicts(dataset: DatasetLike, incoming: IncomingDataset) {
 const plan = analyze(dataset, incoming)
 const keyIndex = keyIndexOf(plan.columns)
 const conflicts: RowConflict[] = []
 for (const pairing of plan.pairings) {
  const conflict = conflictFrom(pairing, plan.rows, plan.columns, keyIndex)
  if (conflict) {
   conflicts.push(conflict)
  }
 }
 return conflicts
}

function mergedColumns(current: { name: string; type: string }[], incoming: { name: string; type: string }[]) {
 const columns = current.map((column) => ({ ...column }))
 for (const column of incoming) {
  if (!columns.some((item) => item.name === column.name)) {
   columns.push({ ...column })
  }
 }
 return columns
}

function pad(row: unknown[], width: number) {
 const next = row.map((cell) => cell)
 while (next.length < width) {
  next.push("")
 }
 return next
}

export function mergeDatasetRefresh(
 dataset: DatasetLike,
 incoming: IncomingDataset,
 choices: RefreshChoices | undefined,
) {
 const plan = analyze(dataset, incoming)
 const conflicts = plan.pairings
  .map((pairing) => conflictFrom(pairing, plan.rows, plan.columns, keyIndexOf(plan.columns)))
  .filter((conflict): conflict is RowConflict => Boolean(conflict))
 if (conflicts.some((conflict) => !choiceFor(choices, conflict.sourceIndex))) {
  return null
 }
 const columns = mergedColumns(plan.columns, plan.incomingColumns)
 const rows: unknown[][] = []
 const baseline: (unknown[] | null)[] = []
 const pinned: string[][] = []
 const archived: boolean[] = []
 const knownBaseline = Array.isArray(dataset.baseline)

 function push(row: unknown[], base: unknown[] | null, pins: string[], archivedRow: boolean) {
  rows.push(pad(row, columns.length))
  baseline.push(base == null ? null : pad(base, columns.length))
  pinned.push(pins)
  archived.push(archivedRow)
 }

 for (const pairing of plan.pairings) {
  const sourceIndex = pairing.sourceIndex
  const current = pad(Array.isArray(plan.rows[sourceIndex]) ? plan.rows[sourceIndex] : [], plan.columns.length)
  const prior = knownBaseline ? dataset.baseline?.[sourceIndex] : undefined
  const priorPins = pinsAt(dataset.pinned, sourceIndex)
  if (pairing.type === "drop") {
   continue
  }
  if (pairing.type === "keep") {
   const base = Array.isArray(prior) ? prior.map((cell) => cell) : prior === null ? null : null
   push(current, knownBaseline ? base : current.map((cell) => cell), priorPins, plan.archived[sourceIndex])
   continue
  }
  if (pairing.type === "remove") {
   if (choiceFor(choices, sourceIndex) === "keep") {
    push(current, null, [], plan.archived[sourceIndex])
   }
   continue
  }
  const incomingRow = plan.incomingRows[pairing.incomingIndex] ?? []
  const aligned = projectRow(plan.incomingColumns, incomingRow, columns)
  const choice = choiceFor(choices, sourceIndex)
  const diffNames = new Set(pairing.diffs.map((diff) => diff.name))
  const nextPins: string[] = []
  const nextRow = columns.map((column, index) => {
   const inQuery = plan.incomingColumns.some((item) => item.name === column.name)
   const mine = index < current.length ? current[index] : ""
   const query = aligned[index]
   const base = Array.isArray(prior) && index < prior.length ? prior[index] : undefined
   const wasPinned = priorPins.includes(column.name)
   if (!inQuery) {
    if (wasPinned) {
     nextPins.push(column.name)
    }
    return mine
   }
   const conflicted = diffNames.has(column.name)
   if (conflicted && choice === "keep") {
    nextPins.push(column.name)
    return mine
   }
   if (conflicted && choice === "take") {
    return query
   }
   if (wasPinned && Array.isArray(prior) && sameCell(query, base) && !sameCell(mine, query)) {
    nextPins.push(column.name)
    return mine
   }
   if (Array.isArray(prior) && !wasPinned && !sameCell(mine, base) && sameCell(mine, query)) {
    return mine
   }
   if (!Array.isArray(prior) && !conflicted) {
    return query ?? mine
   }
   if (Array.isArray(prior) && (sameCell(mine, base) || sameCell(mine, query))) {
    return query ?? mine
   }
   return query ?? mine
  })
  const nextBase = columns.map((column, index) => {
   const inQuery = plan.incomingColumns.some((item) => item.name === column.name)
   if (!inQuery) {
    return Array.isArray(prior) && index < prior.length ? prior[index] : nextRow[index]
   }
   return aligned[index]
  })
  push(nextRow, nextBase, nextPins, plan.archived[sourceIndex])
 }

 for (const incomingIndex of plan.extras) {
  const aligned = projectRow(plan.incomingColumns, plan.incomingRows[incomingIndex] ?? [], columns)
  const row = columns.map((_, index) => aligned[index] ?? "")
  push(row, row.map((cell) => cell), [], false)
 }

 return {
  columns,
  rows,
  sort: dataset.sort ?? [],
  filters: dataset.filters ?? [],
  sourceSql: dataset.sourceSql ?? "",
  archived,
  archiveView: dataset.archiveView === "show" || dataset.archiveView === "only" ? dataset.archiveView : "hide",
  baseline,
  pinned,
 }
}

export type ConflictPending = {
 columns?: DatasetColumn[]
 rows?: unknown[][]
 cursor?: number
 choices?: RefreshChoices
}

export function conflictView(dataset: DatasetLike, pending: ConflictPending | null | undefined) {
 const incoming = { columns: pending?.columns ?? [], rows: pending?.rows ?? [] }
 const conflicts = listDatasetConflicts(dataset, incoming)
 const count = conflicts.length
 if (count === 0) {
  return {
   applied: mergeDatasetRefresh(dataset, incoming, pending?.choices),
   count: 0,
   cursor: 0,
   atStart: true,
   atEnd: true,
   sourceIndex: -1,
   label: "",
   summary: "",
   position: "",
   choice: "",
  }
 }
 let cursor = Number(pending?.cursor ?? 0)
 if (!Number.isFinite(cursor) || cursor < 0) {
  cursor = 0
 }
 if (cursor > count - 1) {
  cursor = count - 1
 }
 const current = conflicts[cursor]
 const choice = choiceFor(pending?.choices, current.sourceIndex)
 const unresolved = conflicts.some((conflict) => !choiceFor(pending?.choices, conflict.sourceIndex))
 let summary = current.summary
 if (choice === "keep") {
  summary = `${summary} Keeping yours.`
 }
 if (choice === "take") {
  summary = `${summary} Using the query.`
 }
 return {
  applied: unresolved ? null : mergeDatasetRefresh(dataset, incoming, pending?.choices),
  count,
  cursor,
  atStart: cursor === 0,
  atEnd: cursor === count - 1,
  sourceIndex: current.sourceIndex,
  label: current.label,
  summary,
  position: `Conflict ${cursor + 1} of ${count} · ${current.label}`,
  choice,
 }
}

export function shiftConflictCursor(cursor: number, count: number, delta: number) {
 if (count <= 0) {
  return 0
 }
 let next = Number(cursor) + Number(delta)
 if (!Number.isFinite(next) || next < 0) {
  next = 0
 }
 if (next > count - 1) {
  next = count - 1
 }
 return next
}

export type SelectFilter = { column: string; op: string; value: string }

export type SelectConfig = { columns: string[]; filters: SelectFilter[] }

export function parseSelect(body: string): SelectConfig {
 try {
  const parsed = JSON.parse(body || "{}") as { columns?: unknown; filters?: unknown }
  const columns = Array.isArray(parsed.columns) ? parsed.columns.map((name) => String(name)).filter(Boolean) : []
  const filters = Array.isArray(parsed.filters)
   ? parsed.filters.flatMap((filter) => {
     if (!filter || typeof filter !== "object") {
      return []
     }
     const item = filter as { column?: unknown; op?: unknown; value?: unknown }
     const op = selectOps.includes(item.op as typeof selectOps[number]) ? String(item.op) : "gt"
     return [{ column: String(item.column ?? ""), op, value: String(item.value ?? "") }]
    })
   : []
  return { columns, filters }
 } catch {
  return { columns: [], filters: [] }
 }
}

export function selectFilterOf(body: string): SelectFilter {
 return parseSelect(body).filters[0] ?? { column: "", op: "gt", value: "" }
}

export function selectOpLabel(op: string) {
 return selectOpLabels[op] ?? "greater than"
}

export function selectColumnNames(available: string[] | undefined, body: string) {
 const names = (available ?? []).map((name) => String(name)).filter(Boolean)
 for (const name of parseSelect(body).columns) {
  if (!names.includes(name)) {
   names.push(name)
  }
 }
 return names
}

export function selectColumnChecked(body: string, name: string) {
 const columns = parseSelect(body).columns
 return columns.length === 0 || columns.includes(name)
}

export function writeSelectColumn(body: string, name: string, checked: unknown, available: string[] | undefined) {
 const config = parseSelect(body)
 const names = selectColumnNames(available, body)
 const on = checked === true || checked === "true" || checked === 1
 let columns = config.columns.length ? config.columns.slice() : names.slice()
 if (on) {
  if (!columns.includes(name)) {
   columns.push(name)
  }
 } else {
  columns = columns.filter((item) => item !== name)
 }
 const same = names.length > 0 && names.every((item) => columns.includes(item)) && columns.every((item) => names.includes(item))
 return JSON.stringify({ columns: same ? [] : columns, filters: config.filters })
}

export function writeSelectFilter(body: string, patch: { column?: string; op?: string; value?: string } | null) {
 const config = parseSelect(body)
 const current = config.filters[0] ?? { column: "", op: "gt", value: "" }
 const next = {
  column: patch?.column ?? current.column,
  op: patch?.op && selectOpLabels[patch.op] ? patch.op : current.op,
  value: patch?.value ?? current.value,
 }
 const filters = next.column || next.value ? [next] : []
 return JSON.stringify({ columns: config.columns, filters })
}

function matchSelect(cell: unknown, op: string, value: string) {
 const text = cell == null ? "" : String(cell)
 if (op === "contains") {
  return text.toLowerCase().includes(value.toLowerCase())
 }
 if (op === "eq") {
  return text === value || sameCell(cell, value)
 }
 if (op === "neq") {
  return text !== value && !sameCell(cell, value)
 }
 if (op === "gt") {
  return Number(cell) > Number(value)
 }
 if (op === "lt") {
  return Number(cell) < Number(value)
 }
 return true
}

export function applySelect(previous: unknown, body: string) {
 if (!previous || typeof previous !== "object") {
  throw new Error("The previous step has no dataset to select from.")
 }
 const record = previous as { columns?: unknown; rows?: unknown }
 if (!Array.isArray(record.columns) || !Array.isArray(record.rows)) {
  throw new Error("The previous step has no dataset to select from.")
 }
 const source = columnList(record.columns as DatasetColumn[])
 const sourceRows = record.rows.map((row) => (Array.isArray(row) ? row : []))
 const config = parseSelect(body)
 const wanted = config.columns.length ? config.columns : source.map((column) => column.name)
 const columns = wanted.map((name) => {
  const found = source.find((column) => column.name === name)
  if (!found) {
   throw new Error(`Column ${name} is not in the previous step.`)
  }
  return found
 })
 const indexes = columns.map((column) => source.findIndex((item) => item.name === column.name))
 let rows = sourceRows.map((row) => indexes.map((index) => row[index] ?? ""))
 for (const filter of config.filters) {
  if (!filter.column || filter.value === "") {
   continue
  }
  const index = columns.findIndex((column) => column.name === filter.column)
  if (index < 0) {
   throw new Error(`Column ${filter.column} is not selected.`)
  }
  rows = rows.filter((row) => matchSelect(row[index], filter.op, filter.value))
 }
 return { columns, rows, sort: [], filters: [], sourceSql: "" }
}
