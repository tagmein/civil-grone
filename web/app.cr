global import
call '/starry.mjs'
to starry

get starry
at shell
call
to shell

get starry
at createUi
call
to ui

set state [ object [
 section databases
 example ''
 connectionId ''
 connectionName 'No database'
 connections [ list ]
 dbView data
 tables [ list ]
 selectedTable ''
 sort [ list ]
 filters [ list ]
 page 0
 grid null
 sqlText 'SELECT 1'
 notes [ list ]
 archiveFilter hide
 datasetPick [ object ]
 datasetConflict [ object ]
 note null
 stepErrors [ object ]
 stepErrorBanner ''
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
 get ui
 at dialog
 call About
 to about
 get ui
 at markdown
 call 'Civil Grone is a local-first database and notebook.'
 to lead
 get ui
 at append
 call [ get about, at panel ] [ get lead ]
 get ui
 at markdown
 call 'Databases opens a SQLite file on this machine or connects a Turso database. Browse tables, sort and filter rows, and run SQL.'
 to databasesCopy
 get ui
 at append
 call [ get about, at panel ] [ get databasesCopy ]
 get ui
 at markdown
 call 'Notes live in the selected database. A note mixes markdown with SQL, Crown, and JavaScript blocks that pass datasets along a pipeline.'
 to notesCopy
 get ui
 at append
 call [ get about, at panel ] [ get notesCopy ]
 get ui
 at markdown
 call 'Examples are Grone notes you can preview or import. Each one is a sample dataset plus Crown that builds the interface.'
 to examplesCopy
 get ui
 at append
 call [ get about, at panel ] [ get examplesCopy ]
 get ui
 at button
 call Close [ function [
  get about
  at close
  call
 ] ]
 to closeAbout
 get ui
 at append
 call [ get about, at panel ] [ get closeAbout ]
 get about
 at open
 call
]
to openAbout

function [
 get ui
 at clear
 call [ get shell, at main ]
 get starry
 at renderHome
 call [ get shell, at main ] [ get ui ] [ function [
  get visit
  call databases '' push
 ] ] [ function [
  get visitNotes
  call
 ] ] [ function [
  set state example ''
  get visit
  call examples '' push
 ] ]
]
to renderHome

function title blocks [
 get state
 at connectionId
 is ''
 true [
  get shell
  at setStatus
  call 'Select or create a database before importing an example.' error
 ]
 false [
  get starry
  at api
  call 'notes/ensure' [ object [
   connectionId [ get state, at connectionId ]
  ] ]
  get starry
  at id
  call
  to noteId
  set state note [ object [
   id [ get noteId ]
   title [ get title ]
   blocks [ get blocks ]
  ] ]
  get notes
  at saveNote
  call
  get visitNotes
  call
  get pipeline
  at runFrom
  call 0
  get state
  at stepOk
  is true
  true [
   get shell
   at setStatus
   call 'Imported into Notes.' info
  ]
 ]
]
to importExample

function [
 get ui
 at clear
 call [ get shell, at main ]
 get starry
 at renderExamples
 call [ get shell, at main ] [ get ui ] [ function [
  get visit
  call home '' push
 ] ] [ function [
  set state example ''
  get visit
  call examples '' push
 ] ] [ function id [
  set state example [ get id ]
  get visit
  call examples '' push
 ] ] [ function title blocks [
  get importExample
  call [ get title ] [ get blocks ]
 ] ] [ get state, at example ]
]
to renderExamples

function [
 get shell
 at setStatus
 call '' info
 get ui
 at clear
 call [ get shell, at tray ]
 get ui
 at button
 call Home [ function [
  get visit
  call home '' push
 ] ]
 to homeNav
 get ui
 at append
 call [ get shell, at tray ] [ get homeNav ]
 get ui
 at button
 call 'Civil Grone'
 to homeButton
 get ui
 at menu
 call [ get homeButton ] [ list [ object [
  label About
  action [ function [
   get openAbout
   call
  ] ]
 ] ] [ object [
  id fullscreen
  label Fullscreen
 ] ] ]
 get ui
 at append
 call [ get shell, at tray ] [ get homeButton ]
 get ui
 at button
 call Databases [ function [
  get visit
  call databases '' push
 ] ]
 to databasesButton
 get ui
 at append
 call [ get shell, at tray ] [ get databasesButton ]
 get ui
 at button
 call Notes [ function [
  get visitNotes
  call
 ] ]
 to notesButton
 get ui
 at append
 call [ get shell, at tray ] [ get notesButton ]
 get ui
 at button
 call Examples [ function [
  set state example ''
  get visit
  call examples '' push
 ] ]
 to examplesButton
 get ui
 at append
 call [ get shell, at tray ] [ get examplesButton ]
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
 call New
 to newButton
 get ui
 at menu
 call [ get newButton ] [ list [ object [
  label SQLite
  action [ function [
   get openLocal
   call
  ] ]
 ] ] [ object [
  label Turso
  action [ function [
   get openRemote
   call
  ] ]
 ] ] ]
 get ui
 at append
 call [ get shell, at tray ] [ get newButton ]
 get ui
 at themeSwitcher
 call [ function [
  get render
  call
 ] ]
 to themeButton
 get ui
 at append
 call [ get shell, at tray ] [ get themeButton ]
 get starry
 at clearScreen
 call [ get shell, at main ]
 get state
 at section
 is home
 true [
  get renderHome
  call
 ]
 false [
  get state
  at section
  is examples
  true [
   get renderExamples
   call
  ]
  false [
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
  get starry
  at writeConnectionId
  call [ get id ]
 ]
]
to useConnection

function section noteId mode [
 set state section [ get section ]
 get section
 is examples
 false [
  set state example ''
 ]
 get section
 is notes
 true [
  set state routeNoteId [ get noteId ]
 ]
 false [
  unset state routeNoteId
 ]
 get starry
 at writeRoute
 call [ get section ] [ get noteId ] [ get state, at example ] [ get mode ]
 get render
 call
]
to visit

function [
 get state
 at note
 is null
 to missing
 pick [
 get missing
 value ''
 to noteId
 ] [
 true
 get state
 at note
 at id
 to noteId
 ]
 get visit
 call notes [ get noteId ] push
]
to visitNotes

function section noteId example [
 set state section [ get section ]
 get section
 is examples
 true [
  set state example [ get example ]
 ]
 false [
  set state example ''
 ]
 get section
 is notes
 true [
  set state routeNoteId [ get noteId ]
 ]
 false [
  unset state routeNoteId
 ]
 get render
 call
]
to applyRoute

function id [
 set state dbView data
 get useConnection
 call [ get id ]
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
 get starry
 at readConnectionId
 call
 to storedId
 get state
 at connections
 find [ function item [
  get item
  at id
  is [ get storedId ]
 ] ]
 to found
 get found
 is undefined
 false [
  get useConnection
  call [ get storedId ]
 ]
 get starry
 at readRoute
 call
 to route
 get route
 at section
 is notes
 true [
  set state section notes
  set state routeNoteId [ get route, at noteId ]
 ]
 get starry
 at writeRoute
 call [ get state, at section ] [ get state, at routeNoteId ] '' replace
 get starry
 at onRoute
 call [ get applyRoute ]
 get render
 call
] [
 get_error
 to message
 get shell
 at setStatus
 call [ get message ] error
]
