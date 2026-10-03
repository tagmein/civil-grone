export const exampleStorageKeys = {
 todos: "starryui.example.todos",
 contacts: "starryui.example.contacts",
 notes: "starryui.example.notes",
 settings: "starryui.example.settings",
 inventory: "starryui.example.inventory",
}

export interface ExamplesUi {
 append(parent: HTMLElement, child: HTMLElement): HTMLElement
 button(label: string, onClick?: unknown): HTMLElement
 check(checked: boolean, onChange?: unknown): HTMLInputElement
 clear(parent: HTMLElement): void
 code(value: string, onInput?: unknown, onSubmit?: unknown): HTMLTextAreaElement
 column(): HTMLElement
 dialog(title: string): { close(): void; open(): void; panel: HTMLElement }
 field(label: string, value: string, onInput?: unknown): HTMLElement
 frame(): HTMLElement
 heading(text: string): HTMLElement
 input(value: string, onInput?: unknown): HTMLInputElement
 markdown(source: string): HTMLElement
 notice(tone: string, text: string): HTMLElement
 row(): HTMLElement
 split(direction: "row" | "column", ratio: number): {
  element: HTMLElement
  end: HTMLElement
  start: HTMLElement
 }
 table(config: Record<string, unknown>): HTMLElement
 text(value: string): HTMLElement
 tree(nodes: unknown[], selectedId: string, onSelect?: unknown): HTMLElement
}

interface ExampleActions {
 home(): void
 list(): void
 open(id: string): void
}

interface Todo {
 id: string
 title: string
 done: boolean
}

interface Contact {
 id: string
 name: string
 email: string
 phone: string
}

interface ContactBook {
 contacts: Contact[]
 selectedId: string
}

interface Note {
 id: string
 title: string
 body: string
}

interface Notebook {
 notes: Note[]
 selectedId: string
}

interface Settings {
 displayName: string
 email: string
 density: "comfortable" | "compact"
 tips: boolean
}

interface Stock {
 id: string
 item: string
 sku: string
 qty: string
 bin: string
}

interface InventoryFilter {
 column: string
 op: string
 value?: string
 join?: string
}

interface Inventory {
 items: Stock[]
 sort: { column: string; direction: "asc" | "desc" }[]
 filters: InventoryFilter[]
}

const demos = [
 {
  id: "todos",
  title: "Todo list",
  summary: "Add tasks and check them off.",
 },
 {
  id: "contacts",
  title: "Contacts",
  summary: "Keep names, email addresses, and phone numbers.",
 },
 {
  id: "notes",
  title: "Notes",
  summary: "Pick a note from the list and edit it.",
 },
 {
  id: "settings",
  title: "Settings",
  summary: "Change preferences in a small form.",
 },
 {
  id: "inventory",
  title: "Inventory",
  summary: "Sort, filter, and edit a stock table.",
 },
]

function readStore<T>(key: string, seed: () => T, accept: (value: unknown) => value is T): T {
 try {
  const raw = localStorage.getItem(key)
  if (raw) {
   const parsed = JSON.parse(raw) as unknown
   if (accept(parsed)) {
    return parsed
   }
  }
 } catch {
  // Replace unreadable data with the seed.
 }
 const value = seed()
 writeStore(key, value)
 return value
}

function writeStore(key: string, value: unknown) {
 try {
  localStorage.setItem(key, JSON.stringify(value))
 } catch {
  // The in-memory copy still paints when storage is blocked.
 }
}

function resetStore<T>(key: string, seed: () => T): T {
 const value = seed()
 writeStore(key, value)
 return value
}

let dismissDialog: (() => void) | null = null

function trackDialog(close: () => void) {
 dismissDialog?.()
 dismissDialog = close
}

function dismissExampleDialog() {
 dismissDialog?.()
 dismissDialog = null
}

function isRecord(value: unknown): value is Record<string, unknown> {
 return Boolean(value) && typeof value === "object"
}

function todoSeed(): Todo[] {
 return [
  { id: crypto.randomUUID(), title: "Sketch the column layout", done: false },
  { id: crypto.randomUUID(), title: "Try the filter dialog", done: true },
  { id: crypto.randomUUID(), title: "File notes in the tray", done: false },
 ]
}

