import 'dotenv/config'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import express from 'express'
import http from 'http'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { Server } from 'socket.io'

const app = express()
const server = http.createServer(app)
const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://127.0.0.1:5174,http://localhost:5174,http://127.0.0.1:5173,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
})

const boardPresence = new Map()
const boardEditing = new Map()
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
const JWT_SECRET = process.env.JWT_SECRET || 'flowboard-local-dev-secret'
let mongoReady = false
const memory = {
  users: new Map(),
  snapshots: new Map(),
  activity: [],
  chatMessages: [],
}
const rateBuckets = new Map()

const rateLimit = ({ windowMs = 60_000, max = 120 } = {}) => (req, res, next) => {
  const key = `${req.ip}:${req.path}`
  const now = Date.now()
  const bucket = rateBuckets.get(key) ?? { resetAt: now + windowMs, count: 0 }
  if (now > bucket.resetAt) {
    bucket.resetAt = now + windowMs
    bucket.count = 0
  }
  bucket.count += 1
  rateBuckets.set(key, bucket)
  if (bucket.count > max) return res.status(429).json({ error: 'Too many requests. Please wait a moment.' })
  next()
}

const trimString = (value, max = 400) => String(value ?? '').trim().slice(0, max)

const visiblePresenceForBoard = (boardId) => {
  const usersById = new Map()
  for (const user of boardPresence.get(boardId) ?? []) {
    const visibleUser = { ...user }
    delete visibleUser.socketId
    usersById.set(user.userId, visibleUser)
  }
  return [...usersById.values()]
}

const emitPresenceForBoard = (boardId) => {
  io.to(boardId).emit('presence:update', visiblePresenceForBoard(boardId))
}

const emitEditingForSocket = (socket, boardId) => {
  for (const [taskId, userId] of boardEditing.get(boardId)?.entries() ?? []) {
    socket.emit('presence:editing', { taskId, userId, isEditing: true })
  }
}

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, index: true },
    passwordHash: String,
    avatarColor: String,
  },
  { timestamps: true },
)

const boardSnapshotSchema = new mongoose.Schema(
  {
    boardId: { type: String, index: true },
    ownerId: String,
    members: [{ type: String, index: true }],
    title: String,
    state: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
)

const activitySchema = new mongoose.Schema(
  {
    boardId: String,
    userId: String,
    recipientId: { type: String, index: true },
    userName: String,
    action: String,
    targetTitle: String,
    timestamp: Number,
  },
  { timestamps: true },
)

const chatMessageSchema = new mongoose.Schema(
  {
    boardId: { type: String, index: true },
    userId: String,
    userName: String,
    userEmail: String,
    text: String,
    editedAt: Number,
    deletedAt: Number,
    reactions: [{ emoji: String, userId: String }],
    readBy: [{ userId: String, readAt: Number }],
    timestamp: Number,
  },
  { timestamps: true },
)

const User = mongoose.models.User || mongoose.model('User', userSchema)
const BoardSnapshot = mongoose.models.BoardSnapshot || mongoose.model('BoardSnapshot', boardSnapshotSchema)
const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema)
const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema)

async function connectMongo() {
  if (!process.env.MONGO_URI) return
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 1200 })
    mongoReady = true
    console.log('MongoDB connected')
  } catch (error) {
    mongoReady = false
    console.log(`MongoDB unavailable - using in-memory fallback: ${error.message}`)
  }
}

function publicUser(user) {
  return {
    _id: user._id?.toString?.() ?? user._id,
    name: user.name,
    email: user.email,
    avatarColor: user.avatarColor,
  }
}

