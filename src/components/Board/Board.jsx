import { useSelector } from 'react-redux'
import { selectColumnsInOrder } from '../../store/boardSlice.js'
import { Column } from './Column.jsx'

export function Board() {
  const columns = useSelector(selectColumnsInOrder)

  return (
    <div className="board" aria-label="Kanban board">
      {columns.map((column) => (
        <Column key={column._id} column={column} />
      ))}
    </div>
  )
}