function isTodoList(value: unknown): value is Todo[] {
 return Array.isArray(value) && value.every((item) => {
  return isRecord(item)
   && typeof item.id === "string"
   && typeof item.title === "string"
   && typeof item.done === "boolean"
 })
}

function contactSeed(): ContactBook {
 return {
  selectedId: "",
  contacts: [
   { id: crypto.randomUUID(), name: "Ada Lovelace", email: "ada@analytical.example", phone: "555-0101" },
   { id: crypto.randomUUID(), name: "Grace Hopper", email: "grace@navy.example", phone: "555-0108" },
   { id: crypto.randomUUID(), name: "Katherine Johnson", email: "katherine@nasa.example", phone: "555-0192" },
  ],
 }
}

function isContactBook(value: unknown): value is ContactBook {
 if (!isRecord(value) || typeof value.selectedId !== "string" || !Array.isArray(value.contacts)) {
  return false
 }
 return value.contacts.every((item) => {
  return isRecord(item)
   && typeof item.id === "string"
   && typeof item.name === "string"
   && typeof item.email === "string"
   && typeof item.phone === "string"
 })
}

function noteSeed(): Notebook {
 const first = crypto.randomUUID()
 return {
  selectedId: first,
  notes: [
   {
    id: first,
    title: "Welcome",
    body: "StarryUI notes stay in this browser.\n\nEdit this text, leave the demo, and come back. It is still here.",
   },
   {
    id: crypto.randomUUID(),
    title: "Shopping",
    body: "Milk\nBread\nOranges",
   },
  ],
 }
}

function isNotebook(value: unknown): value is Notebook {
 if (!isRecord(value) || typeof value.selectedId !== "string" || !Array.isArray(value.notes)) {
  return false
 }
 return value.notes.every((item) => {
  return isRecord(item)
   && typeof item.id === "string"
   && typeof item.title === "string"
   && typeof item.body === "string"
 })
}

function settingsSeed(): Settings {
 return {
  displayName: "Ada",
  email: "ada@analytical.example",
  density: "comfortable",
  tips: true,
 }
}

function isSettings(value: unknown): value is Settings {
 return isRecord(value)
  && typeof value.displayName === "string"
  && typeof value.email === "string"
  && (value.density === "comfortable" || value.density === "compact")
  && typeof value.tips === "boolean"
}

function stock(item: string, sku: string, qty: string, bin: string): Stock {
 return { id: crypto.randomUUID(), item, sku, qty, bin }
}

function inventorySeed(): Inventory {
 return {
  items: [
   stock("Notebook", "NB-1", "24", "A1"),
   stock("Pencil", "PN-2", "120", "A1"),
   stock("Tray", "TR-4", "8", "B3"),
   stock("Frame", "FR-9", "15", "C2"),
  ],
  sort: [],
  filters: [],
 }
}

const stockColumns = new Set(["item", "sku", "qty", "bin"])
const filterOps = new Set(["eq", "neq", "contains", "gt", "lt", "empty"])

function isInventory(value: unknown): value is Inventory {
 if (!isRecord(value) || !Array.isArray(value.items) || !Array.isArray(value.sort) || !Array.isArray(value.filters)) {
  return false
 }
 const itemsOk = value.items.every((item) => {
  return isRecord(item)
   && typeof item.id === "string"
   && typeof item.item === "string"
   && typeof item.sku === "string"
   && typeof item.qty === "string"
   && typeof item.bin === "string"
 })
 const sortOk = value.sort.every((item) => {
  return isRecord(item)
   && typeof item.column === "string"
   && stockColumns.has(item.column)
   && (item.direction === "asc" || item.direction === "desc")
 })
 const filtersOk = value.filters.every((item) => {
  if (!isRecord(item) || typeof item.column !== "string" || typeof item.op !== "string") {
   return false
  }
  if (!stockColumns.has(item.column) || !filterOps.has(item.op)) {
   return false
  }
  if (item.value != null && typeof item.value !== "string") {
   return false
  }
  return item.join == null || item.join === "and" || item.join === "or"
 })
 return itemsOk && sortOk && filtersOk
}

