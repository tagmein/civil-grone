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
  get chooseTemplate
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
 get starry
 at sampleForNote
 call [ get loaded ]
 to sample
 get sample
 is null
 false [
  get offerSample
  call [ get sample ]
 ]
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
 get ui
 at dialog
 call 'New pipeline'
 to picker
 get ui
 at notice
 call info 'Choose a template. Sample templates can import their tables into this database.'
 to intro
 get ui
 at append
 call [ get picker, at panel ] [ get intro ]
 get starry
 at pipelineTemplates
 call
 each [ function template [
  get ui
  at column
  call
  to choice
  get ui
  at button
  call [ get template, at title ] [ function [
   get picker
   at close
   call
   get createFromTemplate
   call [ get template ]
  ] ]
  to choiceButton
  get ui
  at append
  call [ get choice ] [ get choiceButton ]
  get ui
  at text
  call [ get template, at detail ]
  to detailText
  get ui
  at append
  call [ get choice ] [ get detailText ]
  get ui
  at append
  call [ get picker, at panel ] [ get choice ]
 ] ]
 get picker
 at open
 call
]
to chooseTemplate

function template [
 get starry
 at id
 call
 to noteId
 get template
 at blocks
 call
 to blocks
 get template
 at title
 to title
 set state note [ object [
  id [ get noteId ]
  title [ get title ]
  blocks [ get blocks ]
 ] ]
 get saveNote
 call
 get paintList
 call
 get paintNote
 call
 get template
 at sampleSql
 to sampleSql
 get sampleSql
 is ''
 false [
  get offerSample
  call [ get template ]
 ]
]
to createFromTemplate

function template [
 get starry
 at api
 call 'databases/schema' [ object [
  connectionId [ get state, at connectionId ]
 ] ]
 at tables
 to tables
 get starry
 at sampleReady
 call [ get tables ] [ get template ]
 to ready
 get ready
 is true
 false [
  get ui
  at dialog
  call 'Import sample data'
  to importer
  get ui
  at notice
  call info 'This sample queries tables that are not in the current database. Import the sample rows before running the pipeline.'
  to warning
  get ui
  at append
  call [ get importer, at panel ] [ get warning ]
  get ui
  at button
  call 'Import sample' [ function [
   get starry
   at api
   call 'databases/query' [ object [
    connectionId [ get state, at connectionId ]
    sql [ get template, at sampleSql ]
   ] ]
   get importer
   at close
   call
   get shell
   at setStatus
   call 'Sample tables imported. Run the pipeline again.' info
  ] ]
  to importButton
  get ui
  at append
  call [ get importer, at panel ] [ get importButton ]
  get ui
  at button
  call 'Not now' [ function [
   get importer
   at close
   call
  ] ]
  to laterButton
  get ui
  at append
  call [ get importer, at panel ] [ get laterButton ]
  get importer
  at open
  call
 ]
]
to offerSample

function [
 get syncStepErrors
 call
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
 at stepBar
 call
 to bar
 get ui
 at pillar
 call
 to marker
 get ui
 at append
 call [ get bar ] [ get marker ]
 get ui
 at stepTools
 call
 to tools
 get ui
 at text
 call [ get block, at kind ]
 to kindLabel
 get ui
 at append
 call [ get tools ] [ get kindLabel ]
 get ui
 at nameInput
 call [ get block, at name ] [ function value [
  set block name [ get value ]
 ] ]
 to nameInput
 get ui
 at append
 call [ get tools ] [ get nameInput ]
 get ui
 at button
 call Up [ function [
  get move
  call [ get index ] -1
 ] ]
 to upButton
 get ui
 at append
 call [ get tools ] [ get upButton ]
 get ui
 at button
 call Down [ function [
  get move
  call [ get index ] 1
 ] ]
 to downButton
 get ui
 at append
 call [ get tools ] [ get downButton ]
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
 call [ get tools ] [ get runButton ]
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
 call [ get tools ] [ get fromButton ]
 get ui
 at button
 call Remove [ function [
  get drop
  call [ get index ]
 ] ]
 to removeButton
 get ui
 at append
 call [ get tools ] [ get removeButton ]
 get ui
 at append
 call [ get bar ] [ get tools ]
 get ui
 at append
 call [ get card ] [ get bar ]
 get state
 at stepErrors
 at [ get block, at id ]
 to stepMessage
 get stepMessage
 is undefined
 false [
  get ui
  at stepError
  call [ get block, at id ] [ get stepMessage ]
  to stepNotice
  get ui
  at append
  call [ get card ] [ get stepNotice ]
 ]
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
    get editBody
    call [ get block ] [ get value ]
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
     get editBody
     call [ get block ] [ get value ]
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
 get clearStepError
 call [ get block ]
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
 get clearStepError
 call [ get block ]
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
 at button
 call Add
 to addButton
 get ui
 at menu
 call [ get addButton ] [ list [ object [
  label Markdown
  action [ function [
   get addKind
   call [ get index ] markdown
  ] ]
 ] ] [ object [
  label Crown
  action [ function [
   get addKind
   call [ get index ] crown
  ] ]
 ] ] [ object [
  label JavaScript
  action [ function [
   get addKind
   call [ get index ] javascript
  ] ]
 ] ] [ object [
  label SQL
  action [ function [
   get addKind
   call [ get index ] sql
  ] ]
 ] ] [ object [
  label Dataset
  action [ function [
   get addKind
   call [ get index ] dataset
  ] ]
 ] ] ]
 get ui
 at append
 call [ get bar ] [ get addButton ]
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
 get state
 at note
 at blocks
 at [ get index ]
 to block
 get clearStepError
 call [ get block ]
 get starry
 at removeBlock
 call [ get state, at note, at blocks ] [ get index ]
 to blocks
 set state note blocks [ get blocks ]
 get paintNote
 call
]
to drop

function block value [
 set block body [ get value ]
 get clearStepError
 call [ get block ]
]
to editBody

function block message [
 set state stepErrors [ get block, at id ] [ get message ]
 set state stepErrorBanner [ get block, at id ]
 get shell
 at setStatus
 call [ get message ] error
]
to showStepError

function block [
 get state
 at stepErrors
 at [ get block, at id ]
 to prior
 get prior
 is undefined
 false [
  unset state stepErrors [ get block, at id ]
  get starry
  at hideStepError
  call [ get block, at id ]
  get state
  at stepErrorBanner
  is [ get block, at id ]
  true [
   set state stepErrorBanner ''
   get shell
   at setStatus
   call '' info
  ]
 ]
]
to clearStepError

function [
 get starry
 at retainStepErrors
 call [ get state, at stepErrors ] [ get state, at note ] [ get state, at stepErrorBanner ]
 to kept
 set state stepErrors [ get kept, at errors ]
 get kept
 at bannerId
 to nextBanner
 get nextBanner
 is [ get state, at stepErrorBanner ]
 false [
  set state stepErrorBanner [ get nextBanner ]
  get shell
  at setStatus
  call '' info
 ]
]
to syncStepErrors

object [
 render [ get renderNotes ]
 paintNote [ get paintNote ]
 saveNote [ get saveNote ]
 clearStepError [ get clearStepError ]
 showStepError [ get showStepError ]
]
