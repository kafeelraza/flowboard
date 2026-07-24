import { RotateCcw, RotateCw } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'

export function UndoRedoButtons({ compact = false }) {
  const dispatch = useDispatch()
  const pastCount = useSelector((state) => state.history.past.length)
  const futureCount = useSelector((state) => state.history.future.length)

  return (
    <div className={compact ? 'top-icon-group' : 'segmented-actions'}>
      <button className={compact ? 'icon-button compact' : 'toolbar-button'} onClick={() => dispatch({ type: 'history/undo' })} disabled={!pastCount} title="Undo">
        <RotateCcw size={17} /> {!compact && 'Undo'}
      </button>
      <button className={compact ? 'icon-button compact' : 'toolbar-button'} onClick={() => dispatch({ type: 'history/redo' })} disabled={!futureCount} title="Redo">
        <RotateCw size={17} /> {!compact && 'Redo'}
      </button>
    </div>
  )
}
