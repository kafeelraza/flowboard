import { useDroppable } from '@dnd-kit/core'
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion'
import { MoreHorizontal, Plus } from 'lucide-react'
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { markUndoable } from '../../store/actionCreators.js'
import { boardActions } from '../../store/boardSlice.js'
import { createId } from '../../store/id.js'
import { selectTasksByColumn, taskActions } from '../../store/taskSlice.js'
import { TaskCard } from './TaskCard.jsx'

export function Column({ column, searchQuery = '', priorityFilter = 'all' }) {
  const dispatch = useDispatch()
  const prefersReducedMotion = useReducedMotion()
  const [isRenaming, setIsRenaming] = useState(false)
  const [title, setTitle] = useState(column.title)
  const tasks = useSelector((state) => selectTasksByColumn(state, column._id))
  const visibleTasks = tasks.filter((task) => {
    const query = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !query ||
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query) ||
      task.labels.some((label) => label.text.toLowerCase().includes(query))
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
    return matchesSearch && matchesPriority
  })
  const currentUser = useSelector((state) => state.user.currentUser)
  const { setNodeRef, isOver } = useDroppable({
    id: column._id,
    data: { columnId: column._id },
  })

  const addTask = () => {
    const task = {
      _id: createId('task'),
      boardId: column.boardId,
      columnId: column._id,
      title: 'New task',
      description: 'Add details, subtasks, labels, and priority.',
      subtasks: [],
      labels: [{ text: 'New', color: '#4f46e5' }],
      priority: 'medium',
      dueDate: null,
      assigneeIds: currentUser?._id ? [currentUser._id] : [],
      createdBy: currentUser?._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    dispatch(markUndoable(taskActions.addTask(task)))
  }

  const commitRename = () => {
    setIsRenaming(false)
    if (title.trim() && title !== column.title) {
      dispatch(markUndoable(boardActions.renameColumn({ columnId: column._id, title: title.trim() })))
    }
  }

  const removeColumn = () => {
    if (tasks.length > 0) return
    dispatch(markUndoable(boardActions.removeColumn({ columnId: column._id })))
  }

  return (
    <section ref={setNodeRef} className={`column ${isOver ? 'column-over' : ''}`}>
      <div className="column-header">
        <div className="column-title-wrap">
          {isRenaming ? (
            <input
              className="column-title-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={commitRename}
              onKeyDown={(event) => event.key === 'Enter' && commitRename()}
              autoFocus
            />
          ) : (
            <button className="column-title-button" onClick={() => setIsRenaming(true)}>
              {column.title}
            </button>
          )}
          <span>{visibleTasks.length}</span>
        </div>
        <div className="column-tools">
          <button className="icon-button compact ghost" onClick={addTask} title="Add task" aria-label={`Add task to ${column.title}`}>
            <Plus size={15} />
          </button>
          <button className="icon-button compact ghost" onClick={removeColumn} disabled={tasks.length > 0} title={tasks.length > 0 ? 'Move or delete tasks first' : 'Delete empty column'}>
            <MoreHorizontal size={15} />
          </button>
        </div>
      </div>
      <div className="task-list">
        <AnimatePresence initial={false} mode="popLayout">
          {visibleTasks.map((task) => (
            <TaskCard key={task._id} task={task} />
          ))}
        </AnimatePresence>
        {visibleTasks.length === 0 && (
          <Motion.div
            className="empty-drop-zone"
            initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, height: 80 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
          >
            {tasks.length === 0 ? 'Drop here' : 'No matching tasks'}
          </Motion.div>
        )}
      </div>
      <button className="add-task-ghost" onClick={addTask}>
        <Plus size={15} /> Add task
      </button>
    </section>
  )
}
