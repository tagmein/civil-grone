global import
call '/starry.mjs'
to starry

get starry
at shell
call [ get starry, at themeMidnight ]
to shell

get starry
at createUi
call [ get starry, at themeMidnight ]
to ui

set state [ object [
 section databases
 connectionId ''
 connectionName 'No database'
 connections [ list ]
 tables [ list ]
 selectedTable ''
 sort [ list ]
 filters [ list ]
 page 0
 grid null
 sqlText 'SELECT 1'
 notes [ list ]
 note null
 selectedIndex null
 selectedRow null
 draftName notes
 draftUrl ''
 draftToken ''
] ]

get starry
at setOnError
call [ function message [
 get shell
 at setStatus
 call [ get message ] error
] ]

load ./pipeline.cr
point
to pipeline

load ./databases.cr
point
to databases

load ./notes.cr
point
to notes

function [
 get shell
 at setStatus
 call '' info
 get ui
 at clear
 call [ get shell, at tray ]
 get ui
 at button
 call 'Civil Grone'
 to homeButton
 get ui
 at append
 call [ get shell, at tray ] [ get homeButton ]
 get ui
 at button
 call Databases [ function [
  set state section databases
  get render
  call
 ] ]
 to databasesButton
 get ui
 at append
 call [ get shell, at tray ] [ get databasesButton ]
 get ui
 at button
 call Notes [ function [
  set state section notes
  get render
  call
 ] ]
 to notesButton
 get ui
 at append
 call [ get shell, at tray ] [ get notesButton ]
 get ui
 at button
 call [ template 'Database: %0' [ get state, at connectionName ] ] [ function [
  get openConnections
  call
 ] ]
 to connectionButton
 get ui
 at append
 call [ get shell, at tray ] [ get connectionButton ]
 get ui
 at append
 call [ get shell, at tray ] [ get ui, at spacer, call ]
 get ui
 at button
 call 'New SQLite' [ function [
  get openLocal
  call
 ] ]
 to localButton
 get ui
 at append
 call [ get shell, at tray ] [ get localButton ]
 get ui
 at button
 call Turso [ function [
  get openRemote
  call
 ] ]
 to remoteButton
 get ui
 at append
 call [ get shell, at tray ] [ get remoteButton ]
 get state
 at section
 is databases
 true [
  get databases
  at render
  call
 ]
 false [
  get notes
  at render
  call
 ]
]
to render

function [
 get starry
 at api
 call 'databases/list'
 at connections
 to listed
 set state connections [ get listed ]
]
to loadConnections

function id [
 set state connectionId [ get id ]
 set state selectedTable ''
 set state note null
 get state
 at connections
 find [ function item [
  get item
  at id
  is [ get id ]
 ] ]
 to found
 get found
 is undefined
 false [
  get found
  at name
  to foundName
  set state connectionName [ get foundName ]
 ]
 get render
 call
]
to choose

function [
 get ui
 at dialog
 call Connections
 to picker
 get state
 at connections
 each [ function item [
  get ui
  at button
  call [ get item, at name ] [ function [
   get picker
   at close
   call
   get choose
   call [ get item, at id ]
  ] ]
  to choice
  get ui
  at append
  call [ get picker, at panel ] [ get choice ]
 ] ]
 get state
 at connections
 at length
 is 0
 true [
  get ui
  at notice
  call empty 'Create a local SQLite database to begin.'
  to emptyNote
  get ui
  at append
  call [ get picker, at panel ] [ get emptyNote ]
 ]
 get picker
 at open
 call
]
to openConnections

function [
 set state draftName notes
 get ui
 at dialog
 call 'New SQLite database'
 to creator
 get ui
 at field
 call Name [ get state, at draftName ] [ function value [
  set state draftName [ get value ]
 ] ]
 to nameField
 get ui
 at append
 call [ get creator, at panel ] [ get nameField ]
 get ui
 at button
 call Create [ function [
  get starry
  at api
  call 'databases/create' [ object [
   kind local
   name [ get state, at draftName ]
  ] ]
  at connection
  to created
  get creator
  at close
  call
  get loadConnections
  call
  get choose
  call [ get created, at id ]
 ] ]
 to createButton
 get ui
 at append
 call [ get creator, at panel ] [ get createButton ]
 get creator
 at open
 call
]
to openLocal

function [
 set state draftName Turso
 set state draftUrl ''
 set state draftToken ''
 get ui
 at dialog
 call 'Turso database'
 to creator
 get ui
 at field
 call Name [ get state, at draftName ] [ function value [
  set state draftName [ get value ]
 ] ]
 to nameField
 get ui
 at append
 call [ get creator, at panel ] [ get nameField ]
 get ui
 at field
 call URL '' [ function value [
  set state draftUrl [ get value ]
 ] ]
 to urlField
 get ui
 at append
 call [ get creator, at panel ] [ get urlField ]
 get ui
 at field
 call Token '' [ function value [
  set state draftToken [ get value ]
 ] ]
 to tokenField
 get ui
 at append
 call [ get creator, at panel ] [ get tokenField ]
 get ui
 at button
 call Connect [ function [
  get starry
  at api
  call 'databases/create' [ object [
   kind remote
   name [ get state, at draftName ]
   url [ get state, at draftUrl ]
   authToken [ get state, at draftToken ]
  ] ]
  at connection
  to created
  get creator
  at close
  call
  get loadConnections
  call
  get choose
  call [ get created, at id ]
 ] ]
 to connectButton
 get ui
 at append
 call [ get creator, at panel ] [ get connectButton ]
 get creator
 at open
 call
]
to openRemote

try [
 get loadConnections
 call
 get render
 call
] [
 get_error
 to message
 get shell
 at setStatus
 call [ get message ] error
]
