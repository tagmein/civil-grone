import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "crypto"
import { promisify } from "util"
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server"

const scryptAsync = promisify(scrypt)
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
const SESSION_SECONDS = 60 * 60 * 24 * 30
const CHALLENGE_MS = 5 * 60 * 1000
const INVITE_BATCH = 100
const BOOTSTRAP_CODE = "0000-0000"
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

export function createAccounts() {
  return {
    session,
    signup,
    login,
    logout,
    totpBegin,
    totpConfirm,
    totpLogin,
    webauthnRegisterOptions,
    webauthnRegisterVerify,
    webauthnLoginOptions,
    webauthnLoginVerify,
    factorRemove,
    profile,
    invites,
    invitesSend,
    invitesRefill,
    users,
    usersLimit,
    requireUser,
  }
}

export function totpNow(secret, at = Date.now()) {
  return totpCode(secret, Math.floor(at / 30000))
}

export async function ensureAccountSchema(client) {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS grone_user (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL COLLATE NOCASE UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      limited INTEGER NOT NULL DEFAULT 0,
      invited_by TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS grone_invite (
      code TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      batch INTEGER NOT NULL,
      status TEXT NOT NULL,
      used_by TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS grone_session (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS grone_totp (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      secret TEXT NOT NULL,
      label TEXT NOT NULL,
      last_step INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS grone_webauthn (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      public_key TEXT NOT NULL,
      counter INTEGER NOT NULL,
      transports TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS grone_challenge (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      purpose TEXT NOT NULL,
      kind TEXT NOT NULL,
      challenge TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS grone_note_share (
      note_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (note_id, user_id)
    );
  `)
}

async function session(client, request) {
  const hasUsers = (await userCount(client)) > 0
  const token = readCookie(request)
  if (!token) {
    return ok({ user: null, hasUsers })
  }
  const auth = await requireUser(client, request)
  if (auth.response) {
    return ok({ user: null, hasUsers })
  }
  return ok({ user: auth.user, hasUsers: true })
}

async function signup(client, request) {
  const body = request?.body ?? {}
  const username = text(body.username)
  const name = text(body.name)
  const password = body.password == null ? "" : String(body.password)
  const inviteCode = text(body.inviteCode)
  if (!/^[A-Za-z0-9_]{3,32}$/.test(username)) {
    return fail(400, "username must be 3 to 32 letters, numbers, or underscores")
  }
  if (!name || name.length > 80) {
    return fail(400, "name is required")
  }
  if (password.length < 8 || password.length > 200) {
    return fail(400, "password must be at least 8 characters")
  }
  if (!/^\d{4}-\d{4}$/.test(inviteCode)) {
    return fail(400, "invite code is not valid")
  }
  const passwordHash = await hashPassword(password)
  const tx = await client.transaction("write")
  try {
    const count = await userCount(tx)
    let role = "member"
    let invitedBy = null
    if (count === 0) {
      if (inviteCode !== BOOTSTRAP_CODE) {
        await tx.rollback()
        return fail(400, "invite code is not valid")
      }
      role = "superadmin"
    } else {
      if (inviteCode === BOOTSTRAP_CODE) {
        await tx.rollback()
        return fail(400, "invite code is not valid")
      }
      const invite = await tx.execute({
        sql: "SELECT code, owner_id, status FROM grone_invite WHERE code = ?",
        args: [inviteCode],
      })
      const row = invite.rows[0]
      if (!row || text(cell(row, "status", 2)) === "used") {
        await tx.rollback()
        return fail(400, "invite code is not valid")
      }
      const ownerId = text(cell(row, "owner_id", 1))
      const allowed = await tx.execute({
        sql: `WITH RECURSIVE tree(id) AS (
          SELECT id FROM grone_user WHERE invited_by IS NULL AND role = 'superadmin'
          UNION
          SELECT u.id FROM grone_user u INNER JOIN tree ON u.invited_by = tree.id
        )
        SELECT id FROM tree WHERE id = ?`,
        args: [ownerId],
      })
      if (allowed.rows.length === 0) {
        await tx.rollback()
        return fail(400, "invite code is not valid")
      }
      const consumed = await tx.execute({
        sql: "UPDATE grone_invite SET status = 'used', used_by = ? WHERE code = ? AND status != 'used'",
        args: ["pending", inviteCode],
      })
      if (Number(consumed.rowsAffected ?? 0) === 0) {
        await tx.rollback()
        return fail(400, "invite code is not valid")
      }
      invitedBy = ownerId
    }
    const taken = await tx.execute({
      sql: "SELECT id FROM grone_user WHERE username = ?",
      args: [username],
    })
    if (taken.rows.length > 0) {
      await tx.rollback()
      return fail(400, "username is already in use")
    }
    const userId = randomUUID()
    const now = new Date().toISOString()
    await tx.execute({
      sql: `INSERT INTO grone_user (id, username, name, password_hash, role, limited, invited_by, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      args: [userId, username, name, passwordHash, role, invitedBy, now],
    })
    if (invitedBy) {
      await tx.execute({
        sql: "UPDATE grone_invite SET used_by = ? WHERE code = ?",
        args: [userId, inviteCode],
      })
    } else {
      await tx.execute({
        sql: "UPDATE grone_note SET owner_id = ? WHERE owner_id IS NULL OR owner_id = ''",
        args: [userId],
      })
    }
    await insertInvites(tx, userId, 0)
    await tx.commit()
    const user = { id: userId, username, name, role, limited: 0 }
    return await signedIn(client, request, user)
  } catch (error) {
    await tx.rollback()
    if (String(error?.message || "").includes("UNIQUE")) {
      return fail(400, "username is already in use")
    }
    throw error
  }
}

async function login(client, request) {
  const body = request?.body ?? {}
  const username = text(body.username)
  const password = body.password == null ? "" : String(body.password)
  if (!username || !password) {
    return fail(400, "username and password are required")
  }
  const found = await client.execute({
    sql: "SELECT id, username, name, password_hash, role, limited FROM grone_user WHERE username = ?",
    args: [username],
  })
  const row = found.rows[0]
  if (!row || !(await verifyPassword(password, text(cell(row, "password_hash", 3))))) {
    return fail(401, "username or password is incorrect")
  }
  const user = publicUser(row)
  const methods = await factorMethods(client, user.id)
  if (methods.length === 0) {
    return signedIn(client, request, user)
  }
  const challengeId = randomUUID()
  await client.execute({
    sql: `INSERT INTO grone_challenge (id, user_id, purpose, kind, challenge, expires_at)
      VALUES (?, ?, 'login', '', '', ?)`,
    args: [challengeId, user.id, expiry()],
  })
  return ok({ step: "2fa", challengeId, methods })
}

async function logout(client, request) {
  const token = readCookie(request)
  if (token) {
    await client.execute({
      sql: "DELETE FROM grone_session WHERE token_hash = ?",
      args: [hashToken(token)],
    })
  }
  return {
    status: 200,
    json: { ok: true },
    headers: { "set-cookie": sessionCookie("", requestOrigin(request), 0) },
  }
}

async function totpBegin(client, request) {
  const auth = await requireUser(client, request)
  if (auth.response) {
    return auth.response
  }
  const secret = base32Encode(randomBytes(20))
  const challengeId = randomUUID()
  await client.execute({
    sql: `INSERT INTO grone_challenge (id, user_id, purpose, kind, challenge, expires_at)
      VALUES (?, ?, 'enroll', 'totp', ?, ?)`,
    args: [challengeId, auth.user.id, secret, expiry()],
  })
  const label = encodeURIComponent(auth.user.username)
  const otpauth = `otpauth://totp/Civil%20Grone:${label}?secret=${secret}&issuer=Civil%20Grone&algorithm=SHA1&digits=6&period=30`
  return ok({ challengeId, secret, otpauth })
}

async function totpConfirm(client, request) {
  const auth = await requireUser(client, request)
  if (auth.response) {
    return auth.response
  }
  const body = request?.body ?? {}
  const row = await loadChallenge(client, text(body.challengeId), auth.user.id, "enroll")
  if (!row || text(cell(row, "kind", 3)) !== "totp") {
    return fail(400, "enrollment expired")
  }
  const secret = text(cell(row, "challenge", 4))
  const step = totpMatches(secret, body.code, null)
  if (step == null) {
    return fail(400, "code is incorrect")
  }
  await client.execute({
    sql: "DELETE FROM grone_challenge WHERE id = ?",
    args: [text(cell(row, "id", 0))],
  })
  await client.execute({
    sql: `INSERT INTO grone_totp (id, user_id, secret, label, last_step, created_at)
      VALUES (?, ?, ?, 'Authenticator app', ?, ?)`,
    args: [randomUUID(), auth.user.id, secret, step, new Date().toISOString()],
  })
  return profile(client, request)
}

async function totpLogin(client, request) {
  const body = request?.body ?? {}
  const row = await loadChallenge(client, text(body.challengeId), "", "login")
  if (!row) {
    return fail(401, "sign in expired")
  }
  const userId = text(cell(row, "user_id", 1))
  const factors = await client.execute({
    sql: "SELECT id, secret, last_step FROM grone_totp WHERE user_id = ?",
    args: [userId],
  })
  let matched = null
  let factorId = ""
  for (const factor of factors.rows) {
    const step = totpMatches(text(cell(factor, "secret", 1)), body.code, cell(factor, "last_step", 2))
    if (step != null) {
      matched = step
      factorId = text(cell(factor, "id", 0))
      break
    }
  }
  if (matched == null) {
    return fail(401, "code is incorrect")
  }
  await client.execute({
    sql: "UPDATE grone_totp SET last_step = ? WHERE id = ?",
    args: [matched, factorId],
  })
  await client.execute({
    sql: "DELETE FROM grone_challenge WHERE id = ?",
    args: [text(cell(row, "id", 0))],
  })
  const user = await userById(client, userId)
  if (!user) {
    return fail(401, "sign in expired")
  }
  return signedIn(client, request, user)
}

async function webauthnRegisterOptions(client, request) {
  const auth = await requireUser(client, request)
  if (auth.response) {
    return auth.response
  }
  const kind = authenticatorKind(request?.body?.kind)
  if (!kind) {
    return fail(400, "kind must be passkey or security-key")
  }
  const existing = await client.execute({
    sql: "SELECT id, transports FROM grone_webauthn WHERE user_id = ?",
    args: [auth.user.id],
  })
  const { rpID } = relyingParty(request)
  const options = await generateRegistrationOptions({
    rpName: "Civil Grone",
    rpID,
    userName: auth.user.username,
    userID: new TextEncoder().encode(auth.user.id),
    userDisplayName: auth.user.name,
    attestationType: "none",
    preferredAuthenticatorType: kind === "passkey" ? "localDevice" : "securityKey",
    authenticatorSelection: kind === "passkey"
      ? { authenticatorAttachment: "platform", residentKey: "required", userVerification: "required" }
      : { authenticatorAttachment: "cross-platform", residentKey: "discouraged", userVerification: "preferred" },
    excludeCredentials: existing.rows.map((row) => ({
      id: text(cell(row, "id", 0)),
      transports: parseTransports(cell(row, "transports", 1)),
    })),
  })
  const challengeId = randomUUID()
  await client.execute({
    sql: `INSERT INTO grone_challenge (id, user_id, purpose, kind, challenge, expires_at)
      VALUES (?, ?, 'enroll', ?, ?, ?)`,
    args: [challengeId, auth.user.id, kind, options.challenge, expiry()],
  })
  return ok({ challengeId, options })
}

async function webauthnRegisterVerify(client, request) {
  const auth = await requireUser(client, request)
  if (auth.response) {
    return auth.response
  }
  const body = request?.body ?? {}
  const kind = authenticatorKind(body.kind)
  const row = await loadChallenge(client, text(body.challengeId), auth.user.id, "enroll")
  if (!kind || !row || text(cell(row, "kind", 3)) !== kind) {
    return fail(400, "enrollment expired")
  }
  await client.execute({
    sql: "DELETE FROM grone_challenge WHERE id = ?",
    args: [text(cell(row, "id", 0))],
  })
  const { origin, rpID } = relyingParty(request)
  let verified
  try {
    verified = await verifyRegistrationResponse({
      response: body.credential,
      expectedChallenge: text(cell(row, "challenge", 4)),
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: kind === "passkey",
    })
  } catch {
    return fail(400, "could not verify the security credential")
  }
  if (!verified.verified) {
    return fail(400, "could not verify the security credential")
  }
  const credential = verified.registrationInfo.credential
  await client.execute({
    sql: `INSERT INTO grone_webauthn (id, user_id, kind, public_key, counter, transports, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        user_id = excluded.user_id,
        kind = excluded.kind,
        public_key = excluded.public_key,
        counter = excluded.counter,
        transports = excluded.transports`,
    args: [
      credential.id,
      auth.user.id,
      kind,
      Buffer.from(credential.publicKey).toString("base64url"),
      Number(credential.counter ?? 0),
      JSON.stringify(credential.transports ?? []),
      new Date().toISOString(),
    ],
  })
  return profile(client, request)
}

async function webauthnLoginOptions(client, request) {
  const body = request?.body ?? {}
  const kind = authenticatorKind(body.kind)
  const row = await loadChallenge(client, text(body.challengeId), "", "login")
  if (!kind || !row) {
    return fail(401, "sign in expired")
  }
  const userId = text(cell(row, "user_id", 1))
  const creds = await client.execute({
    sql: "SELECT id, transports FROM grone_webauthn WHERE user_id = ? AND kind = ?",
    args: [userId, kind],
  })
  if (creds.rows.length === 0) {
    return fail(400, kind === "passkey" ? "no passkey is enrolled" : "no security key is enrolled")
  }
  const { rpID } = relyingParty(request)
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: kind === "passkey" ? "required" : "preferred",
    allowCredentials: creds.rows.map((item) => ({
      id: text(cell(item, "id", 0)),
      transports: parseTransports(cell(item, "transports", 1)),
    })),
  })
  await client.execute({
    sql: "UPDATE grone_challenge SET challenge = ?, kind = ?, expires_at = ? WHERE id = ?",
    args: [options.challenge, kind, expiry(), text(cell(row, "id", 0))],
  })
  return ok({ options })
}

async function webauthnLoginVerify(client, request) {
  const body = request?.body ?? {}
  const row = await loadChallenge(client, text(body.challengeId), "", "login")
  if (!row || !text(cell(row, "challenge", 4))) {
    return fail(401, "sign in expired")
  }
  const userId = text(cell(row, "user_id", 1))
  const kind = text(cell(row, "kind", 3))
  const credentialId = text(body.credential?.id)
  const stored = await client.execute({
    sql: "SELECT id, public_key, counter, transports, kind FROM grone_webauthn WHERE id = ? AND user_id = ?",
    args: [credentialId, userId],
  })
  const credential = stored.rows[0]
  if (!credential || text(cell(credential, "kind", 4)) !== kind) {
    return fail(400, "could not verify the security credential")
  }
  await client.execute({
    sql: "DELETE FROM grone_challenge WHERE id = ?",
    args: [text(cell(row, "id", 0))],
  })
  const { origin, rpID } = relyingParty(request)
  let verified
  try {
    verified = await verifyAuthenticationResponse({
      response: body.credential,
      expectedChallenge: text(cell(row, "challenge", 4)),
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: kind === "passkey",
      credential: {
        id: text(cell(credential, "id", 0)),
        publicKey: Buffer.from(text(cell(credential, "public_key", 1)), "base64url"),
        counter: Number(cell(credential, "counter", 2) ?? 0),
        transports: parseTransports(cell(credential, "transports", 3)),
      },
    })
  } catch {
    return fail(400, "could not verify the security credential")
  }
  if (!verified.verified) {
    return fail(400, "could not verify the security credential")
  }
  await client.execute({
    sql: "UPDATE grone_webauthn SET counter = ? WHERE id = ?",
    args: [Number(verified.authenticationInfo.newCounter ?? 0), credentialId],
  })
  const user = await userById(client, userId)
  if (!user) {
    return fail(401, "sign in expired")
  }
  return signedIn(client, request, user)
}

async function factorRemove(client, request) {
  const auth = await requireUser(client, request)
  if (auth.response) {
    return auth.response
  }
  const body = request?.body ?? {}
  const id = text(body.id)
  const kind = text(body.kind)
  if (!id) {
    return fail(400, "factor id is required")
  }
  if (kind === "totp") {
    await client.execute({
      sql: "DELETE FROM grone_totp WHERE id = ? AND user_id = ?",
      args: [id, auth.user.id],
    })
  } else if (kind === "passkey" || kind === "security-key") {
    await client.execute({
      sql: "DELETE FROM grone_webauthn WHERE id = ? AND user_id = ? AND kind = ?",
      args: [id, auth.user.id, kind],
    })
  } else {
    return fail(400, "unknown factor")
  }
  return profile(client, request)
}

async function profile(client, request) {
  const auth = await requireUser(client, request)
  if (auth.response) {
    return auth.response
  }
  let user = auth.user
  if (request?.body && Object.prototype.hasOwnProperty.call(request.body, "name")) {
    const name = text(request.body.name)
    if (!name || name.length > 80) {
      return fail(400, "name is required")
    }
    await client.execute({
      sql: "UPDATE grone_user SET name = ? WHERE id = ?",
      args: [name, user.id],
    })
    user = { ...user, name }
  }
  return ok(await profileBody(client, user))
}

async function invites(client, request) {
  const auth = await requireUser(client, request)
  if (auth.response) {
    return auth.response
  }
  return ok(await inviteBody(client, auth.user.id))
}

async function invitesSend(client, request) {
  const auth = await requireUser(client, request)
  if (auth.response) {
    return auth.response
  }
  const code = text(request?.body?.code)
  const found = await client.execute({
    sql: "SELECT code, owner_id, status FROM grone_invite WHERE code = ?",
    args: [code],
  })
  const row = found.rows[0]
  if (!row || text(cell(row, "owner_id", 1)) !== auth.user.id) {
    return fail(404, "invite code not found")
  }
  const status = text(cell(row, "status", 2))
  if (status === "used") {
    return fail(400, "invite code is already used")
  }
  if (status === "open") {
    await client.execute({
      sql: "UPDATE grone_invite SET status = 'sent' WHERE code = ? AND owner_id = ?",
      args: [code, auth.user.id],
    })
  }
  return ok(await inviteBody(client, auth.user.id))
}

async function invitesRefill(client, request) {
  const auth = await requireUser(client, request)
  if (auth.response) {
    return auth.response
  }
  const latest = await latestBatch(client, auth.user.id)
  if (latest != null) {
    const open = await countStatus(client, auth.user.id, latest, "open")
    if (open > 0) {
      return fail(400, "send or use the current invite codes first")
    }
  }
  const tx = await client.transaction("write")
  try {
    await insertInvites(tx, auth.user.id, latest == null ? 0 : latest + 1)
    await tx.commit()
  } catch (error) {
    await tx.rollback()
    throw error
  }
  return ok(await inviteBody(client, auth.user.id))
}

async function users(client, request) {
  const auth = await requireUser(client, request)
  if (auth.response) {
    return auth.response
  }
  if (auth.user.role !== "superadmin") {
    return fail(403, "superadmin required")
  }
  return ok({ users: await listUsers(client) })
}

async function usersLimit(client, request) {
  const auth = await requireUser(client, request)
  if (auth.response) {
    return auth.response
  }
  if (auth.user.role !== "superadmin") {
    return fail(403, "superadmin required")
  }
  const body = request?.body ?? {}
  const userId = text(body.userId)
  const limited = body.limited === 1 || body.limited === true || body.limited === "1"
    ? 1
    : body.limited === 0 || body.limited === false || body.limited === "0"
      ? 0
      : null
  if (!userId || limited == null) {
    return fail(400, "userId and limited are required")
  }
  const updated = await client.execute({
    sql: "UPDATE grone_user SET limited = ? WHERE id = ?",
    args: [limited, userId],
  })
  if (Number(updated.rowsAffected ?? 0) === 0) {
    return fail(404, "user not found")
  }
  return ok({ users: await listUsers(client) })
}

async function requireUser(client, request) {
  const token = readCookie(request)
  if (!token) {
    return { response: fail(401, "sign in required") }
  }
  const result = await client.execute({
    sql: `SELECT u.id, u.username, u.name, u.role, u.limited
      FROM grone_session s
      JOIN grone_user u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?`,
    args: [hashToken(token), new Date().toISOString()],
  })
  if (result.rows.length === 0) {
    return { response: fail(401, "sign in required") }
  }
  return { user: publicUser(result.rows[0]) }
}

async function profileBody(client, user) {
  const factors = []
  const totp = await client.execute({
    sql: "SELECT id, label FROM grone_totp WHERE user_id = ? ORDER BY created_at",
    args: [user.id],
  })
  for (const row of totp.rows) {
    factors.push({
      id: text(cell(row, "id", 0)),
      kind: "totp",
      label: text(cell(row, "label", 1)) || "Authenticator app",
    })
  }
  const keys = await client.execute({
    sql: "SELECT id, kind FROM grone_webauthn WHERE user_id = ? ORDER BY created_at",
    args: [user.id],
  })
  for (const row of keys.rows) {
    const kind = text(cell(row, "kind", 1))
    factors.push({
      id: text(cell(row, "id", 0)),
      kind,
      label: kind === "passkey" ? "Passkey" : "Security key",
    })
  }
  const body = {
    user,
    factors,
    ...(await inviteBody(client, user.id)),
  }
  if (user.role === "superadmin") {
    body.users = await listUsers(client)
  }
  return body
}

async function inviteBody(client, userId) {
  const result = await client.execute({
    sql: "SELECT code, status, batch FROM grone_invite WHERE owner_id = ? ORDER BY batch, code",
    args: [userId],
  })
  const invites = result.rows.map((row) => ({
    code: text(cell(row, "code", 0)),
    status: text(cell(row, "status", 1)),
    batch: Number(cell(row, "batch", 2) ?? 0),
  }))
  const latest = await latestBatch(client, userId)
  const open = invites.filter((item) => item.status === "open" && item.batch === latest).length
  return {
    invites,
    canRefill: latest == null || open === 0,
    open: invites.filter((item) => item.status === "open").length,
    sent: invites.filter((item) => item.status === "sent").length,
    used: invites.filter((item) => item.status === "used").length,
  }
}

async function listUsers(client) {
  const result = await client.execute(
    "SELECT id, username, name, role, limited FROM grone_user ORDER BY created_at, username",
  )
  return result.rows.map(publicUser)
}

async function factorMethods(client, userId) {
  const methods = []
  const keys = await client.execute({
    sql: "SELECT kind FROM grone_webauthn WHERE user_id = ?",
    args: [userId],
  })
  const kinds = new Set(keys.rows.map((row) => text(cell(row, "kind", 0))))
  if (kinds.has("passkey")) {
    methods.push("passkey")
  }
  if (kinds.has("security-key")) {
    methods.push("security-key")
  }
  const totp = await client.execute({
    sql: "SELECT id FROM grone_totp WHERE user_id = ? LIMIT 1",
    args: [userId],
  })
  if (totp.rows.length > 0) {
    methods.push("totp")
  }
  return methods
}

async function signedIn(client, request, user) {
  const token = randomBytes(32).toString("base64url")
  const now = new Date()
  const expires = new Date(now.getTime() + SESSION_SECONDS * 1000).toISOString()
  await client.execute({
    sql: "INSERT INTO grone_session (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    args: [hashToken(token), user.id, expires, now.toISOString()],
  })
  return {
    status: 200,
    json: { user },
    headers: { "set-cookie": sessionCookie(token, requestOrigin(request), SESSION_SECONDS) },
  }
}

async function insertInvites(tx, ownerId, batch) {
  const now = new Date().toISOString()
  const codes = new Set()
  while (codes.size < INVITE_BATCH) {
    const code = `${padCode(randomInt(0, 10000))}-${padCode(randomInt(0, 10000))}`
    if (code === BOOTSTRAP_CODE || codes.has(code)) {
      continue
    }
    const existing = await tx.execute({
      sql: "SELECT code FROM grone_invite WHERE code = ?",
      args: [code],
    })
    if (existing.rows.length > 0) {
      continue
    }
    codes.add(code)
  }
  for (const code of codes) {
    await tx.execute({
      sql: `INSERT INTO grone_invite (code, owner_id, batch, status, used_by, created_at)
        VALUES (?, ?, ?, 'open', NULL, ?)`,
      args: [code, ownerId, batch, now],
    })
  }
}

async function latestBatch(client, userId) {
  const result = await client.execute({
    sql: "SELECT MAX(batch) AS batch FROM grone_invite WHERE owner_id = ?",
    args: [userId],
  })
  const value = cell(result.rows[0], "batch", 0)
  if (value == null) {
    return null
  }
  return Number(value)
}

async function countStatus(client, userId, batch, status) {
  const result = await client.execute({
    sql: "SELECT COUNT(*) AS n FROM grone_invite WHERE owner_id = ? AND batch = ? AND status = ?",
    args: [userId, batch, status],
  })
  return Number(cell(result.rows[0], "n", 0) ?? 0)
}

async function userCount(client) {
  const result = await client.execute("SELECT COUNT(*) AS n FROM grone_user")
  return Number(cell(result.rows[0], "n", 0) ?? 0)
}

async function userById(client, id) {
  const result = await client.execute({
    sql: "SELECT id, username, name, role, limited FROM grone_user WHERE id = ?",
    args: [id],
  })
  return result.rows[0] ? publicUser(result.rows[0]) : null
}

async function loadChallenge(client, id, userId, purpose) {
  if (!id) {
    return null
  }
  const result = await client.execute({
    sql: `SELECT id, user_id, purpose, kind, challenge, expires_at FROM grone_challenge
      WHERE id = ? AND purpose = ? AND expires_at > ?`,
    args: [id, purpose, new Date().toISOString()],
  })
  const row = result.rows[0]
  if (!row) {
    return null
  }
  if (userId && text(cell(row, "user_id", 1)) !== userId) {
    return null
  }
  return row
}

function publicUser(row) {
  return {
    id: text(cell(row, "id", 0)),
    username: text(cell(row, "username", 1)),
    name: text(cell(row, "name", 2)),
    role: text(cell(row, "role", 3)),
    limited: flag(cell(row, "limited", 4)),
  }
}

function authenticatorKind(value) {
  const kind = text(value)
  return kind === "passkey" || kind === "security-key" ? kind : ""
}

function requestOrigin(request) {
  return relyingParty(request).origin
}

function relyingParty(request) {
  const origin = text(request?.origin) || "http://localhost"
  try {
    const url = new URL(origin)
    return { origin: url.origin, rpID: url.hostname }
  } catch {
    return { origin: "http://localhost", rpID: "localhost" }
  }
}

function readCookie(request) {
  const cookie = text(request?.headers?.cookie)
  const match = cookie.match(/(?:^|;\s*)grone_session=([^;]+)/)
  if (!match) {
    return ""
  }
  try {
    return decodeURIComponent(match[1])
  } catch {
    return ""
  }
}

function sessionCookie(token, origin, maxAge) {
  const secure = origin.startsWith("https://") ? "; Secure" : ""
  return `grone_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex")
}

function expiry() {
  return new Date(Date.now() + CHALLENGE_MS).toISOString()
}

function padCode(value) {
  return String(value).padStart(4, "0")
}

async function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = await scryptAsync(password, salt, 32, SCRYPT)
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64url")}$${Buffer.from(hash).toString("base64url")}`
}

async function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$")
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false
  }
  const salt = Buffer.from(parts[4], "base64url")
  const expected = Buffer.from(parts[5], "base64url")
  const hash = await scryptAsync(password, salt, expected.length, {
    N: Number(parts[1]),
    r: Number(parts[2]),
    p: Number(parts[3]),
    maxmem: SCRYPT.maxmem,
  })
  if (hash.length !== expected.length) {
    return false
  }
  return timingSafeEqual(Buffer.from(hash), expected)
}