function signToken(user) {
  return jwt.sign({ sub: user._id?.toString?.() ?? user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
}

function snapshotMemberIds(snapshot) {
  const stateMembers = snapshot?.state?.board?.boardsById?.[snapshot.boardId]?.members ?? []
  return [...new Set([snapshot?.ownerId, ...(snapshot?.members ?? []), ...stateMembers].filter(Boolean).map(String))]
}

function canAccessSnapshot(snapshot, userId) {
  if (!snapshot?.ownerId || !userId) return true
  return snapshotMemberIds(snapshot).includes(String(userId))
}

function boardRole(snapshot, userId) {
  if (!snapshot || !userId) return null
  if (String(snapshot.ownerId) === String(userId)) return 'owner'
  const roles = snapshot?.state?.board?.boardsById?.[snapshot.boardId]?.memberRoles ?? {}
  return roles[userId] ?? (snapshotMemberIds(snapshot).includes(String(userId)) ? 'editor' : null)
}

function canEditBoard(snapshot, userId) {
  return ['owner', 'editor'].includes(boardRole(snapshot, userId))
}

async function requireBoardAccess(boardId, userId) {
  const snapshot = mongoReady ? await BoardSnapshot.findOne({ boardId }) : memory.snapshots.get(boardId)
  if (!snapshot) return { error: { status: 404, message: 'Board not found' } }
  let normalized = snapshot
  if (userId && canAccessSnapshot(normalized, userId)) {
    normalized = await normalizeSnapshotOwnership(normalized, userId)
  }
  if (userId && !canAccessSnapshot(normalized, userId)) {
    return { error: { status: 403, message: 'You do not have access to this board' } }
  }
  return { snapshot: normalized }
}

function isLegacyUserId(userId) {
  return !userId || !mongoose.Types.ObjectId.isValid(String(userId))
}

async function normalizeSnapshotOwnership(snapshot, userId) {
  if (!snapshot || !userId || !isLegacyUserId(snapshot.ownerId)) return snapshot

  const members = [...new Set([String(userId), ...snapshotMemberIds(snapshot).filter((id) => !isLegacyUserId(id))])]
  const state = snapshot.state
  const board = state?.board?.boardsById?.[snapshot.boardId]
  if (board) {
    board.ownerId = String(userId)
    board.members = members
    board.memberRoles = { ...(board.memberRoles ?? {}), [String(userId)]: 'owner' }
  }

  snapshot.ownerId = String(userId)
  snapshot.members = members
  snapshot.state = state

  if (mongoReady) {
    await BoardSnapshot.findOneAndUpdate({ boardId: snapshot.boardId }, { ownerId: snapshot.ownerId, members, state }, { new: true })
  } else {
    memory.snapshots.set(snapshot.boardId, { ...snapshot, ownerId: snapshot.ownerId, members, state })
  }

  return snapshot
}

async function publicUsersByIds(userIds) {
  const ids = [...new Set(userIds.filter(Boolean).map(String))]
  if (ids.length === 0) return []
  if (mongoReady) {
    const users = await User.find({ _id: { $in: ids } })
    return users.map(publicUser)
  }
  return [...memory.users.values()].filter((user) => ids.includes(String(user._id))).map(publicUser)
}

function authOptional(req, _res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return next()
  try {
    req.auth = jwt.verify(header.slice(7), JWT_SECRET)
  } catch {
    req.auth = null
  }
  next()
}

async function callGroq(systemPrompt, userPrompt) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return null

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status} ${await response.text()}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content ?? ''
  return JSON.parse(text.replace(/```json|```/g, '').trim())
}

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})
app.use(cors({ origin: allowedOrigins }))
app.use(express.json({ limit: '256kb' }))
app.use(authOptional)

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'FlowBoard API',
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    mongoConnected: mongoReady,
    persistence: mongoReady ? 'mongodb' : 'memory',
  })
})

app.post('/api/auth/signup', rateLimit({ max: 12 }), async (req, res) => {
  const name = trimString(req.body.name || 'FlowBoard User', 80)
  const email = trimString(req.body.email, 160).toLowerCase()
  const password = String(req.body.password ?? '')
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'A valid email is required' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

  const avatarColor = ['#2563eb', '#16a34a', '#f59e0b', '#7c3aed'][Math.floor(Math.random() * 4)]
  const passwordHash = await bcrypt.hash(password, 10)

  try {
    let user
    if (mongoReady) {
      user = await User.create({ name, email, passwordHash, avatarColor })
    } else {
      if (memory.users.has(email)) return res.status(409).json({ error: 'User already exists' })
      user = { _id: `user-${Date.now()}`, name, email, passwordHash, avatarColor }
      memory.users.set(email, user)
    }
    res.json({ user: publicUser(user), token: signToken(user) })
  } catch (error) {
    res.status(409).json({ error: error.code === 11000 ? 'User already exists' : error.message })
  }
})

