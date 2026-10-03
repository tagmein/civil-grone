// Preview edits live in localStorage. Import saves that Crown source and the current rows as a note.

export interface ExamplesUi {
 append(parent: HTMLElement, child: HTMLElement): HTMLElement
 button(label: string, onClick?: unknown): HTMLElement
 check(checked: boolean, onChange?: unknown): HTMLElement
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
 datasets: Record<string, Dataset>
}

export interface ExampleRuntime {
 importExample(title: string, blocks: { id: string; kind: string; name: string; body: string }[]): void
 run(
  source: string,
  datasets: Record<string, Dataset>,
  writeDataset: (name: string, data: Dataset) => void | Promise<void>,
  refresh: () => void | Promise<void>,
 ): Promise<unknown>
}

interface StoredExample {
 crowns?: Record<string, unknown>
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

const exampleCatalog: ExampleDef[] = [
 {
  id: "todos",
  title: "Todo list",
  summary: "A tasks dataset and Crown that adds and checks rows.",
  blocks: [
   {
    kind: "markdown",
    name: "",
    body: "# Todo list\n\nThe tasks dataset holds the rows. Run the Crown block to add tasks and check them off.",
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
  ],
 },
 {
  id: "contacts",
  title: "Contacts",
  summary: "A contacts dataset and Crown for the table and edit form.",
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
  ],
 },
 {
  id: "notes",
  title: "Notes",
  summary: "A notes dataset and Crown that picks a note and edits it.",
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
  ],
 },
 {
  id: "settings",
  title: "Settings",
  summary: "Key and value rows with Crown that edits them.",
  blocks: [
   {
    kind: "markdown",
    name: "",
    body: "# Settings\n\nPreferences are key and value rows. The Crown block edits display name, email, density, and tips.",
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
  ],
 },
 {
  id: "inventory",
  title: "Inventory",
  summary: "A stock dataset and Crown table that sorts, filters, and edits.",
  blocks: [
   {
    kind: "markdown",
    name: "",
    body: "# Inventory\n\nThe stock dataset holds the rows, plus the table sort and filters. Run the Crown block to edit them.",
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
  ],
 },
]

function seedSession(example: ExampleDef): ExampleSession {
 const datasets: Record<string, Dataset> = {}
 let crownName = ""
 let crownSource = ""
 for (const block of example.blocks) {
  if (block.kind === "dataset" && block.name) {
   datasets[block.name] = parseBody(block.body)
  }
  if (block.kind === "crown" && block.name && !crownName) {
   crownName = block.name
   crownSource = block.body
  }
 }
 return {
  blocks: example.blocks,
  crownName,
  crownSource,
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
 return session.blocks.map((block) => {
  let body = block.body
  if (block.kind === "dataset" && session.datasets[block.name]) {
   body = JSON.stringify(session.datasets[block.name])
  }
  if (block.kind === "crown" && block.name === session.crownName) {
   body = session.crownSource
  }
  return {
   id: crypto.randomUUID(),
   kind: block.kind,
   name: block.name,
   body,
  }
 })
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
  "Open an example to run its Crown against the sample rows. Import as Note saves the Crown and those rows into the selected database. Reset data restores the original sample.",
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
 function runPreview() {
  const job = tail.then(async () => {
   try {
    const output = await runtime.run(session.crownSource, session.datasets, writeDataset, () => runPreview())
    host.replaceChildren()
    if (output instanceof HTMLElement) {
     host.append(output)
     return
    }
    host.append(ui.notice("info", output == null ? "Crown returned nothing." : String(output)))
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
 const run = ui.button("Run", () => {
  void runPreview()
 })
 run.setAttribute("data-run", example.id)
 const importNote = ui.button("Import as Note", () => {
  runtime.importExample(example.title, materialize(session))
 })
 importNote.setAttribute("data-import", example.id)
 bar.append(run, importNote)
 const hint = ui.text("Ctrl+Enter runs the Crown. Import as Note saves this source and the current rows.")
 hint.style.display = "block"
 const editor = ui.code(session.crownSource, (value) => {
  session.crownSource = String(value ?? "")
  persist(example, session)
 }, () => {
  void runPreview()
 })
 editor.setAttribute("data-crown", example.id)
 editor.style.minHeight = "14rem"
 editor.style.width = "100%"
 page.append(hint, editor, ui.heading("Preview"), host)
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
  ui.markdown("Databases opens a SQLite file on this machine or connects a Turso database. Browse tables, sort and filter rows, and run SQL."),
  ui.markdown("Notes live in the selected database. A note mixes markdown with SQL, Crown, and JavaScript blocks that pass datasets along a pipeline."),
  ui.markdown("Examples are Grone notes you can preview here or import. Each one is a sample dataset plus Crown that builds the interface."),
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