function pageColumn(ui: ExamplesUi) {
 const page = ui.column()
 page.style.padding = "var(--dimension3)"
 page.style.gap = "var(--dimension3)"
 page.style.minHeight = "0"
 return page
}

function chrome(
 page: HTMLElement,
 ui: ExamplesUi,
 actions: ExampleActions,
 title: string,
 options?: { back?: boolean; reset?: () => void },
) {
 const bar = ui.row()
 bar.append(ui.button("Home", () => actions.home()))
 if (options?.back) {
  bar.append(ui.button("Examples", () => actions.list()))
 }
 if (options?.reset) {
  bar.append(ui.button("Reset data", options.reset))
 }
 page.append(bar, ui.heading(title))
}

function paintList(page: HTMLElement, ui: ExamplesUi, actions: ExampleActions) {
 chrome(page, ui, actions, "Examples")
 page.append(ui.notice(
  "info",
  "Each demo keeps its data in this browser. Reset data on a demo restores the original sample.",
 ))
 for (const demo of demos) {
  const card = ui.frame()
  card.style.height = "auto"
  card.style.marginBottom = "0"
  card.style.padding = "var(--dimension3)"
  const summary = ui.text(demo.summary)
  summary.style.display = "block"
  summary.style.margin = "var(--dimension2) 0"
  const open = ui.button("Open", () => actions.open(demo.id))
  open.setAttribute("data-demo", demo.id)
  card.append(ui.heading(demo.title), summary, open)
  page.append(card)
 }
}

function paintTodos(page: HTMLElement, ui: ExamplesUi, actions: ExampleActions) {
 let data = readStore(exampleStorageKeys.todos, todoSeed, isTodoList)
 let draft = ""
 const paint = () => {
  page.replaceChildren()
  chrome(page, ui, actions, "Todo list", {
   back: true,
   reset() {
    draft = ""
    data = resetStore(exampleStorageKeys.todos, todoSeed)
    paint()
   },
  })
  const entry = ui.row()
  const add = () => {
   const title = draft.trim()
   if (!title) {
    return
   }
   data.push({ id: crypto.randomUUID(), title, done: false })
   draft = ""
   writeStore(exampleStorageKeys.todos, data)
   paint()
  }
  const field = ui.input(draft, (value) => {
   draft = String(value ?? "")
  })
  field.placeholder = "Add a task"
  field.style.width = "16rem"
  field.addEventListener("keydown", (event) => {
   if (event.key === "Enter") {
    event.preventDefault()
    add()
   }
  })
  entry.append(field, ui.button("Add", add))
  page.append(entry)
  if (data.length === 0) {
   page.append(ui.notice("empty", "No tasks yet."))
   return
  }
  for (const todo of data) {
   const line = ui.row()
   const label = ui.text(todo.title)
   label.style.flex = "1"
   if (todo.done) {
    label.style.textDecoration = "line-through"
   }
   line.append(
    ui.check(todo.done, (value) => {
     todo.done = value === "true"
     writeStore(exampleStorageKeys.todos, data)
     paint()
    }),
    label,
    ui.button("Remove", () => {
     data = data.filter((item) => item.id !== todo.id)
     writeStore(exampleStorageKeys.todos, data)
     paint()
    }),
   )
   page.append(line)
  }
 }
 paint()
}