app.post('/api/auth/login', rateLimit({ max: 20 }), async (req, res) => {
  const email = trimString(req.body.email, 160).toLowerCase()
  const password = String(req.body.password ?? '')
  const user = mongoReady ? await User.findOne({ email }) : memory.users.get(email)
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  res.json({ user: publicUser(user), token: signToken(user) })
})

app.get('/api/boards/:boardId/state', async (req, res) => {
  const { boardId } = req.params
  let snapshot = mongoReady ? await BoardSnapshot.findOne({ boardId }) : memory.snapshots.get(boardId)
  if (snapshot && req.auth?.sub && canAccessSnapshot(snapshot, req.auth.sub)) {
    snapshot = await normalizeSnapshotOwnership(snapshot, req.auth.sub)
  }
  if (snapshot && req.auth?.sub && !canAccessSnapshot(snapshot, req.auth.sub)) {
    return res.status(403).json({ error: 'You do not have access to this board' })
  }
  res.json(snapshot?.state ?? null)
})

app.put('/api/boards/:boardId/state', async (req, res) => {
  const { boardId } = req.params
  const state = req.body
  const title = state?.board?.boardsById?.[boardId]?.title ?? 'FlowBoard'
  const ownerId = req.auth?.sub ?? state?.user?.currentUser?._id ?? 'local-user'
  let existing = mongoReady ? await BoardSnapshot.findOne({ boardId }) : memory.snapshots.get(boardId)
  if (existing && req.auth?.sub && canAccessSnapshot(existing, req.auth.sub)) {
    existing = await normalizeSnapshotOwnership(existing, req.auth.sub)
  }
  if (existing && req.auth?.sub && !canAccessSnapshot(existing, req.auth.sub)) {
    return res.status(403).json({ error: 'You do not have access to this board' })
  }
  if (existing && req.auth?.sub && !canEditBoard(existing, req.auth.sub)) {
    return res.status(403).json({ error: 'Viewer access cannot modify this board' })
  }
  const effectiveOwnerId = existing?.ownerId ?? ownerId
  const members = [...new Set([effectiveOwnerId, ...(state?.board?.boardsById?.[boardId]?.members ?? existing?.members ?? [ownerId])].filter(Boolean).map(String))]
  if (state?.board?.boardsById?.[boardId]) {
    state.board.boardsById[boardId].ownerId = effectiveOwnerId
    state.board.boardsById[boardId].members = members
    state.board.boardsById[boardId].memberRoles = {
      ...(existing?.state?.board?.boardsById?.[boardId]?.memberRoles ?? {}),
      ...(state.board.boardsById[boardId].memberRoles ?? {}),
      [effectiveOwnerId]: 'owner',
    }
  }

  if (mongoReady) {
    await BoardSnapshot.findOneAndUpdate({ boardId }, { boardId, ownerId: effectiveOwnerId, members, title, state }, { upsert: true, new: true })
  } else {
    memory.snapshots.set(boardId, { boardId, ownerId: effectiveOwnerId, members, title, state, updatedAt: new Date() })
  }
  res.json({ ok: true, savedAt: Date.now(), persistence: mongoReady ? 'mongodb' : 'memory' })
})

app.get('/api/boards', async (req, res) => {
  if (mongoReady) {
    const query = req.auth?.sub ? { $or: [{ ownerId: req.auth.sub }, { members: req.auth.sub }] } : {}
    const boards = await BoardSnapshot.find(query).sort({ updatedAt: -1 }).select('boardId title updatedAt')
    return res.json(boards)
  }
  const boards = [...memory.snapshots.values()].filter((item) => !req.auth?.sub || snapshotMemberIds(item).includes(req.auth.sub))
  res.json(boards.map((item) => ({ boardId: item.boardId, title: item.title, updatedAt: item.updatedAt })))
})

