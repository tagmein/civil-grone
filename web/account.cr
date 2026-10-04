function [
 get ui
 at clear
 call [ get shell, at main ]
 get ui
 at column
 call
 to form
 get state
 at authMode
 is challenge
 true [
  get paintChallenge
  call [ get form ]
 ]
 false [
  get state
  at authMode
  is signup
  true [
   get paintSignup
   call [ get form ]
  ]
  false [
   get paintSignin
   call [ get form ]
  ]
 ]
 get ui
 at append
 call [ get shell, at main ] [ get form ]
]
to renderGate

function form [
 get ui
 at notice
 call info 'Sign in to this database.'
 to intro
 get ui
 at append
 call [ get form ] [ get intro ]
 get paintCredentials
 call [ get form ] false
 get ui
 at button
 call 'Sign in' [ function [
  get submitSignin
  call
 ] ]
 to submit
 get ui
 at append
 call [ get form ] [ get submit ]
 get ui
 at button
 call 'Create an account' [ function [
  set state authMode signup
  get refresh
  call
 ] ]
 to switchButton
 get ui
 at append
 call [ get form ] [ get switchButton ]
]
to paintSignin

function form [
 get state
 at hasUsers
 is false
 true [
  get ui
  at notice
  call info 'This database has no accounts yet. The first account uses invite code 0000-0000.'
  to intro
  get ui
  at append
  call [ get form ] [ get intro ]
 ]
 false [
  get ui
  at notice
  call info 'Create an account with an invite code.'
  to intro
  get ui
  at append
  call [ get form ] [ get intro ]
 ]
 get paintCredentials
 call [ get form ] true
 get ui
 at field
 call 'Invite code' [ get state, at authInvite ] [ function value [
  set state authInvite [ get value ]
 ] ]
 to inviteField
 get ui
 at append
 call [ get form ] [ get inviteField ]
 get ui
 at button
 call 'Create account' [ function [
  get submitSignup
  call
 ] ]
 to submit
 get ui
 at append
 call [ get form ] [ get submit ]
 get ui
 at button
 call 'Sign in instead' [ function [
  set state authMode signin
  get refresh
  call
 ] ]
 to switchButton
 get ui
 at append
 call [ get form ] [ get switchButton ]
]
to paintSignup

function form signup [
 get ui
 at field
 call Username [ get state, at authUsername ] [ function value [
  set state authUsername [ get value ]
 ] ]
 to usernameField
 get ui
 at append
 call [ get form ] [ get usernameField ]
 get signup
 is true
 true [
  get ui
  at field
  call Name [ get state, at authName ] [ function value [
   set state authName [ get value ]
  ] ]
  to nameField
  get ui
  at append
  call [ get form ] [ get nameField ]
 ]
 get ui
 at secret
 call Password [ get state, at authPassword ] [ function value [
  set state authPassword [ get value ]
 ] ]
 to passwordField
 get ui
 at append
 call [ get form ] [ get passwordField ]
]
to paintCredentials

function form [
 get ui
 at notice
 call info 'Enter a second factor to finish signing in.'
 to intro
 get ui
 at append
 call [ get form ] [ get intro ]
 get state
 at authMethods
 find [ function item [
  get item
  is passkey
 ] ]
 to passkey
 get passkey
 is undefined
 false [
  get ui
  at button
  call 'Use passkey' [ function [
   get beginWebAuthn
   call passkey
  ] ]
  to passkeyButton
  get ui
  at append
  call [ get form ] [ get passkeyButton ]
 ]
 get state
 at authMethods
 find [ function item [
  get item
  is 'security-key'
 ] ]
 to securityKey
 get securityKey
 is undefined
 false [
  get ui
  at button
  call 'Use security key' [ function [
   get beginWebAuthn
   call 'security-key'
  ] ]
  to keyButton
  get ui
  at append
  call [ get form ] [ get keyButton ]
 ]
 get state
 at authMethods
 find [ function item [
  get item
  is totp
 ] ]
 to totp
 get totp
 is undefined
 false [
  get ui
  at field
  call 'Authenticator code' [ get state, at authCode ] [ function value [
   set state authCode [ get value ]
  ] ]
  to codeField
  get ui
  at append
  call [ get form ] [ get codeField ]
  get ui
  at button
  call Verify [ function [
   get submitTotp
   call
  ] ]
  to verifyButton
  get ui
  at append
  call [ get form ] [ get verifyButton ]
 ]
 get ui
 at button
 call Back [ function [
  set state authMode signin
  set state authChallenge ''
  get refresh
  call
 ] ]
 to backButton
 get ui
 at append
 call [ get form ] [ get backButton ]
]
to paintChallenge