function paintContacts(page: HTMLElement, ui: ExamplesUi, actions: ExampleActions) {
 let data = readStore(exampleStorageKeys.contacts, contactSeed, isContactBook)
 const paint = () => {
  if (!data.contacts.some((item) => item.id === data.selectedId)) {
   data.selectedId = ""
  }
  page.replaceChildren()
  chrome(page, ui, actions, "Contacts", {
   back: true,
   reset() {
    data = resetStore(exampleStorageKeys.contacts, contactSeed)
    paint()
   },
  })
  const bar = ui.row()
  bar.append(ui.button("New contact", () => openContact()))
  const selected = data.contacts.find((item) => item.id === data.selectedId)
  if (selected) {
   bar.append(
    ui.button("Edit", () => openContact(selected)),
    ui.button("Delete", () => {
     data.contacts = data.contacts.filter((item) => item.id !== selected.id)
     data.selectedId = ""
     writeStore(exampleStorageKeys.contacts, data)
     paint()
    }),
   )
  }
  page.append(bar)
  if (!selected) {
   page.append(ui.notice("info", "Select a row to edit or delete it."))
  }
  const selectedIndex = data.contacts.findIndex((item) => item.id === data.selectedId)
  page.append(ui.table({
   columns: [
    { name: "name", type: "text" },
    { name: "email", type: "text" },
    { name: "phone", type: "text" },
   ],
   rows: data.contacts.map((item) => [item.name, item.email, item.phone]),
   selectedIndex: selectedIndex >= 0 ? selectedIndex : undefined,
   onSelectRow: (index: number) => {
    data.selectedId = data.contacts[index]?.id ?? ""
    writeStore(exampleStorageKeys.contacts, data)
    paint()
   },
  }))
 }
 function openContact(existing?: Contact) {
  const draft = {
   name: existing?.name ?? "",
   email: existing?.email ?? "",
   phone: existing?.phone ?? "",
  }
  const dialog = ui.dialog(existing ? "Edit contact" : "New contact")
  trackDialog(() => dialog.close())
  const error = ui.notice("error", "Name is required.")
  error.hidden = true
  dialog.panel.append(
   ui.field("Name", draft.name, (value) => {
    draft.name = String(value ?? "")
   }),
   ui.field("Email", draft.email, (value) => {
    draft.email = String(value ?? "")
   }),
   ui.field("Phone", draft.phone, (value) => {
    draft.phone = String(value ?? "")
   }),
   error,
   ui.button("Save", () => {
    if (!draft.name.trim()) {
     error.hidden = false
     return
    }
    if (existing) {
     existing.name = draft.name.trim()
     existing.email = draft.email.trim()
     existing.phone = draft.phone.trim()
     data.selectedId = existing.id
    } else {
     const created = {
      id: crypto.randomUUID(),
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
     }
     data.contacts.push(created)
     data.selectedId = created.id
    }
    writeStore(exampleStorageKeys.contacts, data)
    dialog.close()
    paint()
   }),
   ui.button("Cancel", () => dialog.close()),
  )
  dialog.open()
 }
 paint()
}

function paintNotes(page: HTMLElement, ui: ExamplesUi, actions: ExampleActions) {
 let data = readStore(exampleStorageKeys.notes, noteSeed, isNotebook)
 page.style.overflow = "hidden"
 const paint = () => {
  if (!data.notes.some((item) => item.id === data.selectedId)) {
   data.selectedId = data.notes[0]?.id ?? ""
  }
  page.replaceChildren()
  chrome(page, ui, actions, "Notes", {
   back: true,
   reset() {
    data = resetStore(exampleStorageKeys.notes, noteSeed)
    paint()
   },
  })
  const bar = ui.row()
  bar.append(ui.button("New note", () => {
   const created = { id: crypto.randomUUID(), title: "Untitled", body: "" }
   data.notes.push(created)
   data.selectedId = created.id
   writeStore(exampleStorageKeys.notes, data)
   paint()
  }))
  const selected = data.notes.find((item) => item.id === data.selectedId)
  if (selected) {
   bar.append(ui.button("Delete note", () => {
    data.notes = data.notes.filter((item) => item.id !== selected.id)
    data.selectedId = data.notes[0]?.id ?? ""
    writeStore(exampleStorageKeys.notes, data)
    paint()
   }))
  }
  page.append(bar)
  const panes = ui.split("row", 0.32)
  panes.element.style.flex = "1"
  panes.element.style.minHeight = "16rem"
  panes.start.style.overflow = "auto"
  panes.end.style.overflow = "auto"
  panes.end.style.display = "flex"
  panes.end.style.flexDirection = "column"
  panes.end.style.minWidth = "0"
  panes.start.append(ui.tree(
   data.notes.map((item) => ({ id: item.id, label: item.title || "Untitled" })),
   data.selectedId,
   (id: string) => {
    if (id === data.selectedId) {
     return
    }
    data.selectedId = id
    writeStore(exampleStorageKeys.notes, data)
    paint()
   },
  ))
  if (!selected) {
   panes.end.append(ui.notice("empty", "No notes yet."))
  } else {
   const note = selected
   panes.end.append(ui.field("Title", note.title, (value) => {
    note.title = String(value ?? "")
    writeStore(exampleStorageKeys.notes, data)
    const current = panes.start.querySelector("[data-selected='1'] span:last-child")
    if (current) {
     current.textContent = note.title || "Untitled"
    }
   }))
   const body = ui.code(note.body, (value) => {
    note.body = String(value ?? "")
    writeStore(exampleStorageKeys.notes, data)
   })
   body.style.flex = "1"
   body.style.minHeight = "12rem"
   panes.end.append(body)
  }
  page.append(panes.element)
 }
 paint()
}

