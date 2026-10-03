get request
at path
to route
regexp '^[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*$'
at test
call [ get route ]
not
to bad
pick [
get bad
object [
status 400
body 'invalid path'
]
] [
true
template 'routes/%0.mcr' [ get route ]
to file
get exists
call [ get file ]
not
to missing
pick [
get missing
object [
status 404
body 'not found'
]
] [
true
try [
load [ get file ]
point
] [
get_error
to message
object [
status 500
body [ get message ]
]
]
]
]