function [
 try [
  get starry
  at api
  call 'auth/login' [ object [
   connectionId [ get state, at connectionId ]
   username [ get state, at authUsername ]
   password [ get state, at authPassword ]
  ] ]
  to result
  set state authPassword ''
  get result
  at step
  is '2fa'
  true [
   set state authChallenge [ get result, at challengeId ]
   set state authMethods [ get result, at methods ]
   set state authCode ''
   set state authMode challenge
   get refresh
   call
  ]
  false [
   set state user [ get result, at user ]
   set state hasUsers true
   set state authMode signin
   get resetOpenNote
   call
   get shell
   at setStatus
   call 'Signed in.' info
   get refresh
   call
  ]
 ] [
  get_error
  to message
  get shell
  at setStatus
  call [ get message ] error
 ]
]
to submitSignin

function [
 try [
  get starry
  at api
  call 'auth/signup' [ object [
   connectionId [ get state, at connectionId ]
   username [ get state, at authUsername ]
   name [ get state, at authName ]
   password [ get state, at authPassword ]
   inviteCode [ get state, at authInvite ]
  ] ]
  to result
  set state authPassword ''
  set state user [ get result, at user ]
  set state hasUsers true
  set state authMode signin
  get resetOpenNote
  call
  get shell
  at setStatus
  call 'Account created.' info
  get refresh
  call
 ] [
  get_error
  to message
  get shell
  at setStatus
  call [ get message ] error
 ]
]
to submitSignup

function [
 try [
  get starry
  at api
  call 'auth/totp/login' [ object [
   connectionId [ get state, at connectionId ]
   challengeId [ get state, at authChallenge ]
   code [ get state, at authCode ]
  ] ]
  to result
  set state authCode ''
  set state authChallenge ''
  set state user [ get result, at user ]
  set state hasUsers true
  set state authMode signin
  get resetOpenNote
  call
  get shell
  at setStatus
  call 'Signed in.' info
  get refresh
  call
 ] [
  get_error
  to message
  get shell
  at setStatus
  call [ get message ] error
 ]
]
to submitTotp

function kind [
 try [
  get starry
  at api
  call 'auth/webauthn/login/options' [ object [
   connectionId [ get state, at connectionId ]
   challengeId [ get state, at authChallenge ]
   kind [ get kind ]
  ] ]
  at options
  to options
  get starry
  at authenticateWebAuthn
  call [ get options ]
  to credential
  get starry
  at api
  call 'auth/webauthn/login/verify' [ object [
   connectionId [ get state, at connectionId ]
   challengeId [ get state, at authChallenge ]
   credential [ get credential ]
  ] ]
  to result
  set state authChallenge ''
  set state user [ get result, at user ]
  set state hasUsers true
  set state authMode signin
  get resetOpenNote
  call
  get shell
  at setStatus
  call 'Signed in.' info
  get refresh
  call
 ] [
  get_error
  to message
  get shell
  at setStatus
  call [ get message ] error
 ]
]
to beginWebAuthn

function [
 try [
  get starry
  at api
  call 'auth/logout' [ object [
   connectionId [ get state, at connectionId ]
  ] ]
 ] [
  get_error
  to message
  get shell
  at setStatus
  call [ get message ] error
 ]
 set state user null
 set state note null
 set state authMode signin
 set state authPassword ''
 set state authChallenge ''
 get loadSession
 call
 get refresh
 call
]
to signOut

function [
 get state
 at section
 is notes
 true [
  get starry
  at readRoute
  call
  at noteId
  to routedId
  set state routeNoteId [ get routedId ]
 ]
 set state note null
]
to resetOpenNote

