function name data [
 get starry
 at stringifyDataset
 call [ get data ]
 to body
 get state
 at note
 at blocks
 find [ function block [
  get block
  at kind
  is dataset
  to kindOk
  get block
  at name
  is [ get name ]
  to nameOk
  all [ get kindOk ] [ get nameOk ]
 ] ]
 to block
 get block
 is undefined
 false [
  set block body [ get body ]
  get notes
  at saveNote
  call
 ]
]
to writeDataset

function [
 set state refreshIndex -1
 get state
 at note
 at blocks
 each [ function block index [
  get block
  at kind
  is crown
  true [
   set state refreshIndex [ get index ]
  ]
 ] ]
 get state
 at refreshIndex
 < 0
 false [
  get runOne
  call [ get state, at refreshIndex ]
 ]
]
to refresh

function index [
 get state
 at note
 at blocks
 at [ get index ]
 to block
 set state stepOk true
 try [
  get starry
  at makeSql
  call [ get state, at connectionId ]
  to sqlFn
  get starry
  at trackUi
  call [ get ui ]
  to crownUi
  get starry
  at bindingsBefore
  call [ get state, at note, at blocks ] [ get index ] [ get sqlFn ] [ object [
   ui [ get crownUi ]
   starry [ get starry ]
   writeDataset [ get writeDataset ]
   refresh [ get refresh ]
  ] ]
  to bindings
  get block
  at kind
  to kind
  get kind
  is sql
  true [
   get sqlFn
   call [ get block, at body ]
   to output
   set block output [ get output ]
  ]
  get kind
  is crown
  true [
   get starry
   at runUserCrown
   call [ get block, at body ] [ get bindings ]
   to output
   set block output [ get output ]
  ]
  get kind
  is javascript
  true [
   get starry
   at runUserJavaScript
   call [ get block, at body ] [ get bindings ]
   to output
   set block output [ get output ]
  ]
  get kind
  is dataset
  true [
   get refreshDataset
   call [ get block ]
  ]
  get notes
  at clearStepError
  call [ get block ]
 ] [
  get_error
  to message
  set state stepOk false
  get notes
  at showStepError
  call [ get block ] [ get message ]
 ]
 get notes
 at paintNote
 call
 get state
 at stepOk
]
to runOne

function block [
 get starry
 at parseDataset
 call [ get block, at body ]
 to data
 get data
 at sourceSql
 is ''
 false [
  get starry
  at makeSql
  call [ get state, at connectionId ]
  to sqlFn
  get sqlFn
  call [ get data, at sourceSql ]
  to output
  get starry
  at stringifyDataset
  call [ get output ]
  to nextBody
  set block body [ get nextBody ]
  set block output [ get output ]
 ]
]
to refreshDataset

function index [
 get state
 at note
 at blocks
 at [ get index ]
 at output
 to output
 get starry
 at outputText
 call [ get output ]
 to sqlText
 get starry
 at nextSql
 call [ get state, at note, at blocks ] [ get index ] [ get sqlText ]
 to blocks
 set state note blocks [ get blocks ]
 get notes
 at paintNote
 call
]
to useSql

function index [
 get state
 at note
 at blocks
 at [ get index ]
 at output
 to output
 get starry
 at saveDatasetBlock
 call [ get state, at note, at blocks ] [ get index ] [ get output ]
 to blocks
 set state note blocks [ get blocks ]
 get notes
 at saveNote
 call
 get notes
 at paintNote
 call
]
to saveOutput

function index [
 set state cursor [ get index ]
 get loopRun
 call
]
to runFrom

function [
 get state
 at cursor
 to cursor
 get cursor
 < [ get state, at note, at blocks, at length ]
 true [
  get runOne
  call [ get cursor ]
  to continued
  get continued
  is true
  true [
   get cursor
   add 1
   to next
   set state cursor [ get next ]
   get loopRun
   call
  ]
 ]
]
to loopRun

object [
 runOne [ get runOne ]
 useSql [ get useSql ]
 saveOutput [ get saveOutput ]
 runFrom [ get runFrom ]
]
