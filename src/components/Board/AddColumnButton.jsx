import { Plus } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { markUndoable } from '../../store/actionCreators.js'
import { boardActions } from '../../store/boardSlice.js'
import { createId } from '../../store/id.js'

export function AddColumnButton() {
  const dispatch = useDispatch()
  const boardId = useSelector((state) => state.board.currentBoardId)
  const order = useSelector((state) => state.board.columnOrder.length)

  const addColumn = () => {
    dispatch(
      markUndoable(
        boardActions.addColumn({
          _id: createId('col'),
          boardId,
          title: 'New column',
          order,
          taskIds: [],
        }),
      ),
    )
  }

  return (
    <button className="add-column-button" onClick={addColumn}>
      <Plus size={18} />
      Add column
    </button>
  )
}
