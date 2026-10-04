// Preview edits live in localStorage. Import saves the selected source and the current rows as a note.

export interface ExamplesUi {
 append(parent: HTMLElement, child: HTMLElement): HTMLElement
 button(label: string, onClick?: unknown): HTMLElement
 check(checked: boolean, onChange?: unknown): HTMLElement
 choice(value: string, options: { value?: string; label?: string }[], onChange?: unknown): HTMLSelectElement
 clear(parent: HTMLElement): void
 code(value: string, onInput?: unknown, onSubmit?: unknown): HTMLTextAreaElement
 column(): HTMLElement
 dialog(title: string): { close(): void; element: HTMLElement; open(): void; panel: HTMLElement }
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

interface ExampleBlock {
 kind: string
 name: string
 body: string
}

interface Dataset {
 columns: { name: string; type?: string }[]
 rows: unknown[][]
 sort: unknown[]
 filters: unknown[]
}

interface ExampleDef {
 id: string
 title: string
 summary: string
 blocks: ExampleBlock[]
}

interface ExampleSession {
 blocks: ExampleBlock[]
 crownName: string
 crownSource: string
 scriptSource: string
 language: "crown" | "javascript"
 datasets: Record<string, Dataset>
}

export interface ExampleRuntime {
 importExample(title: string, blocks: { id: string; kind: string; name: string; body: string }[]): void
 run(
  source: string,
  datasets: Record<string, Dataset>,
  writeDataset: (name: string, data: Dataset) => void | Promise<void>,
  refresh: () => void | Promise<void>,
  kind: string,
 ): Promise<unknown>
}

interface StoredExample {
 crowns?: Record<string, unknown>
 scripts?: Record<string, unknown>
 languages?: Record<string, unknown>
 datasets?: Record<string, unknown>
}

const storagePrefix = "grone.example."

function column(name: string, type = "text") {
 return { name, type }
}

function datasetBody(columns: { name: string; type?: string }[], rows: unknown[][]) {
 return JSON.stringify({ columns, rows, sort: [], filters: [] })
}

function parseBody(body: string): Dataset {
 try {
  const parsed = JSON.parse(body) as Partial<Dataset>
  return {
   columns: Array.isArray(parsed.columns) ? parsed.columns : [],
   rows: Array.isArray(parsed.rows) ? parsed.rows : [],
   sort: Array.isArray(parsed.sort) ? parsed.sort : [],
   filters: Array.isArray(parsed.filters) ? parsed.filters : [],
  }
 } catch {
  return { columns: [], rows: [], sort: [], filters: [] }
 }
}

function isDataset(value: unknown): value is Dataset {
 if (!value || typeof value !== "object") {
  return false
 }
 const record = value as Dataset
 return Array.isArray(record.columns)
  && Array.isArray(record.rows)
  && Array.isArray(record.sort)
  && Array.isArray(record.filters)
}

const todoCrown = `set state [ object [
 draft ''
] ]
get datasets
at tasks
to data
get ui
at column
call
to page
set page style gap 'var(--dimension3)'
get ui
at row
call
to entry
get ui
at input
call '' [ function value [
 set state draft [ get value ]
] ]
to taskField
set taskField placeholder 'Add a task'
set taskField style width '16rem'
get ui
at append
call [ get entry ] [ get taskField ]
get ui
at button
call 'Add' [ function [
 get state
 at draft
 at trim
 call
 to title
 get title
 is ''
 false [
  get data
  at rows
  at push
  call [ list [ get title ] 'false' ]
  set state draft ''
  get writeDataset
  call tasks [ get data ]
  get refresh
  call
 ]
] ]
to addButton
get ui
at append
call [ get entry ] [ get addButton ]
get ui
at append
call [ get page ] [ get entry ]
get data
at rows
at length
is 0
true [
 get ui
 at notice
 call empty 'No tasks yet.'
 to emptyNote
 get ui
 at append
 call [ get page ] [ get emptyNote ]
]
get data
at rows
each [ function row index [
 get ui
 at row
 call
 to line
 get row
 at 1
 is 'true'
 to done
 get ui
 at check
 call [ get done ] [ function value [
  set row 1 [ get value ]
  get writeDataset
  call tasks [ get data ]
  get refresh
  call
 ] ]
 to box
 get ui
 at append
 call [ get line ] [ get box ]
 get ui
 at text
 call [ get row, at 0 ]
 to label
 get done
 true [
  set label style textDecoration 'line-through'
 ]
 get ui
 at append
 call [ get line ] [ get label ]
 get ui
 at button
 call 'Remove' [ function [
  get data
  at rows
  at splice
  call [ get index ] 1
  get writeDataset
  call tasks [ get data ]
  get refresh
  call
 ] ]
 to removeButton
 get ui
 at append
 call [ get line ] [ get removeButton ]
 get ui
 at append
 call [ get page ] [ get line ]
] ]
get page
`

const contactCrown = `set state [ object [
 selectedId ''
 selectedIndex -1
] ]
get datasets
at contacts
to data
get datasets
at selection
to selection
get selection
at rows
at 0
to selectionRow
get selectionRow
at 0
to selectedId
set state selectedId [ get selectedId ]
get data
at rows
each [ function row index [
 get row
 at 0
 is [ get state, at selectedId ]
 true [
  set state selectedIndex [ get index ]
 ]
] ]
get data
at rows
find [ function row [
 get row
 at 0
 is [ get state, at selectedId ]
] ]
to existing
get data
at rows
each [ function row [
 list [ get row, at 1 ] [ get row, at 2 ] [ get row, at 3 ]
] ]
to tableRows
function existing [
 set state draft [ object [
  name ''
  email ''
  phone ''
 ] ]
 get existing
 is undefined
 false [
  set state draft name [ get existing, at 1 ]
  set state draft email [ get existing, at 2 ]
  set state draft phone [ get existing, at 3 ]
 ]
 set state dialogTitle 'New contact'
 get existing
 is undefined
 false [
  set state dialogTitle 'Edit contact'
 ]
 get ui
 at dialog
 call [ get state, at dialogTitle ]
 to dialog
 get ui
 at field
 call 'Name' [ get state, at draft, at name ] [ function value [
  set state draft name [ get value ]
 ] ]
 to nameField
 get ui
 at append
 call [ get dialog, at panel ] [ get nameField ]
 get ui
 at field
 call 'Email' [ get state, at draft, at email ] [ function value [
  set state draft email [ get value ]
 ] ]
 to emailField
 get ui
 at append
 call [ get dialog, at panel ] [ get emailField ]
 get ui
 at field
 call 'Phone' [ get state, at draft, at phone ] [ function value [
  set state draft phone [ get value ]
 ] ]
 to phoneField
 get ui
 at append
 call [ get dialog, at panel ] [ get phoneField ]
 get ui
 at notice
 call error 'Name is required.'
 to error
 set error hidden true
 get ui
 at append
 call [ get dialog, at panel ] [ get error ]
 get ui
 at button
 call 'Save' [ function [
  get state
  at draft
  at name
  at trim
  call
  to name
  get state
  at draft
  at email
  at trim
  call
  to email
  get state
  at draft
  at phone
  at trim
  call
  to phone
  get name
  is ''
  true [
   set error hidden false
  ]
  false [
   get existing
   is undefined
   true [
    get starry
    at id
    call
    to created
    get data
    at rows
    at push
    call [ list [ get created ] [ get name ] [ get email ] [ get phone ] ]
    set selectionRow 0 [ get created ]
   ]
   false [
    set existing 1 [ get name ]
    set existing 2 [ get email ]
    set existing 3 [ get phone ]
    set selectionRow 0 [ get existing, at 0 ]
   ]
   get dialog
   at close
   call
   get writeDataset
   call contacts [ get data ]
   get writeDataset
   call selection [ get selection ]
   get refresh
   call
  ]
 ] ]
 to saveButton
 get ui
 at append
 call [ get dialog, at panel ] [ get saveButton ]
 get ui
 at button
 call 'Cancel' [ function [
  get dialog
  at close
  call
 ] ]
 to cancelButton
 get ui
 at append
 call [ get dialog, at panel ] [ get cancelButton ]
 get dialog
 at open
 call
]
to openContact
get ui
at column
call
to page
set page style gap 'var(--dimension3)'
get ui
at row
call
to bar
get ui
at button
call 'New contact' [ function [
 get openContact
 call
] ]
to newButton
get ui
at append
call [ get bar ] [ get newButton ]
get state
at selectedId
is ''
false [
 get ui
 at button
 call 'Edit' [ function [
  get openContact
  call [ get existing ]
 ] ]
 to editButton
 get ui
 at append
 call [ get bar ] [ get editButton ]
 get ui
 at button
 call 'Delete' [ function [
  set state keep [ list ]
  get data
  at rows
  each [ function row [
   get row
   at 0
   is [ get state, at selectedId ]
   false [
    get state
    at keep
    at push
    call [ get row ]
   ]
  ] ]
  set data rows [ get state, at keep ]
  set selectionRow 0 ''
  get writeDataset
  call contacts [ get data ]
  get writeDataset
  call selection [ get selection ]
  get refresh
  call
 ] ]
 to deleteButton
 get ui
 at append
 call [ get bar ] [ get deleteButton ]
]
get ui
at append
call [ get page ] [ get bar ]
get state
at selectedId
is ''
true [
 get ui
 at notice
 call info 'Select a row to edit or delete it.'
 to hint
 get ui
 at append
 call [ get page ] [ get hint ]
]
get ui
at table
call [ object [
 columns [ list [ object [
  name name
  type text
 ] ] [ object [
  name email
  type text
 ] ] [ object [
  name phone
  type text
 ] ] ]
 rows [ get tableRows ]
 selectedIndex [ get state, at selectedIndex ]
 onSelectRow [ function index [
  get data
  at rows
  at [ get index ]
  at 0
  to id
  get state
  at selectedId
  is [ get id ]
  false [
   set selectionRow 0 [ get id ]
   get writeDataset
   call selection [ get selection ]
   get refresh
   call
  ]
 ] ]
] ]
to grid
get ui
at append
call [ get page ] [ get grid ]
get page
`

const notesCrown = `set state [ object [
 selectedId ''
 nodes [ list ]
] ]
get datasets
at notes
to data
get datasets
at selection
to selection
get selection
at rows
at 0
to selectionRow
get selectionRow
at 0
to selectedId
set state selectedId [ get selectedId ]
get data
at rows
each [ function row [
 get row
 at 1
 to title
 set state label [ get title ]
 get title
 is ''
 true [
  set state label 'Untitled'
 ]
 get state
 at nodes
 at push
 call [ object [
  id [ get row, at 0 ]
  label [ get state, at label ]
 ] ]
] ]
get data
at rows
find [ function row [
 get row
 at 0
 is [ get state, at selectedId ]
] ]
to selected
get ui
at column
call
to page
set page style gap 'var(--dimension3)'
get ui
at row
call
to bar
get ui
at button
call 'New note' [ function [
 get starry
 at id
 call
 to noteId
 get data
 at rows
 at push
 call [ list [ get noteId ] 'Untitled' '' ]
 set selectionRow 0 [ get noteId ]
 get writeDataset
 call notes [ get data ]
 get writeDataset
 call selection [ get selection ]
 get refresh
 call
] ]
to newButton
get ui
at append
call [ get bar ] [ get newButton ]
get state
at selectedId
is ''
false [
 get ui
 at button
 call 'Delete note' [ function [
  set state keep [ list ]
  get data
  at rows
  each [ function row [
   get row
   at 0
   is [ get state, at selectedId ]
   false [
    get state
    at keep
    at push
    call [ get row ]
   ]
  ] ]
  set data rows [ get state, at keep ]
  get state
  at keep
  at length
  is 0
  true [
   set selectionRow 0 ''
  ]
  false [
   get state
   at keep
   at 0
   at 0
   to nextId
   set selectionRow 0 [ get nextId ]
  ]
  get writeDataset
  call notes [ get data ]
  get writeDataset
  call selection [ get selection ]
  get refresh
  call
 ] ]
 to deleteButton
 get ui
 at append
 call [ get bar ] [ get deleteButton ]
]
get ui
at append
call [ get page ] [ get bar ]
get ui
at split
call row 0.32
to panes
set panes element style flex '1'
set panes element style minHeight '16rem'
set panes end style display flex
set panes end style flexDirection column
set panes end style gap 'var(--dimension2)'
get ui
at tree
call [ get state, at nodes ] [ get state, at selectedId ] [ function id [
 get state
 at selectedId
 is [ get id ]
 false [
  set selectionRow 0 [ get id ]
  get writeDataset
  call selection [ get selection ]
  get refresh
  call
 ]
] ]
to noteTree
get ui
at append
call [ get panes, at start ] [ get noteTree ]
get selected
is undefined
true [
 get ui
 at notice
 call empty 'No notes yet.'
 to emptyNote
 get ui
 at append
 call [ get panes, at end ] [ get emptyNote ]
]
false [
 get ui
 at field
 call 'Title' [ get selected, at 1 ] [ function value [
  set selected 1 [ get value ]
  get writeDataset
  call notes [ get data ]
 ] ]
 to titleField
 get ui
 at append
 call [ get panes, at end ] [ get titleField ]
 get ui
 at code
 call [ get selected, at 2 ] [ function value [
  set selected 2 [ get value ]
  get writeDataset
  call notes [ get data ]
 ] ]
 to bodyField
 set bodyField style flex '1'
 set bodyField style minHeight '12rem'
 get ui
 at append
 call [ get panes, at end ] [ get bodyField ]
]
get ui
at append
call [ get page ] [ get panes, at element ]
get page
`

const settingsCrown = `set state [ object [
 comfortableLabel 'Comfortable'
 compactLabel 'Compact'
] ]
get datasets
at settings
to data
function key [
 get data
 at rows
 find [ function row [
  get row
  at 0
  is [ get key ]
 ] ]
]
to findRow
get findRow
call displayName
to nameRow
get findRow
call email
to emailRow
get findRow
call density
to densityRow
get findRow
call tips
to tipsRow
set state comfortableLabel 'Comfortable'
set state compactLabel 'Compact'
get densityRow
at 1
is comfortable
true [
 set state comfortableLabel 'Comfortable · on'
]
get densityRow
at 1
is compact
true [
 set state compactLabel 'Compact · on'
]
get tipsRow
at 1
is 'true'
to tipsOn
template 'Hello, %0' [ get nameRow, at 1 ]
to greetingText
get ui
at column
call
to page
set page style gap 'var(--dimension3)'
get ui
at heading
call [ get greetingText ]
to greeting
get ui
at append
call [ get page ] [ get greeting ]
get ui
at field
call 'Display name' [ get nameRow, at 1 ] [ function value [
 set nameRow 1 [ get value ]
 template 'Hello, %0' [ get value ]
 to nextGreeting
 set greeting textContent [ get nextGreeting ]
 get writeDataset
 call settings [ get data ]
] ]
to nameField
get ui
at append
call [ get page ] [ get nameField ]
get ui
at field
call 'Email' [ get emailRow, at 1 ] [ function value [
 set emailRow 1 [ get value ]
 get writeDataset
 call settings [ get data ]
] ]
to emailField
get ui
at append
call [ get page ] [ get emailField ]
get ui
at row
call
to densityLine
get ui
at text
call 'Density'
to densityLabel
get ui
at append
call [ get densityLine ] [ get densityLabel ]
get ui
at button
call [ get state, at comfortableLabel ] [ function [
 set densityRow 1 comfortable
 get writeDataset
 call settings [ get data ]
 get refresh
 call
] ]
to comfortableButton
get ui
at append
call [ get densityLine ] [ get comfortableButton ]
get ui
at button
call [ get state, at compactLabel ] [ function [
 set densityRow 1 compact
 get writeDataset
 call settings [ get data ]
 get refresh
 call
] ]
to compactButton
get ui
at append
call [ get densityLine ] [ get compactButton ]
get ui
at append
call [ get page ] [ get densityLine ]
get ui
at row
call
to tipsLine
get ui
at check
call [ get tipsOn ] [ function value [
 set tipsRow 1 [ get value ]
 get writeDataset
 call settings [ get data ]
 get refresh
 call
] ]
to tipsBox
get ui
at append
call [ get tipsLine ] [ get tipsBox ]
get ui
at text
call 'Show tips'
to tipsLabel
get ui
at append
call [ get tipsLine ] [ get tipsLabel ]
get ui
at append
call [ get page ] [ get tipsLine ]
get tipsOn
true [
 get ui
 at notice
 call info 'Tip: Reset data puts the sample preferences back.'
 to tip
 get ui
 at append
 call [ get page ] [ get tip ]
]
get ui
at notice
call info 'Edits are written back to the settings dataset.'
to stored
get ui
at append
call [ get page ] [ get stored ]
get page
`

const inventoryCrown = `set state [ object [
 columnIndex -1
] ]
get datasets
at stock
to data
get starry
at visibleRows
call [ get data ]
to shown
get ui
at column
call
to page
set page style gap 'var(--dimension3)'
get ui
at row
call
to bar
get ui
at button
call 'Add row' [ function [
 get data
 at rows
 at push
 call [ list 'New item' '' '0' '' ]
 get writeDataset
 call stock [ get data ]
 get refresh
 call
] ]
to addButton
get ui
at append
call [ get bar ] [ get addButton ]
get ui
at append
call [ get page ] [ get bar ]
get ui
at notice
call info 'Double-click a cell to edit it. Sort and filters stay on the stock dataset.'
to hint
get ui
at append
call [ get page ] [ get hint ]
get ui
at table
call [ object [
 columns [ get data, at columns ]
 rows [ get shown ]
 sort [ get data, at sort ]
 filters [ get data, at filters ]
 editable true
 onSort [ function sort [
  set data sort [ get sort ]
  get writeDataset
  call stock [ get data ]
  get refresh
  call
 ] ]
 onFilter [ function filters [
  set data filters [ get filters ]
  get writeDataset
  call stock [ get data ]
  get refresh
  call
 ] ]
 onCellEdit [ function rowIndex columnName value [
  get shown
  at [ get rowIndex ]
  to row
  get row
  is undefined
  false [
   set state columnIndex -1
   get data
   at columns
   each [ function column index [
    get column
    at name
    is [ get columnName ]
    true [
     set state columnIndex [ get index ]
    ]
   ] ]
   get state
   at columnIndex
   < 0
   false [
    set row [ get state, at columnIndex ] [ get value ]
    get writeDataset
    call stock [ get data ]
    get refresh
    call
   ]
  ]
 ] ]
] ]
to grid
get ui
at append
call [ get page ] [ get grid ]
get page
`

const todoScript = `const data = datasets.tasks
let draft = ""
const page = ui.column()
page.style.gap = "var(--dimension3)"
const entry = ui.row()
const taskField = ui.input("", (value) => {
 draft = String(value ?? "")
})
taskField.placeholder = "Add a task"
taskField.style.width = "16rem"
ui.append(entry, taskField)
ui.append(entry, ui.button("Add", () => {
 const title = draft.trim()
 if (title === "") {
  return
 }
 data.rows.push([title, "false"])
 draft = ""
 writeDataset("tasks", data)
 refresh()
}))
ui.append(page, entry)
if (data.rows.length === 0) {
 ui.append(page, ui.notice("empty", "No tasks yet."))
}
data.rows.forEach((row, index) => {
 const line = ui.row()
 const done = row[1] === "true"
 ui.append(line, ui.check(done, (value) => {
  row[1] = value
  writeDataset("tasks", data)
  refresh()
 }))
 const label = ui.text(String(row[0] ?? ""))
 if (done) {
  label.style.textDecoration = "line-through"
 }
 ui.append(line, label)
 ui.append(line, ui.button("Remove", () => {
  data.rows.splice(index, 1)
  writeDataset("tasks", data)
  refresh()
 }))
 ui.append(page, line)
})
return page
`

const contactScript = `const data = datasets.contacts
const selection = datasets.selection
const selectionRow = selection.rows[0]
const selectedId = selectionRow ? String(selectionRow[0] ?? "") : ""
let selectedIndex = -1
data.rows.forEach((row, index) => {
 if (String(row[0]) === selectedId) {
  selectedIndex = index
 }
})
const existing = data.rows.find((row) => String(row[0]) === selectedId)
const tableRows = data.rows.map((row) => [row[1], row[2], row[3]])
function openContact(current) {
 const draft = {
  name: current ? String(current[1] ?? "") : "",
  email: current ? String(current[2] ?? "") : "",
  phone: current ? String(current[3] ?? "") : "",
 }
 const dialog = ui.dialog(current ? "Edit contact" : "New contact")
 ui.append(dialog.panel, ui.field("Name", draft.name, (value) => {
  draft.name = String(value ?? "")
 }))
 ui.append(dialog.panel, ui.field("Email", draft.email, (value) => {
  draft.email = String(value ?? "")
 }))
 ui.append(dialog.panel, ui.field("Phone", draft.phone, (value) => {
  draft.phone = String(value ?? "")
 }))
 const error = ui.notice("error", "Name is required.")
 error.hidden = true
 ui.append(dialog.panel, error)
 ui.append(dialog.panel, ui.button("Save", () => {
  const name = draft.name.trim()
  const email = draft.email.trim()
  const phone = draft.phone.trim()
  if (name === "") {
   error.hidden = false
   return
  }
  if (!current) {
   const created = starry.id()
   data.rows.push([created, name, email, phone])
   selectionRow[0] = created
  } else {
   current[1] = name
   current[2] = email
   current[3] = phone
   selectionRow[0] = current[0]
  }
  dialog.close()
  writeDataset("contacts", data)
  writeDataset("selection", selection)
  refresh()
 }))
 ui.append(dialog.panel, ui.button("Cancel", () => {
  dialog.close()
 }))
 dialog.open()
}
const page = ui.column()
page.style.gap = "var(--dimension3)"
const bar = ui.row()
ui.append(bar, ui.button("New contact", () => {
 openContact(undefined)
}))
if (selectedId !== "") {
 ui.append(bar, ui.button("Edit", () => {
  openContact(existing)
 }))
 ui.append(bar, ui.button("Delete", () => {
  data.rows = data.rows.filter((row) => String(row[0]) !== selectedId)
  selectionRow[0] = ""
  writeDataset("contacts", data)
  writeDataset("selection", selection)
  refresh()
 }))
}
ui.append(page, bar)
if (selectedId === "") {
 ui.append(page, ui.notice("info", "Select a row to edit or delete it."))
}
ui.append(page, ui.table({
 columns: [
  { name: "name", type: "text" },
  { name: "email", type: "text" },
  { name: "phone", type: "text" },
 ],
 rows: tableRows,
 selectedIndex,
 onSelectRow(index) {
  const id = data.rows[index][0]
  if (selectedId !== String(id ?? "")) {
   selectionRow[0] = id
   writeDataset("selection", selection)
   refresh()
  }
 },
}))
return page
`

const notesScript = `const data = datasets.notes
const selection = datasets.selection
const selectionRow = selection.rows[0]
const selectedId = selectionRow ? String(selectionRow[0] ?? "") : ""
const nodes = data.rows.map((row) => ({
 id: row[0],
 label: String(row[1] ?? "") === "" ? "Untitled" : String(row[1]),
}))
const selected = data.rows.find((row) => String(row[0]) === selectedId)
const page = ui.column()
page.style.gap = "var(--dimension3)"
const bar = ui.row()
ui.append(bar, ui.button("New note", () => {
 const noteId = starry.id()
 data.rows.push([noteId, "Untitled", ""])
 selectionRow[0] = noteId
 writeDataset("notes", data)
 writeDataset("selection", selection)
 refresh()
}))
if (selectedId !== "") {
 ui.append(bar, ui.button("Delete note", () => {
  const keep = data.rows.filter((row) => String(row[0]) !== selectedId)
  data.rows = keep
  selectionRow[0] = keep.length === 0 ? "" : keep[0][0]
  writeDataset("notes", data)
  writeDataset("selection", selection)
  refresh()
 }))
}
ui.append(page, bar)
const panes = ui.split("row", 0.32)
panes.element.style.flex = "1"
panes.element.style.minHeight = "16rem"
panes.end.style.display = "flex"
panes.end.style.flexDirection = "column"
panes.end.style.gap = "var(--dimension2)"
ui.append(panes.start, ui.tree(nodes, selectedId, (id) => {
 if (selectedId !== String(id ?? "")) {
  selectionRow[0] = id
  writeDataset("selection", selection)
  refresh()
 }
}))
if (!selected) {
 ui.append(panes.end, ui.notice("empty", "No notes yet."))
} else {
 ui.append(panes.end, ui.field("Title", String(selected[1] ?? ""), (value) => {
  selected[1] = value
  writeDataset("notes", data)
 }))
 const bodyField = ui.code(String(selected[2] ?? ""), (value) => {
  selected[2] = value
  writeDataset("notes", data)
 })
 bodyField.style.flex = "1"
 bodyField.style.minHeight = "12rem"
 ui.append(panes.end, bodyField)
}
ui.append(page, panes.element)
return page
`

const settingsScript = `const data = datasets.settings
function findRow(key) {
 return data.rows.find((row) => row[0] === key)
}
const nameRow = findRow("displayName")
const emailRow = findRow("email")
const densityRow = findRow("density")
const tipsRow = findRow("tips")
const page = ui.column()
page.style.gap = "var(--dimension3)"
const greeting = ui.heading("Hello, " + nameRow[1])
ui.append(page, greeting)
ui.append(page, ui.field("Display name", String(nameRow[1] ?? ""), (value) => {
 nameRow[1] = value
 greeting.textContent = "Hello, " + value
 writeDataset("settings", data)
}))
ui.append(page, ui.field("Email", String(emailRow[1] ?? ""), (value) => {
 emailRow[1] = value
 writeDataset("settings", data)
}))
const densityLine = ui.row()
ui.append(densityLine, ui.text("Density"))
ui.append(densityLine, ui.button(densityRow[1] === "comfortable" ? "Comfortable · on" : "Comfortable", () => {
 densityRow[1] = "comfortable"
 writeDataset("settings", data)
 refresh()
}))
ui.append(densityLine, ui.button(densityRow[1] === "compact" ? "Compact · on" : "Compact", () => {
 densityRow[1] = "compact"
 writeDataset("settings", data)
 refresh()
}))
ui.append(page, densityLine)
const tipsLine = ui.row()
const tipsOn = tipsRow[1] === "true"
ui.append(tipsLine, ui.check(tipsOn, (value) => {
 tipsRow[1] = value
 writeDataset("settings", data)
 refresh()
}))
ui.append(tipsLine, ui.text("Show tips"))
ui.append(page, tipsLine)
if (tipsOn) {
 ui.append(page, ui.notice("info", "Tip: Reset data puts the sample preferences back."))
}
ui.append(page, ui.notice("info", "Edits are written back to the settings dataset."))
return page
`

const inventoryScript = `const data = datasets.stock
const shown = starry.visibleRows(data)
const page = ui.column()
page.style.gap = "var(--dimension3)"
const bar = ui.row()
ui.append(bar, ui.button("Add row", () => {
 data.rows.push(["New item", "", "0", ""])
 writeDataset("stock", data)
 refresh()
}))
ui.append(page, bar)
ui.append(page, ui.notice("info", "Double-click a cell to edit it. Sort and filters stay on the stock dataset."))
ui.append(page, ui.table({
 columns: data.columns,
 rows: shown,
 sort: data.sort,
 filters: data.filters,
 editable: true,
 onSort(sort) {
  data.sort = sort
  writeDataset("stock", data)
  refresh()
 },
 onFilter(filters) {
  data.filters = filters
  writeDataset("stock", data)
  refresh()
 },
 onCellEdit(rowIndex, columnName, value) {
  const row = shown[rowIndex]
  if (!row) {
   return
  }
  const columnIndex = data.columns.findIndex((column) => column.name === columnName)
  if (columnIndex < 0) {
   return
  }
  row[columnIndex] = value
  writeDataset("stock", data)
  refresh()
 },
}))
return page
`

const exampleCatalog: ExampleDef[] = [
 {
  id: "todos",
  title: "Todo list",
  summary: "A tasks dataset and a block that adds and checks rows.",
  blocks: [
   {
    kind: "markdown",
    name: "",
    body: "# Todo list\n\nThe tasks dataset holds the rows. Run the block to add tasks and check them off.",
   },
   {
    kind: "dataset",
    name: "tasks",
    body: datasetBody(
     [column("title"), column("done")],
     [
      ["Sketch the column layout", "false"],
      ["Try the filter dialog", "true"],
      ["File notes in the tray", "false"],
     ],
    ),
   },
   { kind: "crown", name: "view", body: todoCrown },
   { kind: "javascript", name: "view", body: todoScript },
  ],
 },
 {
  id: "contacts",
  title: "Contacts",
  summary: "A contacts dataset and a block for the table and edit form.",
  blocks: [
   {
    kind: "markdown",
    name: "",
    body: "# Contacts\n\nNames, email addresses, and phone numbers live in the contacts dataset. The selection dataset remembers the highlighted row.",
   },
   {
    kind: "dataset",
    name: "contacts",
    body: datasetBody(
     [column("id"), column("name"), column("email"), column("phone")],
     [
      ["c1", "Ada Lovelace", "ada@analytical.example", "555-0101"],
      ["c2", "Grace Hopper", "grace@navy.example", "555-0108"],
      ["c3", "Katherine Johnson", "katherine@nasa.example", "555-0192"],
     ],
    ),
   },
   {
    kind: "dataset",
    name: "selection",
    body: datasetBody([column("id")], [[""]]),
   },
   { kind: "crown", name: "view", body: contactCrown },
   { kind: "javascript", name: "view", body: contactScript },
  ],
 },
 {
  id: "notes",
  title: "Notes",
  summary: "A notes dataset and a block that picks a note and edits it.",
  blocks: [
   {
    kind: "markdown",
    name: "",
    body: "# Notes\n\nEach row is a note. The selection dataset stores which row is open.",
   },
   {
    kind: "dataset",
    name: "notes",
    body: datasetBody(
     [column("id"), column("title"), column("body")],
     [
      ["n1", "Welcome", "These rows live in the notes dataset.\n\nEdit the title and body. Reset data restores this sample."],
      ["n2", "Shopping", "Milk\nBread\nOranges"],
     ],
    ),
   },
   {
    kind: "dataset",
    name: "selection",
    body: datasetBody([column("id")], [["n1"]]),
   },
   { kind: "crown", name: "view", body: notesCrown },
   { kind: "javascript", name: "view", body: notesScript },
  ],
 },
 {
  id: "settings",
  title: "Settings",
  summary: "Key and value rows with a block that edits them.",
  blocks: [
   {
    kind: "markdown",
    name: "",
    body: "# Settings\n\nPreferences are key and value rows. The block edits display name, email, density, and tips.",
   },
   {
    kind: "dataset",
    name: "settings",
    body: datasetBody(
     [column("key"), column("value")],
     [
      ["displayName", "Ada"],
      ["email", "ada@analytical.example"],
      ["density", "comfortable"],
      ["tips", "true"],
     ],
    ),
   },
   { kind: "crown", name: "view", body: settingsCrown },
   { kind: "javascript", name: "view", body: settingsScript },
  ],
 },
 {
  id: "inventory",
  title: "Inventory",
  summary: "A stock dataset and a table block that sorts, filters, and edits.",
  blocks: [
   {
    kind: "markdown",
    name: "",
    body: "# Inventory\n\nThe stock dataset holds the rows, plus the table sort and filters. Run the block to edit them.",
   },
   {
    kind: "dataset",
    name: "stock",
    body: datasetBody(
     [column("item"), column("sku"), column("qty", "number"), column("bin")],
     [
      ["Notebook", "NB-1", "24", "A1"],
      ["Pencil", "PN-2", "120", "A1"],
      ["Tray", "TR-4", "8", "B3"],
      ["Frame", "FR-9", "15", "C2"],
     ],
    ),
   },
   { kind: "crown", name: "view", body: inventoryCrown },
   { kind: "javascript", name: "view", body: inventoryScript },
  ],
 },
]

function seedSession(example: ExampleDef): ExampleSession {
 const datasets: Record<string, Dataset> = {}
 let crownName = ""
 let crownSource = ""
 let scriptSource = ""
 for (const block of example.blocks) {
  if (block.kind === "dataset" && block.name) {
   datasets[block.name] = parseBody(block.body)
  }
  if (block.kind === "crown" && block.name && !crownName) {
   crownName = block.name
   crownSource = block.body
  }
 }
 for (const block of example.blocks) {
  if (block.kind === "javascript" && block.name === crownName) {
   scriptSource = block.body
  }
 }
 return {
  blocks: example.blocks,
  crownName,
  crownSource,
  scriptSource,
  language: "crown",
  datasets,
 }
}

export function exampleSeed(id: string) {
 const example = exampleCatalog.find((item) => item.id === id)
 return example ? seedSession(example) : null
}

function readStored(id: string): StoredExample | null {
 try {
  const raw = localStorage.getItem(storagePrefix + id)
  if (!raw) {
   return null
  }
  const parsed = JSON.parse(raw) as unknown
  if (!parsed || typeof parsed !== "object") {
   return null
  }
  return parsed as StoredExample
 } catch {
  return null
 }
}

function sessionFor(example: ExampleDef): ExampleSession {
 const session = seedSession(example)
 const stored = readStored(example.id)
 const crown = stored?.crowns?.[session.crownName]
 if (typeof crown === "string") {
  session.crownSource = crown
 }
 const script = stored?.scripts?.[session.crownName]
 if (typeof script === "string") {
  session.scriptSource = script
 }
 const language = stored?.languages?.[session.crownName]
 if (language === "crown" || language === "javascript") {
  session.language = language
 }
 const datasets = stored?.datasets
 if (datasets && typeof datasets === "object") {
  for (const name of Object.keys(session.datasets)) {
   const candidate = datasets[name]
   if (isDataset(candidate)) {
    session.datasets[name] = {
     columns: candidate.columns,
     rows: candidate.rows,
     sort: candidate.sort,
     filters: candidate.filters,
    }
   }
  }
 }
 return session
}

function persist(example: ExampleDef, session: ExampleSession) {
 try {
  localStorage.setItem(storagePrefix + example.id, JSON.stringify({
   crowns: { [session.crownName]: session.crownSource },
   scripts: { [session.crownName]: session.scriptSource },
   languages: { [session.crownName]: session.language },
   datasets: session.datasets,
  }))
 } catch {
  // The preview still runs when storage is blocked.
 }
}

function forget(example: ExampleDef) {
 try {
  localStorage.removeItem(storagePrefix + example.id)
 } catch {
  // The next paint still reloads the seed.
 }
}

function materialize(session: ExampleSession) {
 const blocks: { id: string; kind: string; name: string; body: string }[] = []
 for (const block of session.blocks) {
  if (block.name === session.crownName && (block.kind === "crown" || block.kind === "javascript")) {
   if (block.kind !== session.language) {
    continue
   }
  }
  let body = block.body
  if (block.kind === "dataset" && session.datasets[block.name]) {
   body = JSON.stringify(session.datasets[block.name])
  }
  if (block.kind === "crown" && block.name === session.crownName) {
   body = session.crownSource
  }
  if (block.kind === "javascript" && block.name === session.crownName) {
   body = session.scriptSource
  }
  blocks.push({
   id: crypto.randomUUID(),
   kind: block.kind,
   name: block.name,
   body,
  })
 }
 return blocks
}

function pageColumn(ui: ExamplesUi) {
 const page = ui.column()
 page.style.padding = "var(--dimension3)"
 page.style.gap = "var(--dimension3)"
 page.style.minHeight = "0"
 page.style.overflow = "auto"
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
 return bar
}

function dismissExampleDialog() {
 document.querySelectorAll("[data-example-dialog]").forEach((node) => node.remove())
}

function paintList(page: HTMLElement, ui: ExamplesUi, actions: ExampleActions, runtime: ExampleRuntime) {
 chrome(page, ui, actions, "Examples")
 page.append(ui.notice(
  "info",
  "Open an example to run its block against the sample rows. Import as Note saves that source and those rows into the selected database. Reset data restores the original sample.",
 ))
 for (const example of exampleCatalog) {
  const card = ui.frame()
  card.style.height = "auto"
  card.style.marginBottom = "0"
  card.style.padding = "var(--dimension3)"
  const summary = ui.text(example.summary)
  summary.style.display = "block"
  summary.style.margin = "var(--dimension2) 0"
  const links = ui.row()
  const open = ui.button("Open", () => actions.open(example.id))
  open.setAttribute("data-demo", example.id)
  const importNote = ui.button("Import as Note", () => {
   runtime.importExample(example.title, materialize(sessionFor(example)))
  })
  importNote.setAttribute("data-import", example.id)
  links.append(open, importNote)
  card.append(ui.heading(example.title), summary, links)
  page.append(card)
 }
}

function paintPreview(
 page: HTMLElement,
 ui: ExamplesUi,
 actions: ExampleActions,
 runtime: ExampleRuntime,
 example: ExampleDef,
) {
 const session = sessionFor(example)
 let tail = Promise.resolve()
 const host = ui.column()
 host.setAttribute("data-preview", example.id)
 host.style.minHeight = "12rem"
 function writeDataset(name: string, data: Dataset) {
  if (!session.datasets[name]) {
   return
  }
  session.datasets[name] = data
  persist(example, session)
 }
 function activeSource() {
  return session.language === "javascript" ? session.scriptSource : session.crownSource
 }
 function runPreview() {
  const job = tail.then(async () => {
   try {
    const output = await runtime.run(activeSource(), session.datasets, writeDataset, () => runPreview(), session.language)
    host.replaceChildren()
    if (output instanceof HTMLElement) {
     host.append(output)
     return
    }
    host.append(ui.notice("info", output == null ? "The block returned nothing." : String(output)))
   } catch (error) {
    host.replaceChildren()
    const message = error instanceof Error ? error.message : String(error)
    host.append(ui.notice("error", message))
   }
  })
  tail = job.then(() => undefined, () => undefined)
  return job
 }
 page.replaceChildren()
 const bar = chrome(page, ui, actions, example.title, {
  back: true,
  reset() {
   forget(example)
   paintPreview(page, ui, actions, runtime, example)
  },
 })
 const importNote = ui.button("Import as Note", () => {
  runtime.importExample(example.title, materialize(session))
 })
 importNote.setAttribute("data-import", example.id)
 bar.append(importNote)
 const run = ui.button("Run", () => {
  void runPreview()
 })
 run.setAttribute("data-run", example.id)
 run.style.alignSelf = "flex-start"
 const hint = ui.text("Ctrl+Enter runs the Crown. Import as Note saves this source and the current rows.")
 hint.style.display = "block"
 const editor = ui.code(activeSource(), (value) => {
  const text = String(value ?? "")
  if (session.language === "javascript") {
   session.scriptSource = text
  } else {
   session.crownSource = text
  }
  persist(example, session)
 }, () => {
  void runPreview()
 })
 editor.setAttribute("data-crown", example.id)
 editor.style.minHeight = "14rem"
 editor.style.width = "100%"
 const language = ui.choice(session.language, [
  { value: "crown", label: "Crown" },
  { value: "javascript", label: "JavaScript" },
 ], (value: string) => {
  session.language = value === "javascript" ? "javascript" : "crown"
  editor.value = activeSource()
  persist(example, session)
  void runPreview()
 })
 language.setAttribute("data-language", example.id)
 language.setAttribute("aria-label", "Block language")
 language.style.alignSelf = "flex-start"
 page.append(run, hint, language, editor, ui.heading("Preview"), host)
 void runPreview()
}

export function paintExamples(
 container: HTMLElement,
 ui: ExamplesUi,
 actions: ExampleActions,
 activeId: string,
 runtime: ExampleRuntime,
) {
 dismissExampleDialog()
 container.replaceChildren()
 container.setAttribute("data-screen", "examples")
 const example = exampleCatalog.find((item) => item.id === activeId)
 container.setAttribute("data-demo", example ? example.id : "list")
 const page = pageColumn(ui)
 container.append(page)
 if (!example) {
  paintList(page, ui, actions, runtime)
  return
 }
 paintPreview(page, ui, actions, runtime, example)
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
  ui.markdown("Tables shows the tables in the selected database. Browse rows, sort and filter, and run SQL."),
  ui.markdown("Notes live in the selected database. A note mixes markdown with SQL, Crown, and JavaScript blocks that pass datasets along a pipeline."),
  ui.markdown("Examples are Grone notes you can preview here or import. Each one is a sample dataset plus Crown or JavaScript that builds the interface."),
 )
 const links = ui.row()
 links.append(
  ui.button("Tables", actions.databases),
  ui.button("Notes", actions.notes),
  ui.button("Examples", actions.examples),
 )
 page.append(links)
 container.append(page)
}
