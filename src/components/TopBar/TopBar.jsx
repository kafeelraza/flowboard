import { BarChart3, ChevronDown, KanbanSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { boardActions, selectBoard } from '../../store/boardSlice.js'
import { taskActions } from '../../store/taskSlice.js'
import { uiActions } from '../../store/uiSlice.js'
import { PresenceAvatars } from '../Presence/PresenceAvatars.jsx'
import { QuickAddInput } from '../QuickAdd/QuickAddInput.jsx'
import { UndoRedoButtons } from '../History/UndoRedoButtons.jsx'
import { PanelToggleButtons } from './PanelToggleButtons.jsx'
import { UserMenu } from './UserMenu.jsx'

export function TopBar() {
  const dispatch = useDispatch()
  const board = useSelector(selectBoard)
  const activeView = useSelector((state) => state.ui.activeView)
  const token = useSelector((state) => state.user.token)
  const currentUser = useSelector((state) => state.user.currentUser)
  const [boardsOpen, setBoardsOpen] = useState(false)
  const [boards, setBoards] = useState([])
  const canDeleteCurrentBoard = board?.ownerId === currentUser?._id

  useEffect(() => {
    if (!boardsOpen) return
    fetch('/api/boards', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((response) => response.json())
      .then(setBoards)
      .catch(() => setBoards([]))
  }, [boardsOpen, token])

  const switchBoard = async (boardId) => {
    setBoardsOpen(false)
    const response = await fetch(`/api/boards/${boardId}/state`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const snapshot = await response.json()
    if (snapshot?.board && snapshot?.tasks) {
      dispatch({ ...boardActions.hydrateBoardState(snapshot.board), meta: { skipPersist: true } })
      dispatch({ ...taskActions.hydrateTasksState(snapshot.tasks), meta: { skipPersist: true } })
      dispatch(uiActions.setActiveSidebarItem('Projects'))
      dispatch(uiActions.setActiveView('board'))
    }
  }

  const deleteCurrentBoard = async () => {
    if (!board || !canDeleteCurrentBoard) return
    const ok = window.confirm(`Delete "${board.title}"? This cannot be undone.`)
    if (!ok) return

    const response = await fetch(`/api/boards/${board._id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      window.alert(result.error ?? 'Could not delete board')
      return
    }

    dispatch(taskActions.deleteTasksByBoard(board._id))
    dispatch(boardActions.deleteBoard(board._id))
    setBoards((items) => items.filter((item) => item.boardId !== board._id))
    setBoardsOpen(false)
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand-mark">
          <KanbanSquare size={18} />
          <span>FlowBoard</span>
        </div>
        <span className="separator">/</span>
        <div className="board-switcher-wrap">
          <button className="board-switcher" onClick={() => setBoardsOpen((value) => !value)}>
            {board?.title ?? 'No board selected'}
            <ChevronDown size={15} />
          </button>
          {boardsOpen && (
            <div className="board-dropdown">
              {boards.length === 0 ? (
                <span>No saved boards yet</span>
              ) : (
                boards.map((item) => (
                  <button key={item.boardId} onClick={() => switchBoard(item.boardId)}>
                    {item.title}
                  </button>
                ))
              )}
              {canDeleteCurrentBoard && (
                <button className="danger-text" onClick={deleteCurrentBoard}>
                  Delete current board
                </button>
              )}
            </div>
          )}
        </div>
        <button
          className={`nav-link ${activeView === 'analytics' ? 'active' : ''}`}
          onClick={() => dispatch(uiActions.setActiveView(activeView === 'analytics' ? 'board' : 'analytics'))}
        >
          <BarChart3 size={16} />
          Analytics
        </button>
      </div>

      <QuickAddInput compact />

      <div className="topbar-right">
        <PresenceAvatars />
        <UndoRedoButtons compact />
        <PanelToggleButtons />
        <UserMenu />
      </div>
    </header>
  )
}
