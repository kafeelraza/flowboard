import { boardActions } from '../boardSlice.js'
import { historyActions } from '../historySlice.js'
import { taskActions } from '../taskSlice.js'
import { createId } from '../id.js'

const actionType = (actionCreator) => actionCreator.type

const describeAction = (action, stateBefore) => {
  const payload = action.payload
  const task = payload?.taskId ? stateBefore.tasks.entities[payload.taskId] : payload?._id ? stateBefore.tasks.entities[payload._id] : null
  const column = payload?.toColumnId ? stateBefore.board.columnsById[payload.toColumnId] : null

  switch (action.type) {
    case actionType(taskActions.addTask):
      return `created "${payload.title}"`
    case actionType(taskActions.deleteTask):
      return `deleted "${task?.title ?? payload}"`
    case actionType(taskActions.updateTask):
      return `updated "${task?.title ?? 'task'}"`
    case actionType(taskActions.moveTask):
      return `moved "${task?.title ?? 'task'}" to ${column?.title ?? 'another column'}`
    case actionType(taskActions.toggleSubtask):
      return `toggled a subtask on "${task?.title ?? 'task'}"`
    case actionType(taskActions.addSubtask):
      return `added a subtask to "${task?.title ?? 'task'}"`
    case actionType(taskActions.addLabel):
      return `labeled "${task?.title ?? 'task'}"`
    case actionType(taskActions.assignUser):
      return `assigned "${task?.title ?? 'task'}"`
    case actionType(boardActions.addColumn):
      return `added column "${payload.title}"`
    case actionType(boardActions.removeColumn):
      return `removed column "${stateBefore.board.columnsById[payload.columnId]?.title ?? 'column'}"`
    case actionType(boardActions.renameColumn):
      return `renamed a column to "${payload.title}"`
    default:
      return action.type
  }
}

const computeInverseAction = (action, stateBefore) => {
  const payload = action.payload

  switch (action.type) {
    case actionType(taskActions.addTask):
      return taskActions.deleteTask(payload._id)
    case actionType(taskActions.deleteTask):
      return taskActions.restoreTask(stateBefore.tasks.entities[payload])
    case actionType(taskActions.updateTask): {
      const previous = stateBefore.tasks.entities[payload.taskId]
      const revertedChanges = Object.keys(payload.changes).reduce((acc, key) => {
        acc[key] = previous?.[key]
        return acc
      }, {})
      return taskActions.updateTask({ taskId: payload.taskId, changes: revertedChanges })
    }
    case actionType(taskActions.moveTask): {
      const task = stateBefore.tasks.entities[payload.taskId]
      const fromColumnId = task?.columnId
      const fromColumn = stateBefore.board.columnsById[fromColumnId]
      return taskActions.moveTask({
        taskId: payload.taskId,
        fromColumnId: payload.toColumnId,
        toColumnId: fromColumnId,
        toIndex: fromColumn?.taskIds.indexOf(payload.taskId) ?? 0,
      })
    }
    case actionType(taskActions.toggleSubtask):
      return taskActions.toggleSubtask(payload)
    case actionType(taskActions.setSubtasks): {
      const task = stateBefore.tasks.entities[payload.taskId]
      return taskActions.setSubtasks({ taskId: payload.taskId, subtasks: task?.subtasks ?? [] })
    }
    case actionType(taskActions.addSubtask): {
      const task = stateBefore.tasks.entities[payload.taskId]
      return taskActions.setSubtasks({ taskId: payload.taskId, subtasks: task?.subtasks ?? [] })
    }
    case actionType(taskActions.addLabel): {
      const task = stateBefore.tasks.entities[payload.taskId]
      return taskActions.updateTask({ taskId: payload.taskId, changes: { labels: task?.labels ?? [] } })
    }
    case actionType(taskActions.assignUser): {
      const task = stateBefore.tasks.entities[payload.taskId]
      return taskActions.updateTask({ taskId: payload.taskId, changes: { assigneeIds: task?.assigneeIds ?? [] } })
    }
    case actionType(boardActions.addColumn):
      return boardActions.removeColumn({ columnId: payload._id })
    case actionType(boardActions.removeColumn): {
      const column = stateBefore.board.columnsById[payload.columnId]
      return column ? boardActions.addColumn(column) : null
    }
    case actionType(boardActions.renameColumn):
      return boardActions.renameColumn({
        columnId: payload.columnId,
        title: stateBefore.board.columnsById[payload.columnId]?.title,
      })
    default:
      return null
  }
}

export const historyMiddleware = (store) => (next) => (action) => {
  if (action.type === 'history/undo') {
    const entry = store.getState().history.past.at(-1)
    if (!entry) return undefined
    store.dispatch(historyActions.undoPrepared())
    store.dispatch({ ...entry.inverseAction, meta: { ...entry.inverseAction.meta, fromHistory: true, broadcast: true } })
    store.dispatch(historyActions.undoCompleted())
    return entry
  }

  if (action.type === 'history/redo') {
    const entry = store.getState().history.future[0]
    if (!entry) return undefined
    store.dispatch(historyActions.redoPrepared())
    store.dispatch({ ...entry.action, meta: { ...entry.action.meta, fromHistory: true, broadcast: true } })
    store.dispatch(historyActions.redoCompleted())
    return entry
  }

  if (action.type === 'history/jumpTo') {
    const { past, future } = store.getState().history
    const pastIndex = past.findIndex((entry) => entry.id === action.payload)

    if (pastIndex !== -1) {
      const stepsToUndo = past.length - 1 - pastIndex
      for (let i = 0; i < stepsToUndo; i += 1) {
        store.dispatch({ type: 'history/undo' })
      }
      return pastIndex
    }

    const futureIndex = future.findIndex((entry) => entry.id === action.payload)
    if (futureIndex !== -1) {
      const stepsToRedo = futureIndex + 1
      for (let i = 0; i < stepsToRedo; i += 1) {
        store.dispatch({ type: 'history/redo' })
      }
      return futureIndex
    }

    return undefined
  }

  const isUndoable = action.meta?.undoable === true
  const stateBefore = store.getState()
  const result = next(action)
  const isTimeTraveling = store.getState().history.isTimeTraveling

  if (isUndoable && !isTimeTraveling && !action.meta?.fromHistory) {
    const inverseAction = computeInverseAction(action, stateBefore)
    if (inverseAction) {
      store.dispatch(
        historyActions.pushHistoryEntry({
          id: createId('history'),
          action,
          inverseAction,
          userId: stateBefore.user.currentUser?._id,
          userName: stateBefore.user.currentUser?.name,
          timestamp: Date.now(),
          boardId: stateBefore.board.currentBoardId,
          description: describeAction(action, stateBefore),
        }),
      )
    }
  }

  return result
}
