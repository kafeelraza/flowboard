import { activityActions } from '../activitySlice.js'
import { boardActions } from '../boardSlice.js'
import { taskActions } from '../taskSlice.js'
import { createId } from '../id.js'

const actionLabels = {
  [taskActions.addTask.type]: 'created_task',
  [taskActions.deleteTask.type]: 'deleted_task',
  [taskActions.updateTask.type]: 'updated_task',
  [taskActions.moveTask.type]: 'moved_task',
  [boardActions.addColumn.type]: 'created_column',
  [boardActions.renameColumn.type]: 'renamed_column',
}

export const activityMiddleware = (store) => (next) => (action) => {
  const stateBefore = store.getState()
  const result = next(action)

  if (action.meta?.loggable !== false && actionLabels[action.type] && !action.meta?.fromHistory) {
    const user = action.meta?.remoteUser ?? stateBefore.user.currentUser
    const payload = action.payload
    const task =
      payload?.taskId ? stateBefore.tasks.entities[payload.taskId] : payload?._id ? payload : stateBefore.tasks.entities[payload]
    const targetTitle = task?.title ?? payload?.title ?? 'board item'

    store.dispatch(
      activityActions.logActivity({
        id: createId('activity'),
        boardId: stateBefore.board.currentBoardId,
        userId: user?._id ?? user?.userId ?? 'remote',
        userName: user?.name ?? 'Teammate',
        action: actionLabels[action.type],
        targetTitle,
        timestamp: Date.now(),
      }),
    )
  }

  return result
}
