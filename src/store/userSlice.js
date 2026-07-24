import { createSlice } from '@reduxjs/toolkit'
import { currentUser } from '../data/seed.js'

const userSlice = createSlice({
  name: 'user',
  initialState: {
    currentUser: JSON.parse(localStorage.getItem('flowboard:user') || 'null') ?? currentUser,
    token: localStorage.getItem('flowboard:token'),
    isAuthenticated: Boolean(localStorage.getItem('flowboard:token')),
    authStatus: 'idle',
    authError: null,
  },
  reducers: {
    authStarted: (state) => {
      state.authStatus = 'loading'
      state.authError = null
    },
    authSucceeded: (state, action) => {
      state.currentUser = action.payload.user
      state.token = action.payload.token
      state.isAuthenticated = true
      state.authStatus = 'succeeded'
      state.authError = null
      localStorage.setItem('flowboard:user', JSON.stringify(action.payload.user))
      localStorage.setItem('flowboard:token', action.payload.token)
    },
    authFailed: (state, action) => {
      state.authStatus = 'failed'
      state.authError = action.payload
    },
    logout: (state) => {
      state.currentUser = null
      state.token = null
      state.isAuthenticated = false
      state.authStatus = 'idle'
      state.authError = null
      localStorage.removeItem('flowboard:user')
      localStorage.removeItem('flowboard:token')
    },
    renameCurrentUser: (state, action) => {
      if (state.currentUser) state.currentUser.name = action.payload
    },
  },
})

export const userActions = userSlice.actions
export default userSlice.reducer
