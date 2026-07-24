import { boardActions } from '../boardSlice.js'
import { taskActions } from '../taskSlice.js'

export const boardSyncMiddleware = (store) => (next) => (action) => {
  const before = store.getState()
  const result = next(action)

  if (action.type === taskActions.addTask.type || action.type === taskActions.restoreTask.type) {
    const task = action.payload
    if (task?.columnId) {
      store.dispatch(boardActions.taskAddedToColumn({ columnId: task.columnId, taskId: task._id }))
    }
  }

  if (action.type === taskActions.deleteTask.type) {
    const task = before.tasks.entities[action.payload]
    if (task?.columnId) {
      store.dispatch(boardActions.taskRemovedFromColumn({ columnId: task.columnId, taskId: action.payload }))
    }
  }

  if (action.type === taskActions.moveTask.type) {
    const { taskId, toColumnId, toIndex } = action.payload
    const fromColumnId = before.tasks.entities[taskId]?.columnId
    if (fromColumnId && toColumnId) {
      store.dispatch(boardActions.taskMovedAcrossColumns({ taskId, fromColumnId, toColumnId, toIndex }))
    }
  }

  return result
}
