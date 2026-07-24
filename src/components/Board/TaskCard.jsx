import { useDraggable } from '@dnd-kit/core'
import { motion as Motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Calendar, CheckSquare, GripVertical, Sparkles, Trash2 } from 'lucide-react'
import { forwardRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { markUndoable } from '../../store/actionCreators.js'
import { selectColumnsInOrder } from '../../store/boardSlice.js'
import { presenceActions } from '../../store/presenceSlice.js'
import { taskActions } from '../../store/taskSlice.js'
import { uiActions } from '../../store/uiSlice.js'
import { Avatar } from '../common/Avatar.jsx'

const priorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

const SPRING = { type: 'spring', stiffness: 420, damping: 38, mass: 1 }

function TaskCardComponent({ task }, forwardedRef) {
  const dispatch = useDispatch()
  const prefersReducedMotion = useReducedMotion()
  const columns = useSelector(selectColumnsInOrder)
  const editingUserId = useSelector((state) => state.presence.editingMap[task._id])
  const editingUser = useSelector((state) => state.presence.onlineUsers.find((user) => user.userId === editingUserId))
  const users = useSelector((state) => state.presence.onlineUsers)
  const currentUser = useSelector((state) => state.user.currentUser)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task._id,
    data: { type: 'task', columnId: task.columnId },
  })
  const columnIndex = columns.findIndex((column) => column._id === task.columnId)

  const moveTo = (offset) => {
    const target = columns[columnIndex + offset]
    if (target) {
      dispatch(markUndoable(taskActions.moveTask({ taskId: task._id, fromColumnId: task.columnId, toColumnId: target._id })))
    }
  }

  const openTask = () => {
    dispatch(presenceActions.startedEditingTask({ taskId: task._id, userId: currentUser?._id }))
    dispatch(uiActions.selectTask(task._id))
  }

  const completed = task.subtasks.filter((subtask) => subtask.done).length
  const progress = task.subtasks.length ? Math.round((completed / task.subtasks.length) * 100) : 0
  const assignees = task.assigneeIds.map((id) => users.find((user) => user.userId === id)).filter(Boolean)
  const isAiAssisted = task.labels.some((label) => label.text.toLowerCase().includes('ai'))
  const dragStyle = prefersReducedMotion
    ? undefined
    : {
        x: transform?.x ?? 0,
        y: transform?.y ?? 0,
      }

  return (
    <Motion.article
      ref={(node) => {
        setNodeRef(node)
        if (typeof forwardedRef === 'function') forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      }}
      layout
      layoutId={task._id}
      style={dragStyle}
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: isDragging ? 1.03 : 1, rotate: isDragging && !prefersReducedMotion ? -1.2 : 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      transition={prefersReducedMotion ? { duration: 0 } : { x: { duration: 0 }, y: { duration: 0 }, default: SPRING }}
      {...attributes}
      {...listeners}
      className={`task-card priority-edge-${task.priority} ${isDragging ? 'dragging' : ''}`}
    >
      {editingUser && editingUser.userId !== currentUser?._id && <div className="editing-badge">{editingUser.name} editing</div>}
      <div className="card-drag" aria-hidden="true">
        <GripVertical size={16} />
      </div>
      <button className="card-body" onClick={openTask}>
        <div className="card-title-row">
          <h3>{task.title}</h3>
          {isAiAssisted && (
            <span className="ai-corner" title="AI-assisted">
              <Sparkles size={13} />
            </span>
          )}
        </div>
        <div className="label-row">
          <span className={`priority ${task.priority}`}>{priorityLabels[task.priority]}</span>
          {task.labels.map((label) => (
            <span key={label.text} className="label" style={{ '--label': label.color }}>
              {label.text}
            </span>
          ))}
        </div>
        {task.description && <p className="card-description">{task.description}</p>}
        {task.subtasks.length > 0 && (
          <div className="card-progress-container">
            <div className="card-progress-header">
              <span>Checklist</span>
              <strong>{progress}%</strong>
            </div>
            <div className="card-progress-track">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        <div className="card-meta">
          {task.subtasks.length > 0 ? (
            <span>
              <CheckSquare size={14} /> {completed}/{task.subtasks.length}
            </span>
          ) : task.dueDate ? (
            <span>
              <Calendar size={14} /> {task.dueDate}
            </span>
          ) : (
            <span>No due date</span>
          )}
          <span className="mini-avatar-stack">
            {assignees.map((user) => (
              <Avatar key={user.userId} name={user.name} color={user.avatarColor} size={22} />
            ))}
          </span>
        </div>
      </button>
      <div className="card-actions">
        <button className="icon-button ghost" onClick={() => moveTo(-1)} disabled={columnIndex === 0} title="Move left">
          <ArrowLeft size={15} />
        </button>
        <button
          className="icon-button ghost danger"
          onClick={() => dispatch(markUndoable(taskActions.deleteTask(task._id)))}
          title="Delete task"
        >
          <Trash2 size={15} />
        </button>
        <button className="icon-button ghost" onClick={() => moveTo(1)} disabled={columnIndex === columns.length - 1} title="Move right">
          <ArrowRight size={15} />
        </button>
      </div>
    </Motion.article>
  )
}

export const TaskCard = forwardRef(TaskCardComponent)