function totpCode(secret, step) {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(step))
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const binary = ((hmac[offset] & 0x7f) << 24)
    | (hmac[offset + 1] << 16)
    | (hmac[offset + 2] << 8)
    | hmac[offset + 3]
  return String(binary % 1000000).padStart(6, "0")
}

function totpMatches(secret, code, lastStep) {
  const normalized = text(code).replace(/\s/g, "")
  if (!/^\d{6}$/.test(normalized)) {
    return null
  }
  const now = Math.floor(Date.now() / 30000)
  const previous = lastStep == null || lastStep === "" ? null : Number(lastStep)
  for (const step of [now - 1, now, now + 1]) {
    if (previous != null && Number.isFinite(previous) && step <= previous) {
      continue
    }
    const expected = totpCode(secret, step)
    const left = Buffer.from(normalized)
    const right = Buffer.from(expected)
    if (left.length === right.length && timingSafeEqual(left, right)) {
      return step
    }
  }
  return null
}

function base32Encode(buffer) {
  let bits = 0
  let value = 0
  let output = ""
  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += BASE32[(value << (5 - bits)) & 31]
  }
  return output
}

function base32Decode(input) {
  const clean = String(input || "").toUpperCase().replace(/=+$/g, "").replace(/\s/g, "")
  let bits = 0
  let value = 0
  const out = []
  for (const char of clean) {
    const index = BASE32.indexOf(char)
    if (index === -1) {
      continue
    }
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

function parseTransports(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item))
  }
  try {
    const parsed = JSON.parse(text(value) || "[]")
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : []
  } catch {
    return []
  }
}

function cell(row, name, index) {
  if (row && typeof row === "object" && name in row) {
    return row[name]
  }
  return row?.[index]
}

function text(value) {
  return value == null ? "" : String(value).trim()
}

function flag(value) {
  return value === true || value === 1 || value === 1n || value === "1" ? 1 : 0
}

function ok(json) {
  return { status: 200, json }
}

function fail(status, error) {
  return { status, json: { error } }
}
