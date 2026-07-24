import { GitBranch, History } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { UndoRedoButtons } from './UndoRedoButtons.jsx'

export function HistoryPanel() {
  const dispatch = useDispatch()
  const { past, future, branches } = useSelector((state) => state.history)
  const currentEntryId = past.at(-1)?.id

  return (
    <section className="panel history-panel">
      <div className="panel-header">
        <h2>
          <History size={18} /> Timeline
        </h2>
        <span>{past.length} actions</span>
      </div>
      <UndoRedoButtons />
      <div className="timeline">
        {past.length === 0 && <p className="empty-text">Make a board change to start the reversible action stream.</p>}
        {[...past].reverse().map((entry) => (
          <button
            className={`timeline-item ${entry.id === currentEntryId ? 'current' : ''}`}
            key={entry.id}
            onClick={() => dispatch({ type: 'history/jumpTo', payload: entry.id })}
            title="Jump to this point"
          >
            <span className="timeline-dot" />
            <div>
              <strong>{entry.description}</strong>
              <small>
                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {entry.id === currentEntryId ? ' - you are here' : ''}
              </small>
            </div>
          </button>
        ))}
      </div>
      {(future.length > 0 || Object.keys(branches).length > 0) && (
        <div className="branch-note">
          <GitBranch size={15} />
          {future.length} redo action{future.length === 1 ? '' : 's'} available, {Object.keys(branches).length} branch point
          {Object.keys(branches).length === 1 ? '' : 's'} preserved.
        </div>
      )}
    </section>
  )
}