app.delete('/api/boards/:boardId', async (req, res) => {
  if (!req.auth?.sub) return res.status(401).json({ error: 'Login required' })
  const { boardId } = req.params
  let snapshot = mongoReady ? await BoardSnapshot.findOne({ boardId }) : memory.snapshots.get(boardId)
  if (!snapshot) return res.status(404).json({ error: 'Board not found' })
  if (canAccessSnapshot(snapshot, req.auth.sub)) {
    snapshot = await normalizeSnapshotOwnership(snapshot, req.auth.sub)
  }
  if (String(snapshot.ownerId) !== String(req.auth.sub)) return res.status(403).json({ error: 'Only the owner can delete this board' })

  if (mongoReady) {
    await BoardSnapshot.deleteOne({ boardId })
    await Activity.deleteMany({ boardId })
  } else {
    memory.snapshots.delete(boardId)
    memory.activity = memory.activity.filter((entry) => entry.boardId !== boardId)
  }

  res.json({ ok: true })
})

app.post('/api/boards/:boardId/invite', async (req, res) => {
  if (!req.auth?.sub) return res.status(401).json({ error: 'Login required' })
  const { boardId } = req.params
  const email = trimString(req.body.email, 160).toLowerCase()
  const role = ['viewer', 'editor'].includes(req.body.role) ? req.body.role : 'editor'
  if (!email) return res.status(400).json({ error: 'Email is required' })

  let snapshot = mongoReady ? await BoardSnapshot.findOne({ boardId }) : memory.snapshots.get(boardId)
  if (!snapshot) return res.status(404).json({ error: 'Board not found' })
  if (canAccessSnapshot(snapshot, req.auth.sub)) {
    snapshot = await normalizeSnapshotOwnership(snapshot, req.auth.sub)
  }
  if (!canAccessSnapshot(snapshot, req.auth.sub)) return res.status(403).json({ error: 'You do not have access to this board' })
  if (boardRole(snapshot, req.auth.sub) !== 'owner') return res.status(403).json({ error: 'Only the owner can invite collaborators' })

  const user = mongoReady ? await User.findOne({ email }) : memory.users.get(email)
  if (!user) return res.status(404).json({ error: 'User must sign up before they can be invited' })

  const invitedUser = publicUser(user)
  const members = [...new Set([snapshot.ownerId, ...snapshotMemberIds(snapshot).filter((id) => !isLegacyUserId(id)), invitedUser._id].filter(Boolean).map(String))]
  const state = snapshot.state
  const board = state?.board?.boardsById?.[boardId]
  if (board) {
    board.members = members
    board.memberRoles = { ...(board.memberRoles ?? {}), [snapshot.ownerId]: 'owner', [invitedUser._id]: role }
  }

  if (mongoReady) {
    await BoardSnapshot.findOneAndUpdate({ boardId }, { members, state }, { new: true })
    await Activity.create({
      boardId,
      userId: req.auth.sub,
      recipientId: invitedUser._id,
      userName: req.auth.email ?? 'A teammate',
      action: 'invited_to_board',
      targetTitle: board?.title ?? snapshot.title ?? 'a board',
      timestamp: Date.now(),
    })
  } else {
    memory.snapshots.set(boardId, { ...snapshot, members, state })
    memory.activity.unshift({
      id: `activity-${Date.now()}`,
      boardId,
      userId: req.auth.sub,
      recipientId: invitedUser._id,
      userName: req.auth.email ?? 'A teammate',
      action: 'invited_to_board',
      targetTitle: board?.title ?? snapshot.title ?? 'a board',
      timestamp: Date.now(),
    })
  }

  res.json({ ok: true, invitedUser, ownerId: snapshot.ownerId, members, role })
})

