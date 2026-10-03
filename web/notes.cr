function [
 get ui
 at clear
 call [ get shell, at main ]
 get state
 at connectionId
 is ''
 true [
  get ui
  at notice
  call empty 'Select or create a database before opening notes.'
  to emptyState
  get ui
  at append
  call [ get shell, at main ] [ get emptyState ]
 ]
 false [
  get starry
  at api
  call 'notes/ensure' [ object [
   connectionId [ get state, at connectionId ]
  ] ]
  get loadNotes
  call
  get ui
  at split
  call row 0.28
  to panes
  get ui
  at append
  call [ get shell, at main ] [ get panes, at element ]
  set state noteListPane [ get panes, at start ]
  set state notePane [ get panes, at end ]
  get paintList
  call
  get paintNote
  call
 ]
]
to renderNotes

function [
 get starry
 at api
 call 'notes/list' [ object [
  connectionId [ get state, at connectionId ]
 ] ]
 at notes
 to listed
 set state notes [ get listed ]
]
to loadNotes

function [
 get ui
 at clear
 call [ get state, at noteListPane ]
 get ui
 at row
 call
 to bar
 get ui
 at button
 call 'New note' [ function [
  get newNote
  call
 ] ]
 to newButton
 get ui
 at append
 call [ get bar ] [ get newButton ]
 get ui
 at button
 call Pipeline [ function [
  get newPipeline
  call
 ] ]
 to pipelineButton
 get ui
 at append
 call [ get bar ] [ get pipelineButton ]
 get ui
 at append
 call [ get state, at noteListPane ] [ get bar ]
 get starry
 at noteNodes
 call [ get state, at notes ]
 to nodes
 set state selected ''
 get state
 at note
 is null
 false [
  get state
  at note
  at id
  to selectedId
  set state selected [ get selectedId ]
 ]
 get ui
 at tree
 call [ get nodes ] [ get state, at selected ] [ function id [
  get openNote
  call [ get id ]
 ] ]
 to noteTree
 get ui
 at append
 call [ get state, at noteListPane ] [ get noteTree ]
]
to paintList

function id [
 get starry
 at api
 call 'notes/get' [ object [
  connectionId [ get state, at connectionId ]
  id [ get id ]
 ] ]
 at note
 to loaded
 set state note [ get loaded ]
 get paintList
 call
 get paintNote
 call
]
to openNote

function [
 get starry
 at api
 call 'notes/save' [ object [
  connectionId [ get state, at connectionId ]
  note [ get state, at note ]
 ] ]
 at note
 to saved
 set state note [ get saved ]
 get loadNotes
 call
]
to saveNote

function [
 get starry
 at id
 call
 to noteId
 get starry
 at blankBlock
 call markdown
 to block
 set state note [ object [
  id [ get noteId ]
  title 'Untitled'
  blocks [ list [ get block ] ]
 ] ]
 get saveNote
 call
 get paintList
 call
 get paintNote
 call
]
to newNote

function [
 get starry
 at id
 call
 to noteId
 get starry
 at pipelineBlocks
 call
 to blocks
 set state note [ object [
  id [ get noteId ]
  title Pipeline
  blocks [ get blocks ]
 ] ]
 get saveNote
 call
 get paintList
 call
 get paintNote
 call
]
to newPipeline

function [
 get ui
 at clear
 call [ get state, at notePane ]
 get state
 at note
 is null
 true [
  get ui
  at notice
  call empty 'Select a note, or start a pipeline.'
  to emptyNote
  get ui
  at append
  call [ get state, at notePane ] [ get emptyNote ]
 ]
 false [
  get ui
  at row
  call
  to titleRow
  get ui
  at field
  call Title [ get state, at note, at title ] [ function value [
   set state note title [ get value ]
  ] ]
  to titleField
  get ui
  at append
  call [ get titleRow ] [ get titleField ]
  get ui
  at button
  call Save [ function [
   get saveNote
   call
   get paintList
   call
  ] ]
  to saveButton
  get ui
  at append
  call [ get titleRow ] [ get saveButton ]
  get ui
  at button
  call 'Run from start' [ function [
   get pipeline
   at runFrom
   call 0
  ] ]
  to runAll
  get ui
  at append
  call [ get titleRow ] [ get runAll ]
  get ui
  at button
  call Delete [ function [
   get deleteNote
   call
  ] ]
  to deleteButton
  get ui
  at append
  call [ get titleRow ] [ get deleteButton ]
  get ui
  at append
  call [ get state, at notePane ] [ get titleRow ]
  get state
  at note
  at blocks
  each [ function block index [
   get paintOne
   call [ get block ] [ get index ]
  ] ]
  get inserter
  call [ get state, at note, at blocks, at length ]
 ]
]
to paintNote

