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
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
const JWT_SECRET = process.env.JWT_SECRET || 'flowboard-local-dev-secret'
let mongoReady = false
const memory = {
  users: new Map(),
  snapshots: new Map(),
  activity: [],
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

const User = mongoose.models.User || mongoose.model('User', userSchema)
const BoardSnapshot = mongoose.models.BoardSnapshot || mongoose.model('BoardSnapshot', boardSnapshotSchema)
const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema)

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

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())
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

app.post('/api/auth/signup', async (req, res) => {
  const { name = 'FlowBoard User', email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })

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

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
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
  const effectiveOwnerId = existing?.ownerId ?? ownerId
  const members = [...new Set([effectiveOwnerId, ...(state?.board?.boardsById?.[boardId]?.members ?? existing?.members ?? [ownerId])].filter(Boolean).map(String))]
  if (state?.board?.boardsById?.[boardId]) {
    state.board.boardsById[boardId].ownerId = effectiveOwnerId
    state.board.boardsById[boardId].members = members
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
  const snapshot = mongoReady ? await BoardSnapshot.findOne({ boardId }) : memory.snapshots.get(boardId)
  if (!snapshot) return res.status(404).json({ error: 'Board not found' })
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
  const email = String(req.body.email ?? '').trim().toLowerCase()
  if (!email) return res.status(400).json({ error: 'Email is required' })

  let snapshot = mongoReady ? await BoardSnapshot.findOne({ boardId }) : memory.snapshots.get(boardId)
  if (!snapshot) return res.status(404).json({ error: 'Board not found' })
  if (canAccessSnapshot(snapshot, req.auth.sub)) {
    snapshot = await normalizeSnapshotOwnership(snapshot, req.auth.sub)
  }
  if (!canAccessSnapshot(snapshot, req.auth.sub)) return res.status(403).json({ error: 'You do not have access to this board' })

  const user = mongoReady ? await User.findOne({ email }) : memory.users.get(email)
  if (!user) return res.status(404).json({ error: 'User must sign up before they can be invited' })

  const invitedUser = publicUser(user)
  const members = [...new Set([snapshot.ownerId, ...snapshotMemberIds(snapshot).filter((id) => !isLegacyUserId(id)), invitedUser._id].filter(Boolean).map(String))]
  const state = snapshot.state
  const board = state?.board?.boardsById?.[boardId]
  if (board) {
    board.members = members
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

  res.json({ ok: true, invitedUser, ownerId: snapshot.ownerId, members })
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
  res.json({
    ownerId: snapshot.ownerId,
    members: members.map((user) => ({ ...user, role: String(user._id) === String(snapshot.ownerId) ? 'Owner' : 'Collaborator' })),
  })
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
  if (board) board.members = members

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

  socket.on('board:join', ({ boardId, user }) => {
    activeBoardId = boardId
    activeUser = { ...user, userId: user._id, cursor: null }
    socket.join(boardId)

    const users = boardPresence.get(boardId) ?? []
    boardPresence.set(boardId, [...users.filter((item) => item.userId !== activeUser.userId), activeUser])
    io.to(boardId).emit('presence:update', boardPresence.get(boardId))
  })

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
    socket.to(boardId).emit('presence:editing', { taskId, userId: activeUser.userId, isEditing: true })
  })

  socket.on('presence:editing:stop', ({ boardId, taskId }) => {
    if (!activeUser) return
    socket.to(boardId).emit('presence:editing', { taskId, userId: activeUser.userId, isEditing: false })
  })

  socket.on('disconnect', () => {
    if (!activeBoardId || !activeUser) return
    const users = (boardPresence.get(activeBoardId) ?? []).filter((user) => user.userId !== activeUser.userId)
    boardPresence.set(activeBoardId, users)
    io.to(activeBoardId).emit('presence:update', users)
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