app.get('/api/boards/:boardId/members', async (req, res) => {
  if (!req.auth?.sub) return res.status(401).json({ error: 'Login required' })
  const { boardId } = req.params
  let snapshot = mongoReady ? await BoardSnapshot.findOne({ boardId }) : memory.snapshots.get(boardId)
  if (!snapshot) return res.status(404).json({ error: 'Board not found' })
  if (canAccessSnapshot(snapshot, req.auth.sub)) {
    snapshot = await normalizeSnapshotOwnership(snapshot, req.auth.sub)
  }
  if (!canAccessSnapshot(snapshot, req.auth.sub)) return res.status(403).json({ error: 'You do not have access to this board' })

  const members = await publicUsersByIds(snapshotMemberIds(snapshot))
  const roles = snapshot?.state?.board?.boardsById?.[boardId]?.memberRoles ?? {}
  res.json({
    ownerId: snapshot.ownerId,
    members: members.map((user) => ({ ...user, role: String(user._id) === String(snapshot.ownerId) ? 'Owner' : roles[user._id] === 'viewer' ? 'Viewer' : 'Editor' })),
  })
})

app.patch('/api/boards/:boardId/members/:userId', async (req, res) => {
  if (!req.auth?.sub) return res.status(401).json({ error: 'Login required' })
  const { boardId, userId } = req.params
  const role = ['viewer', 'editor'].includes(req.body.role) ? req.body.role : null
  if (!role) return res.status(400).json({ error: 'Role must be viewer or editor' })
  const snapshot = mongoReady ? await BoardSnapshot.findOne({ boardId }) : memory.snapshots.get(boardId)
  if (!snapshot) return res.status(404).json({ error: 'Board not found' })
  if (String(snapshot.ownerId) !== String(req.auth.sub)) return res.status(403).json({ error: 'Only the owner can change roles' })
  if (String(snapshot.ownerId) === String(userId)) return res.status(400).json({ error: 'Owner role cannot be changed' })

  const state = snapshot.state
  const board = state?.board?.boardsById?.[boardId]
  if (board) {
    board.memberRoles = { ...(board.memberRoles ?? {}), [snapshot.ownerId]: 'owner', [userId]: role }
  }
  if (mongoReady) await BoardSnapshot.findOneAndUpdate({ boardId }, { state }, { new: true })
  else memory.snapshots.set(boardId, { ...snapshot, state })
  res.json({ ok: true, userId, role })
})

app.delete('/api/boards/:boardId/members/:userId', async (req, res) => {
  if (!req.auth?.sub) return res.status(401).json({ error: 'Login required' })
  const { boardId, userId } = req.params
  const snapshot = mongoReady ? await BoardSnapshot.findOne({ boardId }) : memory.snapshots.get(boardId)
  if (!snapshot) return res.status(404).json({ error: 'Board not found' })
  if (String(snapshot.ownerId) !== String(req.auth.sub)) return res.status(403).json({ error: 'Only the owner can remove collaborators' })
  if (String(snapshot.ownerId) === String(userId)) return res.status(400).json({ error: 'Owner cannot be removed' })

  const members = snapshotMemberIds(snapshot).filter((id) => id !== String(userId))
  const state = snapshot.state
  const board = state?.board?.boardsById?.[boardId]
  if (board) {
    board.members = members
    if (board.memberRoles) delete board.memberRoles[userId]
  }

  if (mongoReady) {
    await BoardSnapshot.findOneAndUpdate({ boardId }, { members, state }, { new: true })
  } else {
    memory.snapshots.set(boardId, { ...snapshot, members, state })
  }

  res.json({ ok: true, members })
})

app.get('/api/boards/:boardId/activity', async (req, res) => {
  const { boardId } = req.params
  if (mongoReady) {
    return res.json(await Activity.find({ boardId }).sort({ timestamp: -1 }).limit(50))
  }
  res.json(memory.activity.filter((item) => item.boardId === boardId).slice(0, 50))
})

app.get('/api/activity/inbox', async (req, res) => {
  if (!req.auth?.sub) return res.status(401).json({ error: 'Login required' })
  if (mongoReady) {
    return res.json(await Activity.find({ recipientId: req.auth.sub }).sort({ timestamp: -1 }).limit(50))
  }
  res.json(memory.activity.filter((item) => item.recipientId === req.auth.sub).slice(0, 50))
})

