function [
 get ui
 at clear
 call [ get shell, at main ]
 get state
 at connections
 at length
 is 0
 true [
  get ui
  at notice
  call empty 'Create a local SQLite database to open tables and notes.'
  to emptyState
  get ui
  at append
  call [ get shell, at main ] [ get emptyState ]
 ]
 false [
  get buildBrowser
  call
 ]
]
to renderDatabases

function [
 get ui
 at split
 call column 0.62
 to vertical
 get ui
 at split
 call row 0.24
 to horizontal
 get ui
 at append
 call [ get vertical, at start ] [ get horizontal, at element ]
 get ui
 at append
 call [ get shell, at main ] [ get vertical, at element ]
 set state navPane [ get horizontal, at start ]
 set state gridPane [ get horizontal, at end ]
 set state sqlPane [ get vertical, at end ]
 get ui
 at column
 call
 to sqlColumn
 get ui
 at row
 call
 to sqlBar
 get ui
 at button
 call Run [ function [
  get runSql
  call
 ] ]
 to runButton
 get ui
 at append
 call [ get sqlBar ] [ get runButton ]
 get ui
 at button
 call 'Pin to note' [ function [
  get pinGrid
  call
 ] ]
 to pinButton
 get ui
 at append
 call [ get sqlBar ] [ get pinButton ]
 get ui
 at append
 call [ get sqlColumn ] [ get sqlBar ]
 get ui
 at code
 call [ get state, at sqlText ] [ function value [
  set state sqlText [ get value ]
 ] ] [ function [
  get runSql
  call
 ] ]
 to sqlField
 get ui
 at append
 call [ get sqlColumn ] [ get sqlField ]
 get ui
 at column
 call
 to results
 set state sqlResults [ get results ]
 get ui
 at append
 call [ get sqlColumn ] [ get results ]
 get ui
 at append
 call [ get state, at sqlPane ] [ get sqlColumn ]
 get state
 at connectionId
 is ''
 true [
  set state tables [ list ]
  get paintNav
  call
  get paintContent
  call
 ]
 false [
  get starry
  at api
  call 'databases/schema' [ object [
   connectionId [ get state, at connectionId ]
  ] ]
  at tables
  to tables
  set state tables [ get tables ]
  get paintNav
  call
  get paintContent
  call
 ]
]
to buildBrowser

function [
 get ui
 at clear
 call [ get state, at navPane ]
 get starry
 at databaseNodes
 call [ get state, at connections ] [ get state, at tables ] [ get state, at connectionId ]
 to nodes
 get nodes
 at length
 is 0
 true [
  get state
  at connectionId
  is ''
  true [
   get ui
   at notice
   call empty 'Select a database.'
   to emptyNav
  ]
  false [
   get ui
   at notice
   call empty 'No tables yet.'
   to emptyNav
  ]
  get ui
  at append
  call [ get state, at navPane ] [ get emptyNav ]
 ]
 false [
  get starry
  at databaseSelection
  call [ get state, at dbView ] [ get state, at connectionId ] [ get state, at selectedTable ]
  to selected
  get ui
  at tree
  call [ get nodes ] [ get selected ] [ function id [
   get pickDatabaseNode
   call [ get id ]
  ] ]
  to navTree
  get ui
  at append
  call [ get state, at navPane ] [ get navTree ]
 ]
]
to paintNav

function [
 get state
 at connectionId
 is ''
 true [
  get ui
  at clear
  call [ get state, at gridPane ]
  get ui
  at notice
  call empty 'Select a database.'
  to emptyMain
  get ui
  at append
  call [ get state, at gridPane ] [ get emptyMain ]
 ]
 false [
  get state
  at dbView
  is schema
  true [
   get paintSchema
   call
  ]
  false [
   get loadRows
   call
  ]
 ]
]
to paintContent

function [
 get ui
 at clear
 call [ get state, at gridPane ]
 get state
 at selectedTable
 is ''
 true [
  get ui
  at notice
  call empty 'Select a table.'
  to emptySchema
  get ui
  at append
  call [ get state, at gridPane ] [ get emptySchema ]
 ]
 false [
  get state
  at tables
  find [ function item [
   get item
   at name
   is [ get state, at selectedTable ]
  ] ]
  to found
  get found
  is undefined
  true [
   get ui
   at notice
   call empty 'No columns.'
   to emptySchema
   get ui
   at append
   call [ get state, at gridPane ] [ get emptySchema ]
  ]
  false [
   get paintColumnEditor
   call [ get found ]
  ]
 ]
]
to paintSchema

