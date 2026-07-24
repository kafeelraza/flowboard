import { createSlice } from '@reduxjs/toolkit'

const historySlice = createSlice({
  name: 'history',
  initialState: {
    past: [],
    future: [],
    branches: {},
    isTimeTraveling: false,
  },
  reducers: {
    pushHistoryEntry: (state, action) => {
      if (state.future.length > 0) {
        const branchPointId = state.past.at(-1)?.id ?? 'root'
        state.branches[branchPointId] = [...(state.branches[branchPointId] ?? []), ...state.future]
      }
      state.past.push(action.payload)
      state.future = []
    },
    undoPrepared: (state) => {
      state.isTimeTraveling = true
    },
    undoCompleted: (state) => {
      const entry = state.past.pop()
      if (entry) state.future.unshift(entry)
      state.isTimeTraveling = false
    },
    redoPrepared: (state) => {
      state.isTimeTraveling = true
    },
    redoCompleted: (state) => {
      const entry = state.future.shift()
      if (entry) state.past.push(entry)
      state.isTimeTraveling = false
    },
    clearHistory: (state) => {
      state.past = []
      state.future = []
      state.branches = {}
      state.isTimeTraveling = false
    },
  },
})

export const historyActions = historySlice.actions
export default historySlice.reducer