app.post('/api/boards/:boardId/activity', async (req, res) => {
  const entry = { ...req.body, boardId: req.params.boardId, timestamp: req.body.timestamp ?? Date.now() }
  if (mongoReady) await Activity.create(entry)
  else memory.activity.unshift(entry)
  res.json({ ok: true })
})

app.get('/api/boards/:boardId/chat', async (req, res) => {
  if (!req.auth?.sub) return res.status(401).json({ error: 'Login required' })
  const { boardId } = req.params
  const { error } = await requireBoardAccess(boardId, req.auth.sub)
  if (error) return res.status(error.status).json({ error: error.message })

  if (mongoReady) {
    const messages = await ChatMessage.find({ boardId }).sort({ timestamp: -1 }).limit(80)
    return res.json(messages.reverse())
  }
  res.json(memory.chatMessages.filter((message) => message.boardId === boardId).slice(-80))
})

app.post('/api/boards/:boardId/chat', rateLimit({ max: 80 }), async (req, res) => {
  if (!req.auth?.sub) return res.status(401).json({ error: 'Login required' })
  const { boardId } = req.params
  const text = String(req.body.text ?? '').trim()
  if (!text) return res.status(400).json({ error: 'Message text is required' })

  const { error } = await requireBoardAccess(boardId, req.auth.sub)
  if (error) return res.status(error.status).json({ error: error.message })

  const message = {
    boardId,
    userId: req.auth.sub,
    userName: req.body.userName ?? req.auth.email ?? 'Teammate',
    userEmail: req.auth.email,
    text: text.slice(0, 1200),
    reactions: [],
    readBy: [{ userId: req.auth.sub, readAt: Date.now() }],
    timestamp: Date.now(),
  }

  let saved
  if (mongoReady) {
    saved = await ChatMessage.create(message)
  } else {
    saved = { _id: `chat-${Date.now()}`, ...message }
    memory.chatMessages.push(saved)
    memory.chatMessages = memory.chatMessages.slice(-500)
  }

  const publicMessage = saved.toObject?.() ?? saved
  io.to(boardId).emit('chat:message', publicMessage)
  res.json(publicMessage)
})

app.patch('/api/boards/:boardId/chat/:messageId', async (req, res) => {
  if (!req.auth?.sub) return res.status(401).json({ error: 'Login required' })
  const { boardId, messageId } = req.params
  const text = trimString(req.body.text, 1200)
  if (!text) return res.status(400).json({ error: 'Message text is required' })
  const { error } = await requireBoardAccess(boardId, req.auth.sub)
  if (error) return res.status(error.status).json({ error: error.message })

  let message
  if (mongoReady) {
    message = await ChatMessage.findOne({ _id: messageId, boardId })
    if (!message) return res.status(404).json({ error: 'Message not found' })
    if (String(message.userId) !== String(req.auth.sub)) return res.status(403).json({ error: 'Only the sender can edit this message' })
    message.text = text
    message.editedAt = Date.now()
    await message.save()
  } else {
    message = memory.chatMessages.find((item) => String(item._id) === String(messageId) && item.boardId === boardId)
    if (!message) return res.status(404).json({ error: 'Message not found' })
    if (String(message.userId) !== String(req.auth.sub)) return res.status(403).json({ error: 'Only the sender can edit this message' })
    message.text = text
    message.editedAt = Date.now()
  }
  const publicMessage = message.toObject?.() ?? message
  io.to(boardId).emit('chat:message:update', publicMessage)
  res.json(publicMessage)
})

app.delete('/api/boards/:boardId/chat/:messageId', async (req, res) => {
  if (!req.auth?.sub) return res.status(401).json({ error: 'Login required' })
  const { boardId, messageId } = req.params
  const { error } = await requireBoardAccess(boardId, req.auth.sub)
  if (error) return res.status(error.status).json({ error: error.message })

  let message
  if (mongoReady) {
    message = await ChatMessage.findOne({ _id: messageId, boardId })
    if (!message) return res.status(404).json({ error: 'Message not found' })
    if (String(message.userId) !== String(req.auth.sub)) return res.status(403).json({ error: 'Only the sender can delete this message' })
    message.deletedAt = Date.now()
    message.text = ''
    await message.save()
  } else {
    message = memory.chatMessages.find((item) => String(item._id) === String(messageId) && item.boardId === boardId)
    if (!message) return res.status(404).json({ error: 'Message not found' })
    if (String(message.userId) !== String(req.auth.sub)) return res.status(403).json({ error: 'Only the sender can delete this message' })
    message.deletedAt = Date.now()
    message.text = ''
  }
  const publicMessage = message.toObject?.() ?? message
  io.to(boardId).emit('chat:message:update', publicMessage)
  res.json(publicMessage)
})

