import { Check, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { aiActions } from '../../store/aiSlice.js'
import { markUndoable } from '../../store/actionCreators.js'
import { createId } from '../../store/id.js'
import { taskActions } from '../../store/taskSlice.js'

export function QuickAddInput({ compact = false }) {
  const dispatch = useDispatch()
  const [text, setText] = useState('')
  const suggestion = useSelector((state) => state.ai.lastSuggestion)
  const status = useSelector((state) => state.ai.status)
  const currentBoardId = useSelector((state) => state.board.currentBoardId)
  const currentUser = useSelector((state) => state.user.currentUser)

  const parse = async () => {
    if (!text.trim()) return
    dispatch(aiActions.requestStarted())

    try {
      const response = await fetch('/api/ai/parse-nl-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!response.ok) throw new Error(`Request failed with ${response.status}`)
      const result = await response.json()
      dispatch(aiActions.requestSucceeded(result))
    } catch (error) {
      dispatch(aiActions.requestFailed(error.message))
    }
  }

  const confirm = () => {
    const task = {
      _id: createId('task'),
      boardId: currentBoardId,
      columnId: 'col-backlog',
      title: suggestion.title,
      description: 'Created from AI-assisted natural language quick add.',
      subtasks: [],
      labels: [{ text: 'AI draft', color: '#7c3aed' }],
      priority: suggestion.priority,
      dueDate: suggestion.dueDate,
      assigneeIds: currentUser?._id ? [currentUser._id] : [],
      createdBy: currentUser?._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    dispatch(markUndoable(taskActions.addTask(task)))
    dispatch(aiActions.clearSuggestion())
    setText('')
  }

  return (
    <div className="quick-add">
      <div className="quick-input">
        <Sparkles size={18} />
        <input
          id="quick-add-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && parse()}
          placeholder="Fix navbar by Friday, high priority"
        />
        {!compact && (
          <button className="toolbar-button" onClick={parse} disabled={status === 'loading'}>
            {status === 'loading' ? 'Parsing' : 'AI Parse'}
          </button>
        )}
      </div>
      {status === 'failed' && <p className="empty-text">Couldn't reach the AI service - try again.</p>}
      {suggestion && (
        <div className="ai-draft">
          <div>
            <strong>{suggestion.title}</strong>
            <span>{suggestion.priority} priority {suggestion.dueDate ? `- due ${suggestion.dueDate}` : ''}</span>
          </div>
          <button className="icon-button success" onClick={confirm} title="Confirm AI draft">
            <Check size={17} />
          </button>
          <button className="icon-button ghost" onClick={() => dispatch(aiActions.clearSuggestion())} title="Discard AI draft">
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  )
}