function [
 set state profileEditing 0
 set state totpChallenge ''
 set state totpCode ''
 try [
  get starry
  at api
  call 'auth/profile' [ object [
   connectionId [ get state, at connectionId ]
  ] ]
  to loaded
  set state profile [ get loaded ]
  set state profileName [ get loaded, at user, at name ]
  get ui
  at dialog
  call Profile
  to profile
  set state profileDialog [ get profile ]
  get paintProfile
  call
  get profile
  at open
  call
 ] [
  get_error
  to message
  get shell
  at setStatus
  call [ get message ] error
 ]
]
to openProfile

function [
 get ui
 at clear
 call [ get state, at profileDialog, at panel ]
 get state
 at profileEditing
 is 1
 true [
  get ui
  at field
  call Name [ get state, at profileName ] [ function value [
   set state profileName [ get value ]
  ] ]
  to nameField
  get ui
  at append
  call [ get state, at profileDialog, at panel ] [ get nameField ]
  get ui
  at text
  call [ template 'Username %0' [ get state, at profile, at user, at username ] ]
  to usernameText
  get ui
  at append
  call [ get state, at profileDialog, at panel ] [ get usernameText ]
  get ui
  at button
  call Save [ function [
   get saveProfile
   call
  ] ]
  to saveButton
  get ui
  at append
  call [ get state, at profileDialog, at panel ] [ get saveButton ]
  get ui
  at button
  call Cancel [ function [
   set state profileEditing 0
   set state profileName [ get state, at profile, at user, at name ]
   get paintProfile
   call
  ] ]
  to cancelButton
  get ui
  at append
  call [ get state, at profileDialog, at panel ] [ get cancelButton ]
 ]
 false [
  get ui
  at text
  call [ template 'Name %0' [ get state, at profile, at user, at name ] ]
  to nameText
  get ui
  at append
  call [ get state, at profileDialog, at panel ] [ get nameText ]
  get ui
  at text
  call [ template 'Username %0' [ get state, at profile, at user, at username ] ]
  to usernameText
  get ui
  at append
  call [ get state, at profileDialog, at panel ] [ get usernameText ]
  get ui
  at button
  call Edit [ function [
   set state profileEditing 1
   set state profileName [ get state, at profile, at user, at name ]
   get paintProfile
   call
  ] ]
  to editButton
  get ui
  at append
  call [ get state, at profileDialog, at panel ] [ get editButton ]
 ]
 get ui
 at text
 call Invites
 to inviteHeading
 get ui
 at append
 call [ get state, at profileDialog, at panel ] [ get inviteHeading ]
 get ui
 at text
 call [ template '%0 open, %1 sent, %2 used' [ get state, at profile, at open ] [ get state, at profile, at sent ] [ get state, at profile, at used ] ]
 to inviteSummary
 get ui
 at append
 call [ get state, at profileDialog, at panel ] [ get inviteSummary ]
 get state
 at profile
 at canRefill
 is true
 true [
  get ui
  at button
  call 'Generate 100 invites' [ function [
   get refillInvites
   call
  ] ]
  to refillButton
  get ui
  at append
  call [ get state, at profileDialog, at panel ] [ get refillButton ]
 ]
 get starry
 at giveableInvites
 call [ get state, at profile, at invites ]
 each [ function item [
  get ui
  at row
  call
  to line
  get ui
  at text
  call [ template '%0 %1' [ get item, at code ] [ get item, at status ] ]
  to codeText
  get ui
  at append
  call [ get line ] [ get codeText ]
  get ui
  at button
  call Copy [ function [
   get copyInvite
   call [ get item, at code ]
  ] ]
  to copyButton
  get ui
  at append
  call [ get line ] [ get copyButton ]
  get item
  at status
  is open
  true [
   get ui
   at button
   call 'Mark sent' [ function [
    get sendInvite
    call [ get item, at code ]
   ] ]
   to sentButton
   get ui
   at append
   call [ get line ] [ get sentButton ]
  ]
  get ui
  at append
  call [ get state, at profileDialog, at panel ] [ get line ]
 ] ]
 get ui
 at text
 call Security
 to securityHeading
 get ui
 at append
 call [ get state, at profileDialog, at panel ] [ get securityHeading ]
 get state
 at profile
 at factors
 each [ function factor [
  get ui
  at row
  call
  to line
  get ui
  at text
  call [ get factor, at label ]
  to factorLabel
  get ui
  at append
  call [ get line ] [ get factorLabel ]
  get ui
  at button
  call Remove [ function [
   get removeFactor
   call [ get factor ]
  ] ]
  to removeButton
  get ui
  at append
  call [ get line ] [ get removeButton ]
  get ui
  at append
  call [ get state, at profileDialog, at panel ] [ get line ]
 ] ]
 get ui
 at button
 call 'Add passkey' [ function [
  get enrollWebAuthn
  call passkey
 ] ]
 to passkeyButton
 get ui
 at append
 call [ get state, at profileDialog, at panel ] [ get passkeyButton ]
 get ui
 at button
 call 'Add security key' [ function [
  get enrollWebAuthn
  call 'security-key'
 ] ]
 to keyButton
 get ui
 at append
 call [ get state, at profileDialog, at panel ] [ get keyButton ]
 get ui
 at button
 call 'Add authenticator app' [ function [
  get beginTotp
  call
 ] ]
 to totpButton
 get ui
 at append
 call [ get state, at profileDialog, at panel ] [ get totpButton ]
 get state
 at totpChallenge
 is ''
 false [
  get ui
  at notice
  call info [ template 'Secret %0' [ get state, at totpSecret ] ]
  to secretNotice
  get ui
  at append
  call [ get state, at profileDialog, at panel ] [ get secretNotice ]
  get ui
  at text
  call [ get state, at totpUri ]
  to uriText
  get ui
  at append
  call [ get state, at profileDialog, at panel ] [ get uriText ]
  get ui
  at field
  call Code [ get state, at totpCode ] [ function value [
   set state totpCode [ get value ]
  ] ]
  to codeField
  get ui
  at append
  call [ get state, at profileDialog, at panel ] [ get codeField ]
  get ui
  at button
  call Confirm [ function [
   get confirmTotp
   call
  ] ]
  to confirmButton
  get ui
  at append
  call [ get state, at profileDialog, at panel ] [ get confirmButton ]
 ]
 get state
 at profile
 at user
 at role
 is superadmin
 true [
  get ui
  at text
  call Accounts
  to accountsHeading
  get ui
  at append
  call [ get state, at profileDialog, at panel ] [ get accountsHeading ]
  get state
  at profile
  at users
  each [ function person [
   get ui
   at row
   call
   to line
   get person
   at limited
   is 1
   to isLimited
   pick [
    get isLimited
    value Limited
    to limitLabel
   ] [
    true
    value Unlimited
    to limitLabel
   ]
   get ui
   at text
   call [ template '%0 (%1) %2' [ get person, at username ] [ get person, at role ] [ get limitLabel ] ]
   to personText
   get ui
   at append
   call [ get line ] [ get personText ]
   pick [
    get isLimited
    value Unlimit
    to actionLabel
   ] [
    true
    value Limit
    to actionLabel
   ]
   pick [
    get isLimited
    value 0
    to nextLimited
   ] [
    true
    value 1
    to nextLimited
   ]
   get ui
   at button
   call [ get actionLabel ] [ function [
    get setLimited
    call [ get person ] [ get nextLimited ]
   ] ]
   to limitButton
   get ui
   at append
   call [ get line ] [ get limitButton ]
   get ui
   at append
   call [ get state, at profileDialog, at panel ] [ get line ]
  ] ]
 ]
]
to paintProfile

