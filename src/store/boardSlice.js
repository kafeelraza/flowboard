import { createSlice } from '@reduxjs/toolkit'

const emptyBoardState = {
  currentBoardId: null,
  boardsById: {},
  columnsById: {},
  columnOrder: [],
}

const boardSlice = createSlice({
  name: 'board',
  initialState: emptyBoardState,
  reducers: {
    setBoard: (state, action) => action.payload,
    hydrateBoardState: (state, action) => {
      const incoming = action.payload
      state.currentBoardId = incoming.currentBoardId
      state.boardsById = incoming.boardsById
      state.columnsById = incoming.columnsById
      state.columnOrder = incoming.columnOrder
    },
    clearBoards: (state) => {
      state.currentBoardId = null
      state.boardsById = {}
      state.columnsById = {}
      state.columnOrder = []
    },
    createBoard: (state, action) => {
      const { board, columns } = action.payload
      state.boardsById[board._id] = board
      columns.forEach((column) => {
        state.columnsById[column._id] = column
      })
      state.currentBoardId = board._id
      state.columnOrder = columns.map((column) => column._id)
    },
    deleteBoard: (state, action) => {
      const boardId = action.payload
      const columnIds = state.boardsById[boardId]?.columns ?? []
      columnIds.forEach((columnId) => {
        delete state.columnsById[columnId]
      })
      delete state.boardsById[boardId]
      const nextBoardId = Object.keys(state.boardsById)[0] ?? null
      state.currentBoardId = nextBoardId
      state.columnOrder = nextBoardId ? state.boardsById[nextBoardId]?.columns ?? [] : []
    },
    addColumn: (state, action) => {
      const column = action.payload
      state.columnsById[column._id] = column
      state.columnOrder.push(column._id)
      state.boardsById[state.currentBoardId].columns = state.columnOrder
    },
    removeColumn: (state, action) => {
      const { columnId } = action.payload
      delete state.columnsById[columnId]
      state.columnOrder = state.columnOrder.filter((id) => id !== columnId)
      state.boardsById[state.currentBoardId].columns = state.columnOrder
    },
    renameColumn: (state, action) => {
      const { columnId, title } = action.payload
      state.columnsById[columnId].title = title
    },
    setBoardMembers: (state, action) => {
      const { boardId = state.currentBoardId, ownerId, members } = action.payload
      const board = state.boardsById[boardId]
      if (board) {
        if (ownerId) board.ownerId = ownerId
        board.members = members
        board.updatedAt = Date.now()
      }
    },
    reorderColumns: (state, action) => {
      state.columnOrder = action.payload.columnOrder
      state.columnOrder.forEach((id, order) => {
        state.columnsById[id].order = order
      })
      state.boardsById[state.currentBoardId].columns = state.columnOrder
    },
    columnTaskIdsChanged: (state, action) => {
      const { columnId, taskIds } = action.payload
      state.columnsById[columnId].taskIds = taskIds
    },
    taskAddedToColumn: (state, action) => {
      const { columnId, taskId, index } = action.payload
      const taskIds = state.columnsById[columnId].taskIds
      const insertAt = Number.isInteger(index) ? index : taskIds.length
      taskIds.splice(insertAt, 0, taskId)
    },
    taskRemovedFromColumn: (state, action) => {
      const { columnId, taskId } = action.payload
      state.columnsById[columnId].taskIds = state.columnsById[columnId].taskIds.filter((id) => id !== taskId)
    },
    taskMovedAcrossColumns: (state, action) => {
      const { taskId, fromColumnId, toColumnId, toIndex } = action.payload
      if (!state.columnsById[fromColumnId] || !state.columnsById[toColumnId]) return
      state.columnsById[fromColumnId].taskIds = state.columnsById[fromColumnId].taskIds.filter((id) => id !== taskId)
      const targetIds = state.columnsById[toColumnId].taskIds.filter((id) => id !== taskId)
      const insertAt = Math.max(0, Math.min(toIndex ?? targetIds.length, targetIds.length))
      targetIds.splice(insertAt, 0, taskId)
      state.columnsById[toColumnId].taskIds = targetIds
    },
  },
})

export const boardActions = boardSlice.actions
export default boardSlice.reducer

export const selectBoard = (state) => state.board.boardsById[state.board.currentBoardId]
export const selectColumnsInOrder = (state) =>
  state.board.columnOrder.map((id) => state.board.columnsById[id]).filter(Boolean)
export const selectColumnById = (state, columnId) => state.board.columnsById[columnId]