function id [
 get starry
 at readDatabaseNode
 call [ get id ]
 to node
 get node
 at connectionId
 is ''
 false [
  get node
  at connectionId
  is [ get state, at connectionId ]
  to sameDb
  get node
  at table
  is [ get state, at selectedTable ]
  to sameTable
  get state
  at dbView
  is [ get node, at view ]
  to sameView
  get sameDb
  false [
   get useConnection
   call [ get node, at connectionId ]
  ]
  set state dbView [ get node, at view ]
  set state selectedTable [ get node, at table ]
  get node
  at table
  is ''
  false [
   get sameTable
   false [
    set state page 0
    set state sort [ list ]
    set state filters [ list ]
    set state selectedIndex null
    set state selectedRow null
   ]
  ]
  get sameDb
  false [
   get render
   call
  ]
  true [
   get sameTable
   false [
    get paintNav
    call
    get paintContent
    call
   ]
   true [
    get sameView
    false [
     get paintNav
     call
     get paintContent
     call
    ]
   ]
  ]
 ]
]
to pickDatabaseNode

function [
 get state
 at selectedTable
 is ''
 true [
  get ui
  at clear
  call [ get state, at gridPane ]
  get ui
  at notice
  call empty 'Select a table.'
  to emptyGrid
  get ui
  at append
  call [ get state, at gridPane ] [ get emptyGrid ]
 ]
 false [
  get starry
  at tableSummaries
  call [ get state, at connectionId ] [ get state, at selectedTable ]
  to summaries
  get starry
  at api
  call 'databases/rows' [ object [
   connectionId [ get state, at connectionId ]
   table [ get state, at selectedTable ]
   sort [ get state, at sort ]
   filters [ get state, at filters ]
   page [ get state, at page ]
   pageSize 100
   summaries [ get summaries ]
  ] ]
  to grid
  set state grid [ get grid ]
  get paintGrid
  call
 ]
]
to loadRows

function [
 get ui
 at clear
 call [ get state, at gridPane ]
 get ui
 at row
 call
 to bar
 get ui
 at button
 call Insert [ function [
  get insertRow
  call
 ] ]
 to insertButton
 get ui
 at append
 call [ get bar ] [ get insertButton ]
 get ui
 at button
 call Delete [ function [
  get deleteRow
  call
 ] ]
 to deleteButton
 get ui
 at append
 call [ get bar ] [ get deleteButton ]
 get ui
 at append
 call [ get state, at gridPane ] [ get bar ]
 get state
 at grid
 at editable
 not
 true [
  get ui
  at notice
  call empty 'No primary key, this grid is read-only.'
  to readonly
  get ui
  at append
  call [ get state, at gridPane ] [ get readonly ]
 ]
 get ui
 at table
 call [ object [
  columns [ get state, at grid, at columns ]
  rows [ get state, at grid, at rows ]
  sort [ get state, at grid, at sort ]
  filters [ get state, at grid, at filters ]
  page [ get state, at grid, at page ]
  pageSize [ get state, at grid, at pageSize ]
  total [ get state, at grid, at total ]
  editable [ get state, at grid, at editable ]
  onSort [ function sort [
   set state sort [ get sort ]
   set state page 0
   get loadRows
  call
  ] ]
  onFilter [ function filters [
   set state filters [ get filters ]
   set state page 0
   get loadRows
  call
  ] ]
  onPage [ function page [
   set state page [ get page ]
   get loadRows
  call
  ] ]
  onSelectRow [ function index [
   set state selectedIndex [ get index ]
   get state
   at grid
   at rows
   at [ get index ]
   to row
   set state selectedRow [ get row ]
  ] ]
  onCellEdit [ function rowIndex column value [
   get saveCell
   call [ get rowIndex ] [ get column ] [ get value ]
  ] ]
  summary [ get state, at grid, at summary ]
 ] ]
 to gridTable
 get ui
 at append
 call [ get state, at gridPane ] [ get gridTable ]
]
to paintGrid