function [
 try [
  get starry
  at api
  call 'auth/profile' [ object [
   connectionId [ get state, at connectionId ]
   name [ get state, at profileName ]
  ] ]
  to loaded
  set state profile [ get loaded ]
  set state profileEditing 0
  set state user [ get loaded, at user ]
  get paintProfile
  call
  get shell
  at setStatus
  call 'Name saved.' info
 ] [
  get_error
  to message
  get shell
  at setStatus
  call [ get message ] error
 ]
]
to saveProfile

function [
 try [
  get starry
  at api
  call 'auth/profile' [ object [
   connectionId [ get state, at connectionId ]
  ] ]
  to loaded
  set state profile [ get loaded ]
  set state user [ get loaded, at user ]
  get paintProfile
  call
 ] [
  get_error
  to message
  get shell
  at setStatus
  call [ get message ] error
 ]
]
to reloadProfile

function code [
 try [
  get starry
  at copyText
  call [ get code ]
  get shell
  at setStatus
  call 'Invite code copied.' info
 ] [
  get_error
  to message
  get shell
  at setStatus
  call [ get message ] error
 ]
]
to copyInvite

function code [
 try [
  get starry
  at api
  call 'auth/invites/send' [ object [
   connectionId [ get state, at connectionId ]
   code [ get code ]
  ] ]
  get reloadProfile
  call
  get shell
  at setStatus
  call 'Invite marked sent.' info
 ] [
  get_error
  to message
  get shell
  at setStatus
  call [ get message ] error
 ]
]
to sendInvite