function paintSettings(page: HTMLElement, ui: ExamplesUi, actions: ExampleActions) {
 let data = readStore(exampleStorageKeys.settings, settingsSeed, isSettings)
 const paint = () => {
  page.replaceChildren()
  chrome(page, ui, actions, "Settings", {
   back: true,
   reset() {
    data = resetStore(exampleStorageKeys.settings, settingsSeed)
    paint()
   },
  })
  const greeting = ui.heading(data.displayName ? `Hello, ${data.displayName}` : "Hello")
  const status = ui.notice("info", "Stored in this browser.")
  const save = () => {
   writeStore(exampleStorageKeys.settings, data)
   greeting.textContent = data.displayName ? `Hello, ${data.displayName}` : "Hello"
   status.textContent = "Stored in this browser."
  }
  page.append(
   greeting,
   ui.field("Display name", data.displayName, (value) => {
    data.displayName = String(value ?? "")
    save()
   }),
   ui.field("Email", data.email, (value) => {
    data.email = String(value ?? "")
    save()
   }),
  )
  const density = ui.row()
  density.append(ui.text("Density"))
  const choose = (next: Settings["density"]) => {
   data.density = next
   writeStore(exampleStorageKeys.settings, data)
   paint()
  }
  density.append(
   ui.button(data.density === "comfortable" ? "Comfortable · on" : "Comfortable", () => choose("comfortable")),
   ui.button(data.density === "compact" ? "Compact · on" : "Compact", () => choose("compact")),
  )
  page.append(density)
  const tips = ui.row()
  tips.append(
   ui.check(data.tips, (value) => {
    data.tips = value === "true"
    writeStore(exampleStorageKeys.settings, data)
    paint()
   }),
   ui.text("Show tips"),
  )
  page.append(tips)
  if (data.tips) {
   page.append(ui.notice("info", "Tip: Reset data puts the sample preferences back."))
  }
  page.append(status)
 }
 paint()
}

function stockValue(item: Stock, column: string) {
 if (column === "item" || column === "sku" || column === "qty" || column === "bin") {
  return item[column]
 }
 return ""
}

function matchFilter(item: Stock, filter: InventoryFilter) {
 const value = stockValue(item, filter.column)
 const expected = filter.value ?? ""
 if (filter.op === "eq") {
  return value === expected
 }
 if (filter.op === "neq") {
  return value !== expected
 }
 if (filter.op === "contains") {
  return value.toLowerCase().includes(expected.toLowerCase())
 }
 if (filter.op === "gt") {
  return Number(value) > Number(expected)
 }
 if (filter.op === "lt") {
  return Number(value) < Number(expected)
 }
 if (filter.op === "empty") {
  return value === ""
 }
 return true
}

function matchFilters(item: Stock, filters: InventoryFilter[]) {
 if (filters.length === 0) {
  return true
 }
 let result = matchFilter(item, filters[0])
 for (let index = 1; index < filters.length; index += 1) {
  const next = matchFilter(item, filters[index])
  result = filters[index].join === "or" ? result || next : result && next
 }
 return result
}

function visibleStock(data: Inventory) {
 const filtered = data.items.filter((item) => matchFilters(item, data.filters))
 const sort = data.sort[0]
 if (!sort) {
  return filtered
 }
 const direction = sort.direction === "asc" ? 1 : -1
 return filtered.slice().sort((left, right) => {
  const a = stockValue(left, sort.column)
  const b = stockValue(right, sort.column)
  const aNumber = Number(a)
  const bNumber = Number(b)
  const delta = a !== "" && b !== "" && Number.isFinite(aNumber) && Number.isFinite(bNumber)
   ? aNumber - bNumber
   : a.localeCompare(b)
  return delta * direction
 })
}