function [
 get starry
 at api
 call 'notes/delete' [ object [
  connectionId [ get state, at connectionId ]
  id [ get state, at note, at id ]
 ] ]
 set state note null
 get loadNotes
 call
 get paintList
 call
 get paintNote
 call
]
to deleteNote

function block index [
 get inserter
 call [ get index ]
 get ui
 at frame
 call
 to card
 get ui
 at row
 call
 to bar
 get ui
 at text
 call [ get block, at kind ]
 to kindLabel
 get ui
 at append
 call [ get bar ] [ get kindLabel ]
 get ui
 at input
 call [ get block, at name ] [ function value [
  set block name [ get value ]
 ] ]
 to nameInput
 get ui
 at append
 call [ get bar ] [ get nameInput ]
 get ui
 at button
 call Up [ function [
  get move
  call [ get index ] -1
 ] ]
 to upButton
 get ui
 at append
 call [ get bar ] [ get upButton ]
 get ui
 at button
 call Down [ function [
  get move
  call [ get index ] 1
 ] ]
 to downButton
 get ui
 at append
 call [ get bar ] [ get downButton ]
 get ui
 at button
 call Run [ function [
  get pipeline
  at runOne
  call [ get index ]
 ] ]
 to runButton
 get ui
 at append
 call [ get bar ] [ get runButton ]
 get ui
 at button
 call 'Run from here' [ function [
  get pipeline
  at runFrom
  call [ get index ]
 ] ]
 to fromButton
 get ui
 at append
 call [ get bar ] [ get fromButton ]
 get ui
 at button
 call Remove [ function [
  get drop
  call [ get index ]
 ] ]
 to removeButton
 get ui
 at append
 call [ get bar ] [ get removeButton ]
 get ui
 at append
 call [ get card ] [ get bar ]
 get block
 at kind
 to kind
 get kind
 is markdown
 true [
  get ui
  at markdown
  call [ get block, at body ]
  to preview
  get ui
  at append
  call [ get card ] [ get preview ]
 ]
 get kind
 is dataset
 true [
  get paintDataset
  call [ get card ] [ get block ] [ get index ]
 ]
 false [
  get kind
  is markdown
  true [
   get ui
   at code
   call [ get block, at body ] [ function value [
    set block body [ get value ]
   ] ]
   to editor
   get ui
   at append
   call [ get card ] [ get editor ]
  ]
  false [
   get kind
   is dataset
   false [
    get ui
    at code
    call [ get block, at body ] [ function value [
     set block body [ get value ]
    ] ] [ function [
     get pipeline
     at runOne
     call [ get index ]
    ] ]
    to editor
    get ui
    at append
    call [ get card ] [ get editor ]
   ]
  ]
 ]
 get paintOutput
 call [ get card ] [ get block ] [ get index ]
 get ui
 at append
 call [ get state, at notePane ] [ get card ]
]
to paintOne

function card block index [
 get starry
 at parseDataset
 call [ get block, at body ]
 to data
 get ui
 at button
 call Refresh [ function [
  get pipeline
  at runOne
  call [ get index ]
 ] ]
 to refreshButton
 get ui
 at append
 call [ get card ] [ get refreshButton ]
 get starry
 at visibleRows
 call [ get data ]
 to rows
 get ui
 at table
 call [ object [
  columns [ get data, at columns ]
  rows [ get rows ]
  sort [ get data, at sort ]
  filters [ get data, at filters ]
  editable false
  onSort [ function sort [
   get sortDataset
   call [ get index ] [ get sort ]
  ] ]
  onFilter [ function filters [
   get filterDataset
   call [ get index ] [ get filters ]
  ] ]
 ] ]
 to grid
 get ui
 at append
 call [ get card ] [ get grid ]
]
to paintDataset