function rowIndex column value [
 get starry
 at primaryKey
 call [ get state, at grid ] [ get rowIndex ]
 to key
 get starry
 at api
 call 'databases/mutate' [ object [
  connectionId [ get state, at connectionId ]
  action update
  table [ get state, at selectedTable ]
  column [ get column ]
  value [ get value ]
  primaryKey [ get key ]
 ] ]
 get loadRows
 call
]
to saveCell

function [
 get state
 at selectedIndex
 is null
 true [
  get shell
  at setStatus
  call 'Select a row first.' error
 ]
 false [
  get starry
  at primaryKey
  call [ get state, at grid ] [ get state, at selectedIndex ]
  to key
  get starry
  at api
  call 'databases/mutate' [ object [
   connectionId [ get state, at connectionId ]
   action delete
   table [ get state, at selectedTable ]
   primaryKey [ get key ]
  ] ]
  set state selectedIndex null
  set state selectedRow null
  get loadRows
  call
 ]
]
to deleteRow

function [
 get ui
 at dialog
 call 'Insert row'
 to editor
 get state
 at grid
 at columns
 each [ function column [
  get ui
  at columnField
  call [ get column, at name ] [ get column, at type ] '' [ function value [
   set column draft [ get value ]
  ] ]
  to control
  get ui
  at append
  call [ get editor, at panel ] [ get control ]
 ] ]
 get ui
 at button
 call Insert [ function [
  get starry
  at rowFromDrafts
  call [ get state, at grid, at columns ]
  to row
  get starry
  at api
  call 'databases/mutate' [ object [
   connectionId [ get state, at connectionId ]
   action insert
   table [ get state, at selectedTable ]
   row [ get row ]
  ] ]
  get editor
  at close
  call
  get loadRows
  call
 ] ]
 to submit
 get ui
 at append
 call [ get editor, at panel ] [ get submit ]
 get editor
 at open
 call
]
to insertRow

function [
 get starry
 at api
 call 'databases/query' [ object [
  connectionId [ get state, at connectionId ]
  sql [ get state, at sqlText ]
 ] ]
 to payload
 set state sqlPayload [ get payload ]
 get ui
 at clear
 call [ get state, at sqlResults ]
 get payload
 at results
 each [ function result [
  get showResult
  call [ get result ]
 ] ]
 get refreshSchema
 call
]
to runSql

function [
 get starry
 at api
 call 'databases/schema' [ object [
  connectionId [ get state, at connectionId ]
 ] ]
 at tables
 to tables
 set state tables [ get tables ]
 get paintNav
 call
 get state
 at dbView
 is schema
 true [
  get paintSchema
  call
 ]
]
to refreshSchema

function result [
 get result
 at columns
 at length
 is 0
 true [
  get ui
  at notice
  call info [ template 'Done. %0 rows affected.' [ get result, at rowsAffected ] ]
  to done
  get ui
  at append
  call [ get state, at sqlResults ] [ get done ]
 ]
 false [
  get ui
  at table
  call [ object [
   columns [ get result, at columns ]
   rows [ get result, at rows ]
   editable false
  ] ]
  to resultTable
  get ui
  at append
  call [ get state, at sqlResults ] [ get resultTable ]
 ]
]
to showResult

function [
 get state
 at grid
 is null
 false [
  get starry
  at id
  call
  to noteId
  get starry
  at id
  call
  to blockId
  get starry
  at stringifyDataset
  call [ object [
   columns [ get state, at grid, at columns ]
   rows [ get state, at grid, at rows ]
   sort [ get state, at grid, at sort ]
   filters [ get state, at grid, at filters ]
   sourceSql [ get state, at grid, at sourceSql ]
  ] ]
  to body
  set state note [ object [
   id [ get noteId ]
   title [ template 'Pinned %0' [ get state, at selectedTable ] ]
   blocks [ list [
    object [
     id [ get blockId ]
     kind dataset
     name [ get state, at selectedTable ]
     body [ get body ]
    ]
   ] ]
  ] ]
  try [
   get starry
   at api
   call 'notes/save' [ object [
    connectionId [ get state, at connectionId ]
    note [ get state, at note ]
   ] ]
   at note
   to saved
   set state note [ get saved ]
   get visitNotes
   call
  ] [
   get_error
   to message
   get shell
   at setStatus
   call [ get message ] error
  ]
 ]
]
to pinGrid

