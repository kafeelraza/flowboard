import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AuthGate } from './components/Auth/AuthGate.jsx'
import { SwiftWorkspace } from './components/Swift/SwiftWorkspace.jsx'
import { taskActions } from './store/taskSlice.js'
import { markUndoable } from './store/actionCreators.js'
import { boardActions } from './store/boardSlice.js'
import { clearLocalSnapshot, flushOfflineQueue, lastLocalWriteAt, loadLocalSnapshot, rememberRemoteSnapshot } from './store/middleware/persistMiddleware.js'
import { presenceActions } from './store/presenceSlice.js'
import { uiActions } from './store/uiSlice.js'

export default function App() {
  const dispatch = useDispatch()
  const isAuthenticated = useSelector((state) => state.user.isAuthenticated)
  const token = useSelector((state) => state.user.token)
  const currentUser = useSelector((state) => state.user.currentUser)
  const currentBoardId = useSelector((state) => state.board.currentBoardId)
  const lastAppliedRemoteAt = useRef(0)
  const [isHydrating, setIsHydrating] = useState(true)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => {
    if (!isAuthenticated) {
      setIsHydrating(false)
      return
    }
    setIsHydrating(true)
    const hydrate = async () => {
      const local = loadLocalSnapshot()

      try {
        const boardsResponse = await fetch('/api/boards', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const boards = await boardsResponse.json()
        const localBoardId = local?.board?.currentBoardId
        const localBoardStillExists = Boolean(localBoardId && boards.some((board) => board.boardId === localBoardId))
        const boardId = localBoardStillExists ? localBoardId : boards?.[0]?.boardId

        if (localBoardId && !localBoardStillExists) {
          clearLocalSnapshot()
        }

        if (!boardId) {
          clearLocalSnapshot()
          dispatch({ ...boardActions.clearBoards(), meta: { skipPersist: true } })
          dispatch({ ...taskActions.clearTasks(), meta: { skipPersist: true } })
          return
        }

        if (localBoardStillExists && local?.board && local?.tasks) {
          dispatch(boardActions.hydrateBoardState(local.board))
          dispatch(taskActions.hydrateTasksState(local.tasks))
        }

        const response = await fetch(`/api/boards/${boardId}/state`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const remote = await response.json()
        if (remote?.board && remote?.tasks) {
          lastAppliedRemoteAt.current = remote.savedAt ?? Date.now()
          rememberRemoteSnapshot(remote)
          dispatch({ ...boardActions.hydrateBoardState(remote.board), meta: { skipPersist: true } })
          dispatch({ ...taskActions.hydrateTasksState(remote.tasks), meta: { skipPersist: true } })
        } else {
          const nextBoardId = boards?.[0]?.boardId
          if (nextBoardId) {
            const nextResponse = await fetch(`/api/boards/${nextBoardId}/state`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            const nextRemote = await nextResponse.json()
            if (nextRemote?.board && nextRemote?.tasks) {
              dispatch({ ...boardActions.hydrateBoardState(nextRemote.board), meta: { skipPersist: true } })
              dispatch({ ...taskActions.hydrateTasksState(nextRemote.tasks), meta: { skipPersist: true } })
            }
          } else {
            dispatch({ ...boardActions.clearBoards(), meta: { skipPersist: true } })
            dispatch({ ...taskActions.clearTasks(), meta: { skipPersist: true } })
          }
        }
      } catch {
        // Local snapshot already keeps the app usable offline.
      } finally {
        setIsHydrating(false)
      }
    }

    hydrate()
  }, [dispatch, isAuthenticated, token])

  useEffect(() => {
    if (!isAuthenticated || !token || !currentBoardId) return
    const realtimeFallbackEnabled = import.meta.env.PROD && import.meta.env.VITE_ENABLE_REALTIME !== 'true'

    if (!realtimeFallbackEnabled) return

    const pollRemoteSnapshot = async () => {
      if (document.visibilityState !== 'visible') return
      const response = await fetch(`/api/boards/${currentBoardId}/state`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const remote = await response.json()
      if (!remote?.board || !remote?.tasks) return

      const remoteSavedAt = remote.savedAt ?? 0
      const localWriteAt = lastLocalWriteAt()
      const remoteIsNewer = remoteSavedAt > Math.max(lastAppliedRemoteAt.current, localWriteAt)

      if (remoteIsNewer) {
        lastAppliedRemoteAt.current = remoteSavedAt
        rememberRemoteSnapshot(remote)
        dispatch({ ...boardActions.hydrateBoardState(remote.board), meta: { skipPersist: true } })
        dispatch({ ...taskActions.hydrateTasksState(remote.tasks), meta: { skipPersist: true } })
      }
    }

    const intervalId = window.setInterval(() => {
      pollRemoteSnapshot().catch(() => {})
    }, 3500)
    pollRemoteSnapshot().catch(() => {})

    return () => window.clearInterval(intervalId)
  }, [currentBoardId, dispatch, isAuthenticated, token])

  useEffect(() => {
    const flush = () => flushOfflineQueue({ user: { token: localStorage.getItem('flowboard:token') } })
    window.addEventListener('online', flush)
    flush()
    return () => window.removeEventListener('online', flush)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault()
        dispatch({ type: 'history/undo' })
      }
      if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))) {
        event.preventDefault()
        dispatch({ type: 'history/redo' })
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        dispatch(uiActions.toggleCommandPalette())
      }
      if (event.key === '/' && !isTyping) {
        event.preventDefault()
        document.getElementById('quick-add-input')?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch])

  useEffect(() => {
    if (!currentUser?._id) return
    const handlePointerMove = (event) => {
      dispatch(
        presenceActions.cursorMoved({
          userId: currentUser?._id,
          cursor: {
            x: Math.round((event.clientX / window.innerWidth) * 100),
            y: Math.round((event.clientY / window.innerHeight) * 100),
          },
        }),
      )
    }
    window.addEventListener('pointermove', handlePointerMove)
    return () => window.removeEventListener('pointermove', handlePointerMove)
  }, [dispatch, currentUser?._id])

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.data.current?.type !== 'task') return
    const taskId = active.id
    const toColumnId = over.data.current?.columnId ?? over.id
    const fromColumnId = active.data.current.columnId
    if (toColumnId && toColumnId !== fromColumnId) {
      dispatch(markUndoable(taskActions.moveTask({ taskId, fromColumnId, toColumnId })))
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {!isAuthenticated ? (
        <AuthGate />
      ) : isHydrating ? (
        <main className="app-loading">
          <div>
            <strong>FlowBoard</strong>
            <span>Loading your workspace...</span>
          </div>
        </main>
      ) : (
      <SwiftWorkspace />
      )}
    </DndContext>
  )
}
