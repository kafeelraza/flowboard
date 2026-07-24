import { useDispatch, useSelector } from 'react-redux'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Filter, Plus, Search } from 'lucide-react'
import { boardActions, selectBoard, selectColumnsInOrder } from '../../store/boardSlice.js'
import { markUndoable } from '../../store/actionCreators.js'
import { createId } from '../../store/id.js'
import { uiActions } from '../../store/uiSlice.js'
import { AddColumnButton } from './AddColumnButton.jsx'
import { Column } from './Column.jsx'
import { LiveCursor } from './LiveCursor.jsx'

export function BoardCanvas() {
  const dispatch = useDispatch()
  const columns = useSelector(selectColumnsInOrder)
  const board = useSelector(selectBoard)
  const boardCount = useSelector((state) => Object.keys(state.board.boardsById).length)
  const currentUser = useSelector((state) => state.user.currentUser)
  const tasks = useSelector((state) => Object.values(state.tasks.entities).filter((task) => task.boardId === state.board.currentBoardId))
  const remoteUsers = useSelector((state) => state.presence.onlineUsers.filter((user) => user.userId !== state.user.currentUser?._id))
  const selectedDate = useSelector((state) => state.ui.selectedDate)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const doneCount = tasks.filter((task) => task.columnId === 'col-done').length
  const formattedDate = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const createNewBoard = () => {
    const title = window.prompt('Board name', `Untitled Board ${boardCount + 1}`)
    if (!title?.trim()) return
    const boardId = createId('board')
    const starterColumns = ['Backlog', 'In Progress', 'Review', 'Done'].map((title, order) => ({
      _id: createId('col'),
      boardId,
      title,
      order,
      taskIds: [],
    }))
    dispatch(
      markUndoable(
        boardActions.createBoard({
          board: {
            _id: boardId,
            title: title.trim(),
            ownerId: currentUser?._id,
            members: currentUser?._id ? [currentUser._id] : [],
            columns: starterColumns.map((column) => column._id),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          columns: starterColumns,
        }),
      ),
    )
    dispatch(uiActions.setActiveSidebarItem('Projects'))
    dispatch(uiActions.setActiveView('board'))
  }

  return (
    <section className="board-canvas" aria-label="Board canvas">
      <div className="board-dashboard-header">
        <div className="project-title-block">
          <span>Projects / FlowBoard</span>
          <h1>{board.title}</h1>
        </div>
        <div className="date-switcher">
          <button className="icon-button compact ghost" title="Previous day" onClick={() => dispatch(uiActions.shiftSelectedDate(-1))}>
            <ChevronLeft size={15} />
          </button>
          <strong>{formattedDate}</strong>
          <button className="icon-button compact ghost" title="Next day" onClick={() => dispatch(uiActions.shiftSelectedDate(1))}>
            <ChevronRight size={15} />
          </button>
        </div>
        <button className="toolbar-button primary" onClick={createNewBoard}>
          <Plus size={16} /> New Board
        </button>
      </div>
      <div className="board-stat-row">
        <div className="board-stat participants">
          <span>Participants</span>
          <strong>{remoteUsers.length + 1} live</strong>
        </div>
        <div className="board-stat">
          <span>Time</span>
          <strong>1:40</strong>
          <small>to review</small>
        </div>
        <div className="board-stat">
          <span>Activity</span>
          <strong>{Math.round((doneCount / Math.max(tasks.length, 1)) * 100)}%</strong>
          <small>done</small>
        </div>
        <div className="board-filter-bar">
          <Search size={15} />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search tasks" />
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} aria-label="Filter by priority">
            <option value="all">All priorities</option>
            <option value="high">High priority</option>
            <option value="medium">Medium priority</option>
            <option value="low">Low priority</option>
          </select>
          <button onClick={() => {
            setSearchQuery('')
            setPriorityFilter('all')
          }}>
            <Filter size={15} /> Reset
          </button>
        </div>
      </div>
      <div className="board-scroll">
        {columns.map((column) => (
          <Column key={column._id} column={column} searchQuery={searchQuery} priorityFilter={priorityFilter} />
        ))}
        <AddColumnButton />
      </div>
      {remoteUsers.map((user) => (
        <LiveCursor key={user.userId} user={user} />
      ))}
    </section>
  )
}