function index sort [
 get state
 at note
 at blocks
 at [ get index ]
 to block
 get starry
 at parseDataset
 call [ get block, at body ]
 to data
 set data sort [ get sort ]
 get starry
 at stringifyDataset
 call [ get data ]
 to body
 set block body [ get body ]
 get saveNote
 call
 get paintNote
 call
]
to sortDataset

function index filters [
 get state
 at note
 at blocks
 at [ get index ]
 to block
 get starry
 at parseDataset
 call [ get block, at body ]
 to data
 set data filters [ get filters ]
 get starry
 at stringifyDataset
 call [ get data ]
 to body
 set block body [ get body ]
 get saveNote
 call
 get paintNote
 call
]
to filterDataset

function card block index [
 get block
 at output
 to output
 get output
 is undefined
 true [
 ]
 false [
 get output
 is null
 false [
  get starry
  at asDataset
  call [ get output ]
  to data
  get data
  is null
  true [
   get starry
   at outputText
   call [ get output ]
   to text
   get ui
   at notice
   call info [ get text ]
   to textOut
   get ui
   at append
   call [ get card ] [ get textOut ]
   get ui
   at button
   call 'Use as SQL' [ function [
    get pipeline
    at useSql
    call [ get index ]
   ] ]
   to useButton
   get ui
   at append
   call [ get card ] [ get useButton ]
  ]
  false [
   get ui
   at table
   call [ object [
    columns [ get data, at columns ]
    rows [ get data, at rows ]
    editable false
   ] ]
   to resultTable
   get ui
   at append
   call [ get card ] [ get resultTable ]
   get ui
   at button
   call 'Save as dataset' [ function [
    get pipeline
    at saveOutput
    call [ get index ]
   ] ]
   to saveButton
   get ui
   at append
   call [ get card ] [ get saveButton ]
  ]
 ]
 ]
]
to paintOutput

function index [
 get ui
 at row
 call
 to bar
 get ui
 at text
 call Add
 to label
 get ui
 at append
 call [ get bar ] [ get label ]
 get ui
 at button
 call Markdown [ function [
  get addKind
  call [ get index ] markdown
 ] ]
 to markdownButton
 get ui
 at append
 call [ get bar ] [ get markdownButton ]
 get ui
 at button
 call Crown [ function [
  get addKind
  call [ get index ] crown
 ] ]
 to crownButton
 get ui
 at append
 call [ get bar ] [ get crownButton ]
 get ui
 at button
 call JavaScript [ function [
  get addKind
  call [ get index ] javascript
 ] ]
 to jsButton
 get ui
 at append
 call [ get bar ] [ get jsButton ]
 get ui
 at button
 call SQL [ function [
  get addKind
  call [ get index ] sql
 ] ]
 to sqlButton
 get ui
 at append
 call [ get bar ] [ get sqlButton ]
 get ui
 at button
 call Dataset [ function [
  get addKind
  call [ get index ] dataset
 ] ]
 to datasetButton
 get ui
 at append
 call [ get bar ] [ get datasetButton ]
 get ui
 at append
 call [ get state, at notePane ] [ get bar ]
]
to inserter

function index kind [
 get starry
 at blankBlock
 call [ get kind ]
 to block
 get starry
 at insertBlock
 call [ get state, at note, at blocks ] [ get index ] [ get block ]
 to blocks
 set state note blocks [ get blocks ]
 get paintNote
 call
]
to addKind

function index delta [
 get starry
 at moveBlock
 call [ get state, at note, at blocks ] [ get index ] [ get delta ]
 to blocks
 set state note blocks [ get blocks ]
 get paintNote
 call
]
to move

function index [
 get starry
 at removeBlock
 call [ get state, at note, at blocks ] [ get index ]
 to blocks
 set state note blocks [ get blocks ]
 get paintNote
 call
]
to drop

object [
 render [ get renderNotes ]
 paintNote [ get paintNote ]
 saveNote [ get saveNote ]
]
