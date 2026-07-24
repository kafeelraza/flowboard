import { Calendar, GripVertical, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { motion as Motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { markUndoable } from '../../store/actionCreators.js'
import { createId } from '../../store/id.js'
import { presenceActions } from '../../store/presenceSlice.js'
import { selectTaskById, taskActions } from '../../store/taskSlice.js'
import { uiActions } from '../../store/uiSlice.js'
import { selectColumnsInOrder } from '../../store/boardSlice.js'
import { Avatar } from '../common/Avatar.jsx'

export function TaskModal({ taskId }) {
  const dispatch = useDispatch()
  const prefersReducedMotion = useReducedMotion()
  const task = useSelector((state) => selectTaskById(state, taskId))
  const columns = useSelector(selectColumnsInOrder)
  const users = useSelector((state) => state.presence.onlineUsers)
  const currentUser = useSelector((state) => state.user.currentUser)
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority] = useState(task?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [pendingAi, setPendingAi] = useState([])
  const [isBreakingDown, setIsBreakingDown] = useState(false)
  const [breakdownError, setBreakdownError] = useState(null)

  if (!task) return null

  const close = () => {
    dispatch(presenceActions.stoppedEditingTask({ taskId }))
    dispatch(uiActions.closeTask())
  }

  const save = () => {
    dispatch(markUndoable(taskActions.updateTask({ taskId, changes: { title, description, priority, dueDate: dueDate || null } })))
    close()
  }

  const addBreakdown = async () => {
    setIsBreakingDown(true)
    setBreakdownError(null)

    try {
      const response = await fetch('/api/ai/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskTitle: title || task.title }),
      })
      if (!response.ok) throw new Error(`Request failed with ${response.status}`)
      const { subtasks } = await response.json()
      setPendingAi(subtasks.map((text) => ({ id: createId('suggestion'), text })))
    } catch (error) {
      setBreakdownError(error.message)
    } finally {
      setIsBreakingDown(false)
    }
  }

  const acceptSuggestions = (accepted = pendingAi) => {
    if (accepted.length === 0) return
    dispatch(
      markUndoable(
        taskActions.setSubtasks({
          taskId,
          subtasks: [...task.subtasks, ...accepted.map((item) => ({ id: createId('subtask'), text: item.text, done: false }))],
        }),
      ),
    )
    setPendingAi(pendingAi.filter((item) => !accepted.some((acceptedItem) => acceptedItem.id === item.id)))
  }

  const deleteTask = () => {
    dispatch(markUndoable(taskActions.deleteTask(taskId)))
    close()
  }

  const addSubtask = () => {
    const text = window.prompt('Subtask text')
    if (!text?.trim()) return
    dispatch(markUndoable(taskActions.addSubtask({ taskId, subtask: { id: createId('subtask'), text: text.trim(), done: false } })))
  }

  const addLabel = () => {
    const text = window.prompt('Label name')
    if (!text?.trim()) return
    dispatch(markUndoable(taskActions.addLabel({ taskId, label: { text: text.trim(), color: '#2563eb' } })))
  }

  const assignSelf = () => {
    dispatch(markUndoable(taskActions.assignUser({ taskId, userId: currentUser?._id })))
  }

  return (
    <Motion.div
      className="modal-backdrop"
      role="presentation"
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <Motion.section
        className="task-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Edit task"
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
      >
        <div className="modal-header">
          <input className="modal-title-input" value={title} onChange={(event) => setTitle(event.target.value)} />
          <button className="icon-button ghost" onClick={close} title="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-control-row">
          <select value={task.columnId} onChange={(event) => dispatch(markUndoable(taskActions.moveTask({ taskId, fromColumnId: task.columnId, toColumnId: event.target.value })))}>
            {columns.map((column) => (
              <option key={column._id} value={column._id}>
                {column.title}
              </option>
            ))}
          </select>
          <select value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
          </select>
          <label className="date-control">
            <Calendar size={15} />
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>
        </div>
        <textarea
          className="description-field"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          placeholder="Description"
        />
        <div className="subtask-box">
          <div className="modal-header compact">
            <h3>Subtasks</h3>
            <button className="toolbar-button" onClick={addBreakdown} disabled={isBreakingDown}>
              <Sparkles size={16} /> {isBreakingDown ? 'Thinking...' : 'Break down with AI'}
            </button>
          </div>
          {breakdownError && <p className="empty-text">Couldn't reach the AI service - try again.</p>}
          {pendingAi.length > 0 && (
            <div className="ai-suggestions">
              <div className="suggestion-header">
                <strong>AI suggestions</strong>
                <button onClick={() => acceptSuggestions()}>Accept all</button>
              </div>
              {pendingAi.map((item) => (
                <div className="suggestion-row" key={item.id}>
                  <span>{item.text}</span>
                  <button onClick={() => acceptSuggestions([item])}>Accept</button>
                  <button onClick={() => setPendingAi(pendingAi.filter((suggestion) => suggestion.id !== item.id))}>Reject</button>
                </div>
              ))}
            </div>
          )}
          {task.subtasks.length === 0 ? (
            <p className="empty-text">No subtasks yet.</p>
          ) : (
            task.subtasks.map((subtask) => (
              <label className="checkbox-row" key={subtask.id}>
                <GripVertical size={14} />
                <input
                  type="checkbox"
                  checked={subtask.done}
                  onChange={() => dispatch(markUndoable(taskActions.toggleSubtask({ taskId, subtaskId: subtask.id })))}
                />
                {subtask.text}
              </label>
            ))
          )}
          <button className="add-subtask-row" onClick={addSubtask}>
            <Plus size={15} /> Add subtask
          </button>
        </div>
        <div className="modal-meta-row">
          <span className="label" style={{ '--label': '#7c3aed' }}>
            AI
          </span>
          {task.labels.map((label) => (
            <span key={label.text} className="label" style={{ '--label': label.color }}>
              {label.text}
            </span>
          ))}
          <button className="add-chip" onClick={addLabel} title="Add label">+</button>
        </div>
        <div className="assignee-row">
          {task.assigneeIds
            .map((id) => users.find((user) => user.userId === id))
            .filter(Boolean)
            .map((user) => (
              <Avatar key={user.userId} name={user.name} color={user.avatarColor} size={24} />
            ))}
          <button className="add-chip" onClick={assignSelf} title="Assign yourself">+</button>
        </div>
        <div className="modal-actions">
          <button className="text-danger-button" onClick={deleteTask}>
            <Trash2 size={15} /> Delete task
          </button>
          <span className="created-meta">Created by Kafee, 2 days ago</span>
          <button className="toolbar-button primary" onClick={save}>
            Save changes
          </button>
        </div>
      </Motion.section>
    </Motion.div>
  )
}
