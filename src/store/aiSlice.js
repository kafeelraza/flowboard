import { createSlice } from '@reduxjs/toolkit'

const aiSlice = createSlice({
  name: 'ai',
  initialState: {
    status: 'idle',
    lastSuggestion: null,
    error: null,
  },
  reducers: {
    requestStarted: (state) => {
      state.status = 'loading'
      state.error = null
    },
    requestSucceeded: (state, action) => {
      state.status = 'succeeded'
      state.lastSuggestion = action.payload
    },
    requestFailed: (state, action) => {
      state.status = 'failed'
      state.error = action.payload
    },
    clearSuggestion: (state) => {
      state.status = 'idle'
      state.lastSuggestion = null
      state.error = null
    },
  },
})

export const aiActions = aiSlice.actions
export default aiSlice.reducer
