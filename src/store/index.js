import { configureStore } from '@reduxjs/toolkit'
import boardReducer from './boardSlice.js'
import taskReducer from './taskSlice.js'
import historyReducer from './historySlice.js'
import userReducer from './userSlice.js'
import presenceReducer from './presenceSlice.js'
import activityReducer from './activitySlice.js'
import aiReducer from './aiSlice.js'
import uiReducer from './uiSlice.js'
import { activityMiddleware } from './middleware/activityMiddleware.js'
import { boardSyncMiddleware } from './middleware/boardSyncMiddleware.js'
import { historyMiddleware } from './middleware/historyMiddleware.js'
import { persistMiddleware } from './middleware/persistMiddleware.js'
import { createSocketMiddleware } from './middleware/socketMiddleware.js'

export const store = configureStore({
  reducer: {
    board: boardReducer,
    tasks: taskReducer,
    history: historyReducer,
    user: userReducer,
    presence: presenceReducer,
    activity: activityReducer,
    ai: aiReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(historyMiddleware, boardSyncMiddleware, activityMiddleware, persistMiddleware, createSocketMiddleware()),
})
