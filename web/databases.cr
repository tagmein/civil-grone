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
 get starry
 at schemaNodes
 call [ object [
  tables [ get state, at tables ]
 ] ]
 to nodes
 get nodes
 at length
 is 0
 true [
  get ui
  at notice
  call empty 'No tables yet.'
  to emptySchema
  get ui
  at append
  call [ get state, at gridPane ] [ get emptySchema ]
 ]
 false [
  get ui
  at tree
  call [ get nodes ] '' [ function id [
   get id
  ] ]
  to schemaTree
  get ui
  at append
  call [ get state, at gridPane ] [ get schemaTree ]
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
  get node
  at view
  is schema
  false [
   set state selectedTable [ get node, at table ]
  ]
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
  at api
  call 'databases/rows' [ object [
   connectionId [ get state, at connectionId ]
   table [ get state, at selectedTable ]
   sort [ get state, at sort ]
   filters [ get state, at filters ]
   page [ get state, at page ]
   pageSize 100
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
 ]
]
to pinGrid

object [
 render [ get renderDatabases ]
]