function [
 try [
  get starry
  at api
  call 'auth/invites/refill' [ object [
   connectionId [ get state, at connectionId ]
  ] ]
  get reloadProfile
  call
  get shell
  at setStatus
  call '100 invite codes generated.' info
 ] [
  get_error
  to message
  get shell
  at setStatus
  call [ get message ] error
 ]
]
to refillInvites

function factor [
 try [
  get starry
  at api
  call 'auth/factor/remove' [ object [
   connectionId [ get state, at connectionId ]
   id [ get factor, at id ]
   kind [ get factor, at kind ]
  ] ]
  to loaded
  set state profile [ get loaded ]
  get paintProfile
  call
 ] [
  get_error
  to message
  get shell
  at setStatus
  call [ get message ] error
 ]
]
to removeFactor

function kind [
 try [
  get starry
  at api
  call 'auth/webauthn/register/options' [ object [
   connectionId [ get state, at connectionId ]
   kind [ get kind ]
  ] ]
  to started
  get starry
  at registerWebAuthn
  call [ get started, at options ]
  to credential
  get starry
  at api
  call 'auth/webauthn/register/verify' [ object [
   connectionId [ get state, at connectionId ]
   challengeId [ get started, at challengeId ]
   kind [ get kind ]
   credential [ get credential ]
  ] ]
  to loaded
  set state profile [ get loaded ]
  get paintProfile
  call
  get shell
  at setStatus
  call 'Security factor enrolled.' info
 ] [
  get_error
  to message
  get shell
  at setStatus
  call [ get message ] error
 ]
]
to enrollWebAuthn

function [
 try [
  get starry
  at api
  call 'auth/totp/begin' [ object [
   connectionId [ get state, at connectionId ]
  ] ]
  to started
  set state totpChallenge [ get started, at challengeId ]
  set state totpSecret [ get started, at secret ]
  set state totpUri [ get started, at otpauth ]
  set state totpCode ''
  get paintProfile
  call
 ] [
  get_error
  to message
  get shell
  at setStatus
  call [ get message ] error
 ]
]
to beginTotp

function [
 try [
  get starry
  at api
  call 'auth/totp/confirm' [ object [
   connectionId [ get state, at connectionId ]
   challengeId [ get state, at totpChallenge ]
   code [ get state, at totpCode ]
  ] ]
  to loaded
  set state totpChallenge ''
  set state totpCode ''
  set state profile [ get loaded ]
  get paintProfile
  call
  get shell
  at setStatus
  call 'Authenticator app enrolled.' info
 ] [
  get_error
  to message
  get shell
  at setStatus
  call [ get message ] error
 ]
]
to confirmTotp

function person limited [
 try [
  get starry
  at api
  call 'auth/users/limit' [ object [
   connectionId [ get state, at connectionId ]
   userId [ get person, at id ]
   limited [ get limited ]
  ] ]
  get person
  at id
  is [ get state, at user, at id ]
  true [
   set state user limited [ get limited ]
  ]
  get state
  at profileDialog
  at close
  call
  get refresh
  call
  get shell
  at setStatus
  call 'Account updated.' info
 ] [
  get_error
  to message
  get shell
  at setStatus
  call [ get message ] error
 ]
]
to setLimited

object [
 renderGate [ get renderGate ]
 openProfile [ get openProfile ]
 signOut [ get signOut ]
]
