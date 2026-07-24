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
  const [boardsOpen, setBoardsOpen] = useState(false)
  const [boards, setBoards] = useState([])

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
            {board.title}
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
