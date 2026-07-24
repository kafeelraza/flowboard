import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    selectedTaskId: null,
    isSidePanelOpen: false,
    sidePanelTab: 'history',
    isCommandPaletteOpen: false,
    activeView: 'board',
    activeSidebarItem: 'Projects',
    selectedDate: '2026-07-24',
    theme: 'light',
  },
  reducers: {
    selectTask: (state, action) => {
      state.selectedTaskId = action.payload
    },
    closeTask: (state) => {
      state.selectedTaskId = null
    },
    openSidePanel: (state, action) => {
      state.isSidePanelOpen = true
      state.sidePanelTab = action.payload ?? state.sidePanelTab
    },
    closeSidePanel: (state) => {
      state.isSidePanelOpen = false
    },
    setSidePanelTab: (state, action) => {
      state.sidePanelTab = action.payload
      state.isSidePanelOpen = true
    },
    setActiveView: (state, action) => {
      state.activeView = action.payload
    },
    setActiveSidebarItem: (state, action) => {
      state.activeSidebarItem = action.payload
    },
    shiftSelectedDate: (state, action) => {
      const date = new Date(`${state.selectedDate}T00:00:00`)
      date.setDate(date.getDate() + action.payload)
      state.selectedDate = date.toISOString().slice(0, 10)
    },
    toggleCommandPalette: (state) => {
      state.isCommandPaletteOpen = !state.isCommandPaletteOpen
    },
  },
})

export const uiActions = uiSlice.actions
export default uiSlice.reducer
