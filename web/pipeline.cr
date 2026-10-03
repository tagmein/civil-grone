function index [
 get state
 at note
 at blocks
 at [ get index ]
 to block
 get starry
 at makeSql
 call [ get state, at connectionId ]
 to sqlFn
 get starry
 at bindingsBefore
 call [ get state, at note, at blocks ] [ get index ] [ get sqlFn ]
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
 at paintNote
 call
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
  get cursor
  add 1
  to next
  set state cursor [ get next ]
  get loopRun
  call
 ]
]
to loopRun

object [
 runOne [ get runOne ]
 useSql [ get useSql ]
 saveOutput [ get saveOutput ]
 runFrom [ get runFrom ]
]
