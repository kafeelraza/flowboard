import { createSlice } from '@reduxjs/toolkit'
import { collaborators } from '../data/seed.js'

const presenceSlice = createSlice({
  name: 'presence',
  initialState: {
    onlineUsers: collaborators,
    editingMap: { 'task-history': 'u-ana' },
  },
  reducers: {
    presenceUpdated: (state, action) => {
      state.onlineUsers = action.payload
    },
    userJoined: (state, action) => {
      if (!state.onlineUsers.some((user) => user.userId === action.payload.userId)) {
        state.onlineUsers.push(action.payload)
      }
    },
    userLeft: (state, action) => {
      state.onlineUsers = state.onlineUsers.filter((user) => user.userId !== action.payload)
    },
    cursorMoved: (state, action) => {
      const { userId, cursor } = action.payload
      const user = state.onlineUsers.find((item) => item.userId === userId)
      if (user) user.cursor = cursor
    },
    startedEditingTask: (state, action) => {
      state.editingMap[action.payload.taskId] = action.payload.userId
    },
    stoppedEditingTask: (state, action) => {
      delete state.editingMap[action.payload.taskId]
    },
  },
})

export const presenceActions = presenceSlice.actions
export default presenceSlice.reducer
