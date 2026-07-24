import { io } from 'socket.io-client'
import { presenceActions } from '../presenceSlice.js'

let socket

export const createSocketMiddleware = () => (store) => {
  const realtimeEnabled =
    import.meta.env.DEV ||
    import.meta.env.VITE_ENABLE_REALTIME === 'true' ||
    Boolean(import.meta.env.VITE_REALTIME_URL)

  if (typeof window !== 'undefined' && realtimeEnabled) {
    socket = io(import.meta.env.VITE_REALTIME_URL || '/', { autoConnect: true })

    socket.on('connect', () => {
      const state = store.getState()
      if (!state.user.currentUser?._id) return
      socket.emit('board:join', {
        boardId: state.board.currentBoardId,
        user: state.user.currentUser,
      })
    })

    socket.on('board:action', ({ action, user }) => {
      store.dispatch({
        ...action,
        meta: { ...action.meta, fromRemote: true, undoable: false, remoteUser: user },
      })
    })

    socket.on('presence:update', (users) => {
      store.dispatch(presenceActions.presenceUpdated(users))
    })

    socket.on('presence:cursor', ({ userId, cursor }) => {
      store.dispatch({ ...presenceActions.cursorMoved({ userId, cursor }), meta: { fromRemote: true } })
    })

    socket.on('presence:editing', ({ taskId, userId, isEditing }) => {
      const action = isEditing
        ? presenceActions.startedEditingTask({ taskId, userId })
        : presenceActions.stoppedEditingTask({ taskId })
      store.dispatch({ ...action, meta: { fromRemote: true } })
    })
  }

  return (next) => (action) => {
    const shouldBroadcast = action.meta?.broadcast && !action.meta?.fromRemote
    if (shouldBroadcast && socket?.connected) {
      const state = store.getState()
      if (!state.user.currentUser?._id) return next(action)
      socket.emit('board:action', {
        boardId: state.board.currentBoardId,
        action,
        user: state.user.currentUser,
      })
    }

    if (action.type === 'presence/cursorMoved' && !action.meta?.fromRemote && socket?.connected) {
      if (!store.getState().user.currentUser?._id) return next(action)
      socket.emit('presence:cursor', {
        boardId: store.getState().board.currentBoardId,
        cursor: action.payload.cursor,
      })
    }

    if (action.type === presenceActions.startedEditingTask.type && !action.meta?.fromRemote && socket?.connected) {
      if (!store.getState().user.currentUser?._id) return next(action)
      socket.emit('presence:editing:start', {
        boardId: store.getState().board.currentBoardId,
        taskId: action.payload.taskId,
      })
    }

    if (action.type === presenceActions.stoppedEditingTask.type && !action.meta?.fromRemote && socket?.connected) {
      if (!store.getState().user.currentUser?._id) return next(action)
      socket.emit('presence:editing:stop', {
        boardId: store.getState().board.currentBoardId,
        taskId: action.payload.taskId,
      })
    }

    return next(action)
  }
}
