const LOCAL_KEY = 'flowboard:offline-state'
const QUEUE_KEY = 'flowboard:offline-queue'
const LAST_WRITE_KEY = 'flowboard:last-write-at'

const persistablePrefixes = ['tasks/', 'board/']
let saveTimer

const getAuthHeaders = (state) => {
  const token = state.user.token || localStorage.getItem('flowboard:token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const buildSnapshot = (state) => ({
  board: state.board,
  tasks: state.tasks,
  user: state.user,
  savedAt: Date.now(),
})

const saveSnapshot = async (state) => {
  if (!state.board.currentBoardId) {
    localStorage.removeItem(LOCAL_KEY)
    localStorage.removeItem(LAST_WRITE_KEY)
    return
  }

  const snapshot = buildSnapshot(state)
  localStorage.setItem(LOCAL_KEY, JSON.stringify(snapshot))
  localStorage.setItem(LAST_WRITE_KEY, String(snapshot.savedAt))

  if (!navigator.onLine) {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
    queue.push({ id: Date.now(), snapshot })
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-10)))
    return
  }

  await fetch(`/api/boards/${state.board.currentBoardId}/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(state) },
    body: JSON.stringify(snapshot),
  })
}

export const flushOfflineQueue = async (state) => {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  if (!navigator.onLine || queue.length === 0) return

  for (const item of queue) {
    if (!item.snapshot.board.currentBoardId) continue
    await fetch(`/api/boards/${item.snapshot.board.currentBoardId}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders(state) },
      body: JSON.stringify(item.snapshot),
    })
  }
  localStorage.removeItem(QUEUE_KEY)
}

export const loadLocalSnapshot = () => JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null')
export const queuedOfflineCount = () => JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]').length
export const lastLocalWriteAt = () => Number(localStorage.getItem(LAST_WRITE_KEY) || 0)
export const rememberRemoteSnapshot = (snapshot) => {
  if (snapshot?.savedAt) localStorage.setItem(LOCAL_KEY, JSON.stringify(snapshot))
}

export const persistMiddleware = (store) => (next) => (action) => {
  const result = next(action)
  const isPersistable = persistablePrefixes.some((prefix) => action.type.startsWith(prefix))
  if (isPersistable && !action.meta?.skipPersist) {
    window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      saveSnapshot(store.getState()).catch(() => {
        const snapshot = buildSnapshot(store.getState())
        const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
        queue.push({ id: Date.now(), snapshot })
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-10)))
      })
    }, 450)
  }
  return result
}
