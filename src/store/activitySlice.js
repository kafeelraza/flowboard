import { createSlice } from '@reduxjs/toolkit'

const activitySlice = createSlice({
  name: 'activity',
  initialState: {
    entries: [
      {
        id: 'activity-seed-1',
        boardId: 'board-flow',
        userId: 'u-ana',
        userName: 'Ana',
        action: 'reviewed_task',
        targetTitle: 'Hackathon pitch script',
        timestamp: Date.now() - 900000,
      },
      {
        id: 'activity-seed-2',
        boardId: 'board-flow',
        userId: 'u-you',
        userName: 'Kafee',
        action: 'created_task',
        targetTitle: 'Branching undo/redo timeline',
        timestamp: Date.now() - 1500000,
      },
    ],
    unreadCount: 2,
  },
  reducers: {
    logActivity: (state, action) => {
      state.entries.unshift(action.payload)
      state.unreadCount += 1
    },
    markAllRead: (state) => {
      state.unreadCount = 0
    },
  },
})

export const activityActions = activitySlice.actions
export default activitySlice.reducer