app.post('/api/boards/:boardId/chat/:messageId/reactions', async (req, res) => {
  if (!req.auth?.sub) return res.status(401).json({ error: 'Login required' })
  const { boardId, messageId } = req.params
  const emoji = ['👍', '❤️', '🔥', '✅'].includes(req.body.emoji) ? req.body.emoji : null
  if (!emoji) return res.status(400).json({ error: 'Unsupported reaction' })
  const { error } = await requireBoardAccess(boardId, req.auth.sub)
  if (error) return res.status(error.status).json({ error: error.message })

  let message
  if (mongoReady) {
    message = await ChatMessage.findOne({ _id: messageId, boardId })
    if (!message) return res.status(404).json({ error: 'Message not found' })
    const existing = message.reactions.find((reaction) => reaction.userId === req.auth.sub && reaction.emoji === emoji)
    message.reactions = existing
      ? message.reactions.filter((reaction) => !(reaction.userId === req.auth.sub && reaction.emoji === emoji))
      : [...message.reactions.filter((reaction) => reaction.userId !== req.auth.sub), { emoji, userId: req.auth.sub }]
    await message.save()
  } else {
    message = memory.chatMessages.find((item) => String(item._id) === String(messageId) && item.boardId === boardId)
    if (!message) return res.status(404).json({ error: 'Message not found' })
    message.reactions ??= []
    const existing = message.reactions.find((reaction) => reaction.userId === req.auth.sub && reaction.emoji === emoji)
    message.reactions = existing
      ? message.reactions.filter((reaction) => !(reaction.userId === req.auth.sub && reaction.emoji === emoji))
      : [...message.reactions.filter((reaction) => reaction.userId !== req.auth.sub), { emoji, userId: req.auth.sub }]
  }
  const publicMessage = message.toObject?.() ?? message
  io.to(boardId).emit('chat:message:update', publicMessage)
  res.json(publicMessage)
})

app.post('/api/boards/:boardId/chat/read', async (req, res) => {
  if (!req.auth?.sub) return res.status(401).json({ error: 'Login required' })
  const { boardId } = req.params
  const { error } = await requireBoardAccess(boardId, req.auth.sub)
  if (error) return res.status(error.status).json({ error: error.message })
  const readAt = Date.now()
  io.to(boardId).emit('chat:read', { boardId, userId: req.auth.sub, readAt })
  res.json({ ok: true, readAt })
})

app.post('/api/ai/breakdown', async (req, res) => {
  const { taskTitle = 'Task' } = req.body

  try {
    const result = await callGroq(
      'You are a project management assistant. Given a task title, break it down into 3-6 concrete, actionable subtasks. Respond ONLY with a JSON array of strings, no other text.',
      `Task: "${taskTitle}"`,
    )
    if (result) {
      return res.json({ subtasks: result })
    }
  } catch (error) {
    console.error('Groq breakdown failed, falling back to heuristic:', error.message)
  }

  res.json({
    subtasks: [
      `Clarify scope for ${taskTitle}`,
      'Split implementation into small changes',
      'Add user-facing polish',
      'Verify the happy path and undo path',
    ],
  })
})