function paintInventory(page: HTMLElement, ui: ExamplesUi, actions: ExampleActions) {
 let data = readStore(exampleStorageKeys.inventory, inventorySeed, isInventory)
 const paint = () => {
  page.replaceChildren()
  chrome(page, ui, actions, "Inventory", {
   back: true,
   reset() {
    data = resetStore(exampleStorageKeys.inventory, inventorySeed)
    paint()
   },
  })
  const shown = visibleStock(data)
  const bar = ui.row()
  bar.append(ui.button("Add row", () => {
   data.items.push(stock("New item", "", "0", ""))
   writeStore(exampleStorageKeys.inventory, data)
   paint()
  }))
  page.append(bar, ui.notice("info", "Double-click a cell to edit it. Filters and sort stay with this demo."))
  page.append(ui.table({
   columns: [
    { name: "item", type: "text" },
    { name: "sku", type: "text" },
    { name: "qty", type: "number" },
    { name: "bin", type: "text" },
   ],
   rows: shown.map((item) => [item.item, item.sku, item.qty, item.bin]),
   sort: data.sort,
   filters: data.filters,
   editable: true,
   onSort: (sort: { column: string; direction: string }[]) => {
    data.sort = (sort ?? []).flatMap((item) => {
     if (!stockColumns.has(item.column)) {
      return []
     }
     return [{ column: item.column, direction: item.direction === "desc" ? "desc" as const : "asc" as const }]
    })
    writeStore(exampleStorageKeys.inventory, data)
    paint()
   },
   onFilter: (filters: InventoryFilter[]) => {
    data.filters = Array.isArray(filters) ? filters.filter((item) => {
     return stockColumns.has(item.column) && filterOps.has(item.op)
    }) : []
    writeStore(exampleStorageKeys.inventory, data)
    paint()
   },
   onCellEdit: (rowIndex: number, column: string, value: string) => {
    const target = shown[rowIndex]
    if (!target || !stockColumns.has(column)) {
     return
    }
    if (column === "item" || column === "sku" || column === "qty" || column === "bin") {
     target[column] = value
    }
    writeStore(exampleStorageKeys.inventory, data)
    paint()
   },
  }))
 }
 paint()
}

const painters: Record<string, (page: HTMLElement, ui: ExamplesUi, actions: ExampleActions) => void> = {
 todos: paintTodos,
 contacts: paintContacts,
 notes: paintNotes,
 settings: paintSettings,
 inventory: paintInventory,
}

export function paintExamples(
 container: HTMLElement,
 ui: ExamplesUi,
 actions: ExampleActions,
 activeId: string,
) {
 dismissExampleDialog()
 container.replaceChildren()
 container.setAttribute("data-screen", "examples")
 container.setAttribute("data-demo", painters[activeId] ? activeId : "list")
 const page = pageColumn(ui)
 container.append(page)
 const paint = painters[activeId]
 if (!paint) {
  paintList(page, ui, actions)
  return
 }
 paint(page, ui, actions)
}

export function paintHome(
 container: HTMLElement,
 ui: ExamplesUi,
 actions: { databases(): void; notes(): void; examples(): void },
) {
 dismissExampleDialog()
 container.replaceChildren()
 container.setAttribute("data-screen", "home")
 container.removeAttribute("data-demo")
 const page = pageColumn(ui)
 page.append(
  ui.heading("Home"),
  ui.markdown("Civil Grone is a local-first database and notebook."),
  ui.markdown("Databases opens a SQLite file on this machine or connects a Turso database. Browse tables, sort and filter rows, and run SQL."),
  ui.markdown("Notes live in the selected database. A note mixes markdown with SQL, Crown, and JavaScript blocks that pass datasets along a pipeline."),
  ui.markdown("Examples are small StarryUI interfaces. Their data stays in this browser."),
 )
 const links = ui.row()
 links.append(
  ui.button("Databases", actions.databases),
  ui.button("Notes", actions.notes),
  ui.button("Examples", actions.examples),
 )
 page.append(links)
 container.append(page)
}