function table [
 get ui
 at column
 call
 to editor
 set editor style gap 'var(--dimension2)'
 set editor style padding 'var(--dimension2) var(--dimension3)'
 get table
 at type
 is view
 to locked
 get table
 at columns
 each [ function column [
  get ui
  at line
  call
  to line
  get ui
  at text
  call [ template '%0 %1' [ get column, at name ] [ get column, at type ] ]
  to label
  get ui
  at append
  call [ get line ] [ get label ]
  get starry
  at columnSummary
  call [ get state, at connectionId ] [ get state, at selectedTable ] [ get column, at name ]
  to currentSummary
  get starry
  at summaryChoice
  call [ get ui ] [ get column, at type ] [ get currentSummary ] [ function value [
   get saveSummary
   call [ get column, at name ] [ get value ]
  ] ]
  to summaryControl
  get summaryControl
  is null
  false [
   get ui
   at append
   call [ get line ] [ get summaryControl ]
  ]
  get locked
  false [
   get ui
   at button
   call Remove [ function [
    get confirmDropColumn
    call [ get column, at name ]
   ] ]
   to removeButton
   get ui
   at append
   call [ get line ] [ get removeButton ]
  ]
  get ui
  at append
  call [ get editor ] [ get line ]
 ] ]
 get locked
 false [
  get ui
  at line
  call
  to addLine
  get ui
  at field
  call Name [ get state, at columnName ] [ function value [
   set state columnName [ get value ]
  ] ]
  to nameField
  get ui
  at append
  call [ get addLine ] [ get nameField ]
  get starry
  at columnTypeChoice
  call [ get ui ] [ get state, at columnType ] [ function value [
   set state columnType [ get value ]
  ] ]
  to typeChoice
  get ui
  at append
  call [ get addLine ] [ get typeChoice ]
  get ui
  at button
  call Add [ function [
   get addColumn
   call
  ] ]
  to addButton
  get ui
  at append
  call [ get addLine ] [ get addButton ]
  get ui
  at append
  call [ get editor ] [ get addLine ]
 ]
 get ui
 at append
 call [ get state, at gridPane ] [ get editor ]
]
to paintColumnEditor

function name action [
 get starry
 at writeColumnSummary
 call [ get state, at connectionId ] [ get state, at selectedTable ] [ get name ] [ get action ]
]
to saveSummary

function [
 get starry
 at api
 call 'databases/mutate' [ object [
  connectionId [ get state, at connectionId ]
  action addColumn
  table [ get state, at selectedTable ]
  name [ get state, at columnName ]
  type [ get state, at columnType ]
 ] ]
 set state columnName ''
 get refreshSchema
 call
]
to addColumn

function name [
 get ui
 at dialog
 call 'Remove column'
 to confirm
 get ui
 at notice
 call info [ template 'Remove %0 from %1? Values stored in that column will be deleted.' [ get name ] [ get state, at selectedTable ] ]
 to confirmMessage
 get ui
 at append
 call [ get confirm, at panel ] [ get confirmMessage ]
 get ui
 at button
 call Cancel [ function [
  get confirm
  at close
  call
 ] ]
 to cancelButton
 get ui
 at append
 call [ get confirm, at panel ] [ get cancelButton ]
 get ui
 at button
 call Remove [ function [
  get confirm
  at close
  call
  get starry
  at api
  call 'databases/mutate' [ object [
   connectionId [ get state, at connectionId ]
   action dropColumn
   table [ get state, at selectedTable ]
   column [ get name ]
  ] ]
  get starry
  at writeColumnSummary
  call [ get state, at connectionId ] [ get state, at selectedTable ] [ get name ] ''
  get refreshSchema
  call
 ] ]
 to confirmButton
 get ui
 at append
 call [ get confirm, at panel ] [ get confirmButton ]
 get confirm
 at open
 call
]
to confirmDropColumn

object [
 render [ get renderDatabases ]
]