app.post('/api/ai/parse-nl-task', async (req, res) => {
  const text = String(req.body.text ?? '')
  const today = new Date().toISOString().slice(0, 10)

  try {
    const result = await callGroq(
      `Extract structured task data from this natural language request. Respond ONLY with JSON in this exact format: { "title": string, "dueDate": "YYYY-MM-DD" or null, "priority": "low"|"medium"|"high" }. Today's date is ${today}.`,
      `Request: "${text}"`,
    )
    if (result) {
      return res.json(result)
    }
  } catch (error) {
    console.error('Groq parse failed, falling back to heuristic:', error.message)
  }

  res.json({
    title: text.replace(/high priority|low priority|medium priority|urgent|asap/gi, '').trim() || text,
    dueDate: null,
    priority: /high|urgent|asap/i.test(text) ? 'high' : /low/i.test(text) ? 'low' : 'medium',
  })
})

io.on('connection', (socket) => {
  let activeBoardId = null
  let activeUser = null

  const leaveActiveBoard = () => {
    if (!activeBoardId || !activeUser) return
    const boardId = activeBoardId
    const userId = activeUser.userId
    const users = (boardPresence.get(boardId) ?? []).filter((user) => user.socketId !== socket.id)
    boardPresence.set(boardId, users)
    const editing = boardEditing.get(boardId)
    if (editing) {
      for (const [taskId, editingUserId] of editing.entries()) {
        if (editingUserId === userId) {
          editing.delete(taskId)
          socket.to(boardId).emit('presence:editing', { taskId, userId, isEditing: false })
        }
      }
      if (editing.size === 0) boardEditing.delete(boardId)
    }
    socket.leave(boardId)
    activeBoardId = null
    activeUser = null
    emitPresenceForBoard(boardId)
  }

  socket.on('board:join', ({ boardId, user }) => {
    if (!boardId || !user?._id) return
    if (activeBoardId) leaveActiveBoard()

    activeBoardId = boardId
    activeUser = { ...user, userId: user._id, socketId: socket.id, cursor: null }
    socket.join(boardId)

    const users = boardPresence.get(boardId) ?? []
    boardPresence.set(boardId, [...users.filter((item) => item.socketId !== socket.id), activeUser])
    emitPresenceForBoard(boardId)
    emitEditingForSocket(socket, boardId)
  })

  socket.on('board:leave', leaveActiveBoard)

  socket.on('board:action', ({ boardId, action, user }) => {
    socket.to(boardId).emit('board:action', { action, user })
  })

  socket.on('presence:cursor', ({ boardId, cursor }) => {
    if (!activeUser) return
    const users = boardPresence.get(boardId) ?? []
    boardPresence.set(
      boardId,
      users.map((user) => (user.userId === activeUser.userId ? { ...user, cursor } : user)),
    )
    socket.to(boardId).emit('presence:cursor', { userId: activeUser.userId, cursor })
  })

  socket.on('presence:editing:start', ({ boardId, taskId }) => {
    if (!activeUser) return
    if (!boardEditing.has(boardId)) boardEditing.set(boardId, new Map())
    boardEditing.get(boardId).set(taskId, activeUser.userId)
    socket.to(boardId).emit('presence:editing', { taskId, userId: activeUser.userId, isEditing: true })
  })

  socket.on('presence:editing:stop', ({ boardId, taskId }) => {
    if (!activeUser) return
    const editing = boardEditing.get(boardId)
    if (editing?.get(taskId) === activeUser.userId) {
      editing.delete(taskId)
      if (editing.size === 0) boardEditing.delete(boardId)
    }
    socket.to(boardId).emit('presence:editing', { taskId, userId: activeUser.userId, isEditing: false })
  })

  socket.on('chat:typing', ({ boardId, isTyping }) => {
    if (!activeUser) return
    socket.to(boardId).emit('chat:typing', {
      boardId,
      userId: activeUser.userId,
      userName: activeUser.name,
      isTyping: Boolean(isTyping),
    })
  })

  socket.on('disconnect', () => {
    leaveActiveBoard()
  })
})

await connectMongo()

if (!process.env.VERCEL) {
  const port = process.env.PORT || 4000
  server.listen(port, () => {
    console.log(`FlowBoard API and socket server running on port ${port}`)
    if (!process.env.GROQ_API_KEY) {
      console.log('GROQ_API_KEY not set - AI endpoints will use heuristic fallback instead of real Groq calls.')
    }
  })
}

export default app
