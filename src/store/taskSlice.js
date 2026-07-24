import { createEntityAdapter, createSlice } from '@reduxjs/toolkit'
import { taskSeed } from '../data/seed.js'

const tasksAdapter = createEntityAdapter({
  selectId: (task) => task._id,
  sortComparer: (a, b) => a.createdAt - b.createdAt,
})

const taskSlice = createSlice({
  name: 'tasks',
  initialState: tasksAdapter.setAll(tasksAdapter.getInitialState(), taskSeed),
  reducers: {
    hydrateTasksState: (state, action) => {
      tasksAdapter.setAll(state, Object.values(action.payload.entities ?? {}))
    },
    addTask: tasksAdapter.addOne,
    deleteTasksByBoard: (state, action) => {
      const boardId = action.payload
      const ids = Object.values(state.entities)
        .filter((task) => task?.boardId === boardId)
        .map((task) => task._id)
      tasksAdapter.removeMany(state, ids)
    },
    updateTask: (state, action) => {
      const { taskId, changes } = action.payload
      tasksAdapter.updateOne(state, { id: taskId, changes: { ...changes, updatedAt: Date.now() } })
    },
    deleteTask: tasksAdapter.removeOne,
    restoreTask: tasksAdapter.addOne,
    moveTask: (state, action) => {
      const { taskId, toColumnId } = action.payload
      const task = state.entities[taskId]
      if (task) {
        task.columnId = toColumnId
        task.updatedAt = Date.now()
      }
    },
    toggleSubtask: (state, action) => {
      const { taskId, subtaskId } = action.payload
      const subtask = state.entities[taskId]?.subtasks.find((item) => item.id === subtaskId)
      if (subtask) subtask.done = !subtask.done
    },
    setSubtasks: (state, action) => {
      const { taskId, subtasks } = action.payload
      const task = state.entities[taskId]
      if (task) {
        task.subtasks = subtasks
        task.updatedAt = Date.now()
      }
    },
    addSubtask: (state, action) => {
      const { taskId, subtask } = action.payload
      const task = state.entities[taskId]
      if (task) {
        task.subtasks.push(subtask)
        task.updatedAt = Date.now()
      }
    },
    addLabel: (state, action) => {
      const { taskId, label } = action.payload
      const task = state.entities[taskId]
      if (task && !task.labels.some((item) => item.text.toLowerCase() === label.text.toLowerCase())) {
        task.labels.push(label)
        task.updatedAt = Date.now()
      }
    },
    assignUser: (state, action) => {
      const { taskId, userId } = action.payload
      const task = state.entities[taskId]
      if (task && userId && !task.assigneeIds.includes(userId)) {
        task.assigneeIds.push(userId)
        task.updatedAt = Date.now()
      }
    },
  },
})

export const taskActions = taskSlice.actions
export default taskSlice.reducer

export const taskSelectors = tasksAdapter.getSelectors((state) => state.tasks)
export const selectTaskById = (state, taskId) => taskSelectors.selectById(state, taskId)
export const selectTasksByColumn = (state, columnId) => {
  const column = state.board.columnsById[columnId]
  return (column?.taskIds ?? []).map((id) => state.tasks.entities[id]).filter(Boolean)
}
