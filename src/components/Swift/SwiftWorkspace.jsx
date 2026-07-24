import {
  BarChart2,
  BarChart3,
  Bell,
  Calendar,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FolderGit2,
  Kanban,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Mail,
  Moon,
  MoreHorizontal,
  Plus,
  RotateCcw,
  RotateCw,
  Search,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { markUndoable } from '../../store/actionCreators.js'
import { boardActions, selectBoard, selectColumnsInOrder } from '../../store/boardSlice.js'
import { createId } from '../../store/id.js'
import { presenceActions } from '../../store/presenceSlice.js'
import { taskActions } from '../../store/taskSlice.js'
import { userActions } from '../../store/userSlice.js'

const avatarImages = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80',
]

const categoryColors = {
  design: '#a855f7',
  dev: '#0ea5e9',
  qa: '#22c55e',
  marketing: '#f97316',
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'board', label: 'Kanban Board', icon: Kanban },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const avatarFor = (userId = 'user') => {
  const score = [...userId].reduce((total, char) => total + char.charCodeAt(0), 0)
  return avatarImages[score % avatarImages.length]
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const isOverdue = (dateStr) => {
  if (!dateStr) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(`${dateStr}T00:00:00`) < today
}

function Sidebar({ collapsed, setCollapsed, activeTab, setActiveTab, user, onLogout }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <Zap size={20} fill="currentColor" />
        </div>
        <span className="logo-text">Swift</span>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <button key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
              <Icon size={20} />
              <span className="nav-label">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar-wrapper">
            <img className="avatar" src={avatarFor(user?._id)} alt={user?.name ?? 'User'} />
            <div className="status-dot" />
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name ?? 'FlowBoard User'}</span>
            <span className="user-email">{user?.email ?? 'workspace@flowboard.app'}</span>
          </div>
        </div>
        <button className="swift-logout-btn" onClick={onLogout} title="Log out">
          <LogOut size={15} />
        </button>
      </div>

      <button className="sidebar-toggle-btn" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  )
}

function Header({
  board,
  boards,
  boardsOpen,
  setBoardsOpen,
  switchBoard,
  deleteBoard,
  createBoard,
  theme,
  toggleTheme,
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  aiText,
  setAiText,
  parseAiTask,
  aiStatus,
  onAddTaskClick,
  onlineUsers,
  currentUser,
  inboxOpen,
  setInboxOpen,
  inboxEntries,
}) {
  return (
    <header className="header">
      <div className="header-left">
        <span className="header-subtitle">Projects / FlowBoard</span>
        <div className="header-title-row">
          <h1 className="header-title">{board?.title ?? 'Project Kanban'}</h1>
          <div className="swift-board-switcher">
            <button className="theme-toggle-btn" onClick={() => setBoardsOpen((value) => !value)} title="Switch board">
              <ChevronDown size={16} />
            </button>
            {boardsOpen && (
              <div className="swift-popover board-menu">
                {boards.length === 0 ? (
                  <span className="swift-empty">No saved boards yet</span>
                ) : (
                  boards.map((item) => (
                    <button key={item.boardId} onClick={() => switchBoard(item.boardId)}>
                      {item.title}
                    </button>
                  ))
                )}
                <button onClick={createBoard}>
                  <Plus size={14} /> New board
                </button>
                {board && (
                  <button className="danger-menu-item" onClick={deleteBoard}>
                    <Trash2 size={14} /> Delete current board
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="view-tabs">
        <button className={`view-tab ${viewMode === 'board' ? 'active' : ''}`} onClick={() => setViewMode('board')}>
          <Kanban size={16} />
          <span>Board</span>
        </button>
        <button className={`view-tab ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
          <ListFilter size={16} />
          <span>List</span>
        </button>
        <button className={`view-tab ${viewMode === 'calendar' ? 'active' : ''}`} onClick={() => setViewMode('calendar')}>
          <CalendarDays size={16} />
          <span>Calendar</span>
        </button>
      </div>

      <div className="header-right">
        <div className="ai-quick-add">
          <Sparkles size={16} />
          <input value={aiText} onChange={(event) => setAiText(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && parseAiTask()} placeholder="Fix navbar by Friday, high priority" />
          <button onClick={parseAiTask} disabled={aiStatus === 'loading'}>{aiStatus === 'loading' ? 'AI...' : 'AI'}</button>
        </div>
        <div className="search-container">
          <Search size={16} className="search-icon" />
          <input className="search-input" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search tasks..." />
        </div>
        <div className="swift-live-stack" title={`${onlineUsers.length + (currentUser?._id ? 1 : 0)} live`}>
          {[currentUser, ...onlineUsers.map((user) => ({ _id: user.userId, name: user.name }))].filter(Boolean).slice(0, 4).map((user) => (
            <img key={user._id} src={avatarFor(user._id)} alt={user.name} />
          ))}
        </div>
        <button className="theme-toggle-btn" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))} title="Undo">
          <RotateCcw size={18} />
        </button>
        <button className="theme-toggle-btn" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }))} title="Redo">
          <RotateCw size={18} />
        </button>
        <div className="swift-board-switcher">
          <button className="theme-toggle-btn" onClick={() => setInboxOpen((value) => !value)} title="Notifications">
            <Bell size={18} />
            {inboxEntries.length > 0 && <span className="swift-dot" />}
          </button>
          {inboxOpen && (
            <div className="swift-popover inbox-menu">
              <strong>Notifications</strong>
              {inboxEntries.length === 0 ? (
                <span className="swift-empty">No updates yet</span>
              ) : (
                inboxEntries.slice(0, 6).map((entry) => (
                  <span key={entry.id ?? entry._id} className="inbox-entry">
                    {entry.userName ?? 'FlowBoard'} {String(entry.action ?? 'updated').replaceAll('_', ' ')}
                    {entry.targetTitle ? `: ${entry.targetTitle}` : ''}
                  </span>
                ))
              )}
            </div>
          )}
        </div>
        <button className="theme-toggle-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="action-btn" onClick={createBoard}>
          <Plus size={16} />
          <span>New Board</span>
        </button>
        <button className="action-btn" onClick={onAddTaskClick}>
          <Plus size={16} />
          <span>Add Task</span>
        </button>
      </div>
    </header>
  )
}

function KanbanCard({ task, onCardClick, onDragStart, onDragEnd }) {
  const totalSubtasks = task.checklist.length
  const completedSubtasks = task.checklist.filter((subtask) => subtask.completed).length
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0
  const cardClasses = task.tags.map((tag) => `card-${tag.toLowerCase()}`).join(' ')

  return (
    <div className={`kanban-card ${cardClasses}`} draggable onDragStart={(event) => onDragStart(event, task)} onDragEnd={onDragEnd} onClick={() => onCardClick(task)}>
      {task.tags.length > 0 && (
        <div className="card-tags">
          {task.tags.map((tag) => (
            <span key={tag} className={`card-tag tag-${tag.toLowerCase()}`}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <h3 className="card-title">{task.title}</h3>
      {task.description && <p className="card-description">{task.description}</p>}

      {totalSubtasks > 0 && (
        <div className="card-progress-container">
          <div className="card-progress-header">
            <span>Progress</span>
            <span>{completedSubtasks}/{totalSubtasks} tasks</span>
          </div>
          <div className="card-progress-bar-bg">
            <div className="card-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      <div className="card-footer">
        <div className="card-meta">
          {task.dueDate && (
            <div className={`meta-item ${isOverdue(task.dueDate) && task.columnId !== 'done' ? 'overdue' : ''}`}>
              <Calendar size={13} />
              <span>{formatDate(task.dueDate)}</span>
            </div>
          )}
          {totalSubtasks > 0 && (
            <div className="meta-item">
              <CheckSquare size={13} />
              <span>{completedSubtasks}/{totalSubtasks}</span>
            </div>
          )}
        </div>

        {task.assignees.length > 0 && (
          <div className="avatar-group">
            {task.assignees.slice(0, 3).map((assignee) => (
              <img key={assignee.id} className="avatar-group-item" src={assignee.avatar} alt={assignee.name} title={assignee.name} />
            ))}
            {task.assignees.length > 3 && <div className="avatar-overflow">+{task.assignees.length - 3}</div>}
          </div>
        )}
      </div>
    </div>
  )
}

function KanbanColumn({ column, tasks, onCardClick, onDragStart, onDragEnd, onDropCard, onQuickAddClick }) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragOver(false)
    onDropCard(event, column.id)
  }

  return (
    <div className={`kanban-column ${isDragOver ? 'drag-over' : ''}`} onDragOver={(event) => { event.preventDefault(); setIsDragOver(true) }} onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop}>
      <div className="column-header">
        <div className="column-header-left">
          <div className="column-dot" />
          <span className="column-title">{column.title}</span>
          <span className="column-count">{tasks.length}</span>
        </div>
        <div className="column-actions">
          <button className="column-action-btn" onClick={() => onQuickAddClick(column.id)} title="Add task to this column">
            <Plus size={16} />
          </button>
          <button className="column-action-btn" title="Column options">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      <div className="cards-container">
        {tasks.length > 0 ? (
          tasks.map((task) => <KanbanCard key={task.id} task={task} onCardClick={onCardClick} onDragStart={onDragStart} onDragEnd={onDragEnd} />)
        ) : (
          <div className="column-empty-state">
            <span>No tasks here</span>
            <span style={{ fontSize: '10px' }}>Drag tasks or click + to add</span>
          </div>
        )}
      </div>
    </div>
  )
}

function KanbanBoard({ columns, tasks, searchQuery, onCardClick, onDragStart, onDragEnd, onDropCard, onQuickAddClick }) {
  const q = searchQuery.trim().toLowerCase()
  const filteredTasks = tasks.filter((task) => !q || task.title.toLowerCase().includes(q) || task.description?.toLowerCase().includes(q) || task.tags.some((tag) => tag.toLowerCase().includes(q)))

  return (
    <div className="board-container">
      {columns.map((column) => (
        <KanbanColumn
          key={column.id}
          column={column}
          tasks={filteredTasks.filter((task) => task.columnId === column.id)}
          onCardClick={onCardClick}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDropCard={onDropCard}
          onQuickAddClick={onQuickAddClick}
        />
      ))}
    </div>
  )
}

function ListView({ tasks, columns, searchQuery, onCardClick }) {
  const q = searchQuery.trim().toLowerCase()
  const filteredTasks = tasks.filter((task) => !q || task.title.toLowerCase().includes(q) || task.description?.toLowerCase().includes(q) || task.tags.some((tag) => tag.toLowerCase().includes(q)))
  const columnTitles = new Map(columns.map((column) => [column.id, column.title]))

  return (
    <div className="list-view-container">
      <div className="list-header">
        <span>Task</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Due Date</span>
      </div>
      {filteredTasks.map((task) => (
        <button key={task.id} className="list-row" onClick={() => onCardClick(task)}>
          <div>
            <strong>{task.title}</strong>
            <small>{task.description}</small>
          </div>
          <span>{columnTitles.get(task.columnId)}</span>
          <span className={`card-tag tag-${task.priority}`}>{task.priority}</span>
          <span>{formatDate(task.dueDate)}</span>
        </button>
      ))}
    </div>
  )
}

function CardModal({ isOpen, onClose, task, columnId, onSave, onDelete, currentUser }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [category, setCategory] = useState('dev')
  const [dueDate, setDueDate] = useState('')
  const [checklist, setChecklist] = useState([])
  const [newSubtask, setNewSubtask] = useState('')

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setPriority(task.priority ?? 'medium')
      setCategory(task.category ?? 'dev')
      setDueDate(task.dueDate ?? '')
      setChecklist(task.checklist ?? [])
    } else {
      setTitle('')
      setDescription('')
      setPriority('medium')
      setCategory('dev')
      setDueDate('')
      setChecklist([])
    }
  }, [task, isOpen])

  if (!isOpen) return null

  const handleSave = () => {
    if (!title.trim()) return
    onSave({
      ...task,
      title: title.trim(),
      description,
      priority,
      category,
      dueDate,
      checklist,
      assigneeIds: task?.assigneeIds?.length ? task.assigneeIds : currentUser?._id ? [currentUser._id] : [],
      columnId: task?.columnId ?? columnId,
    })
  }

  const addSubtask = () => {
    if (!newSubtask.trim()) return
    setChecklist((items) => [...items, { id: createId('sub'), text: newSubtask.trim(), completed: false }])
    setNewSubtask('')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <h2>{task ? 'Edit Task' : 'Add New Task'}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <span className="modal-section-title">Title</span>
            <input className="modal-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Task title" />
          </div>
          <div className="modal-section">
            <span className="modal-section-title">Description</span>
            <textarea className="modal-textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Task details" rows={4} />
          </div>
          <div className="modal-grid">
            <div className="modal-section">
              <span className="modal-section-title">Priority</span>
              <select className="modal-select" value={priority} onChange={(event) => setPriority(event.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="modal-section">
              <span className="modal-section-title">Category</span>
              <select className="modal-select" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="dev">Dev</option>
                <option value="design">Design</option>
                <option value="qa">QA</option>
                <option value="marketing">Marketing</option>
              </select>
            </div>
            <div className="modal-section">
              <span className="modal-section-title">Due date</span>
              <input className="modal-input" type="date" value={dueDate ?? ''} onChange={(event) => setDueDate(event.target.value)} />
            </div>
          </div>
          <div className="modal-section">
            <span className="modal-section-title">Checklist</span>
            <div className="checklist-items">
              {checklist.map((item) => (
                <label key={item.id} className="checklist-item">
                  <input type="checkbox" checked={item.completed} onChange={() => setChecklist((items) => items.map((subtask) => subtask.id === item.id ? { ...subtask, completed: !subtask.completed } : subtask))} />
                  <span>{item.text}</span>
                  <button type="button" onClick={() => setChecklist((items) => items.filter((subtask) => subtask.id !== item.id))}>
                    <Trash2 size={14} />
                  </button>
                </label>
              ))}
            </div>
            <div className="add-subtask-control">
              <input className="modal-input" value={newSubtask} onChange={(event) => setNewSubtask(event.target.value)} placeholder="Add checklist item" />
              <button className="action-btn" onClick={addSubtask}>
                <Plus size={14} /> Add
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {task && (
            <button className="delete-btn" onClick={() => onDelete(task.id)}>
              <Trash2 size={16} /> Delete
            </button>
          )}
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="save-btn" onClick={handleSave}>{task ? 'Save Changes' : 'Create Task'}</button>
        </div>
      </div>
    </div>
  )
}

export function SwiftWorkspace() {
  const dispatch = useDispatch()
  const board = useSelector(selectBoard)
  const sourceColumns = useSelector(selectColumnsInOrder)
  const sourceTasks = useSelector((state) => Object.values(state.tasks.entities).filter((task) => task.boardId === state.board.currentBoardId))
  const currentBoardId = useSelector((state) => state.board.currentBoardId)
  const token = useSelector((state) => state.user.token)
  const currentUser = useSelector((state) => state.user.currentUser)
  const onlineUsers = useSelector((state) => state.presence.onlineUsers)
  const activity = useSelector((state) => state.activity.entries.filter((entry) => entry.boardId === state.board.currentBoardId).slice(0, 6))
  const [theme, setTheme] = useState(() => localStorage.getItem('flowboard:theme') || 'light')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('board')
  const [viewMode, setViewMode] = useState('board')
  const [searchQuery, setSearchQuery] = useState('')
  const [boardsOpen, setBoardsOpen] = useState(false)
  const [boards, setBoards] = useState([])
  const [inboxOpen, setInboxOpen] = useState(false)
  const [inboxEntries, setInboxEntries] = useState([])
  const [aiText, setAiText] = useState('')
  const [aiStatus, setAiStatus] = useState('idle')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState(null)
  const [boardMembers, setBoardMembers] = useState([])
  const [membersStatus, setMembersStatus] = useState('idle')
  const [draggingTaskId, setDraggingTaskId] = useState(null)
  const [modalTask, setModalTask] = useState(null)
  const [modalColumnId, setModalColumnId] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('flowboard:theme', theme)
  }, [theme])

  useEffect(() => {
    if (!boardsOpen || !token) return
    fetch('/api/boards', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then(setBoards)
      .catch(() => setBoards([]))
  }, [boardsOpen, token])

  useEffect(() => {
    if (!token || !inboxOpen) return
    fetch('/api/activity/inbox', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((entries) => setInboxEntries(Array.isArray(entries) ? entries : []))
      .catch(() => setInboxEntries([]))
  }, [inboxOpen, token])

  useEffect(() => {
    if (activeTab !== 'members' || !currentBoardId || !token) return
    let cancelled = false

    const loadMembers = async () => {
      setMembersStatus('loading')
      try {
        const response = await fetch(`/api/boards/${currentBoardId}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? 'Could not load members')
        if (!cancelled) {
          setBoardMembers(result.members ?? [])
          setMembersStatus('ready')
        }
      } catch {
        if (!cancelled) setMembersStatus('failed')
      }
    }

    loadMembers()
    return () => {
      cancelled = true
    }
  }, [activeTab, currentBoardId, token])

  const usersById = useMemo(() => {
    const users = new Map()
    if (currentUser?._id) users.set(currentUser._id, currentUser)
    onlineUsers.forEach((user) => users.set(user.userId, { _id: user.userId, name: user.name, email: user.email, avatarColor: user.avatarColor }))
    return users
  }, [currentUser, onlineUsers])

  const columns = sourceColumns.map((column) => ({ id: column._id, title: column.title }))
  const tasks = sourceTasks.map((task) => {
    const category = task.labels.find((label) => ['design', 'dev', 'qa', 'marketing'].includes(label.text.toLowerCase()))?.text.toLowerCase() ?? task.labels[0]?.text.toLowerCase() ?? 'dev'
    return {
      id: task._id,
      original: task,
      columnId: task.columnId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      category,
      tags: [category, task.priority].filter(Boolean),
      dueDate: task.dueDate,
      checklist: task.subtasks.map((subtask) => ({ id: subtask.id, text: subtask.text, completed: subtask.done })),
      assigneeIds: task.assigneeIds,
      assignees: task.assigneeIds.map((id) => {
        const user = usersById.get(id)
        return { id, name: user?.name ?? 'Teammate', avatar: avatarFor(id) }
      }),
    }
  })

  const toggleTheme = () => setTheme((value) => (value === 'light' ? 'dark' : 'light'))

  const switchBoard = async (boardId) => {
    setBoardsOpen(false)
    const response = await fetch(`/api/boards/${boardId}/state`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const snapshot = await response.json()
    if (snapshot?.board && snapshot?.tasks) {
      dispatch({ ...boardActions.hydrateBoardState(snapshot.board), meta: { skipPersist: true } })
      dispatch({ ...taskActions.hydrateTasksState(snapshot.tasks), meta: { skipPersist: true } })
      setActiveTab('board')
      setViewMode('board')
    }
  }

  const createBoard = () => {
    const title = window.prompt('Board name', `Untitled Board ${boards.length + 1}`)
    if (!title?.trim()) return
    const boardId = createId('board')
    const starterColumns = ['To Do', 'In Progress', 'In Review', 'Completed'].map((columnTitle, order) => ({
      _id: createId('col'),
      boardId,
      title: columnTitle,
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
    setActiveTab('board')
    setViewMode('board')
    setBoardsOpen(false)
  }

  const deleteBoard = async () => {
    if (!board) return
    if (board.ownerId !== currentUser?._id) {
      window.alert('Only the board owner can delete this board.')
      return
    }
    if (!window.confirm(`Delete "${board.title}"? This cannot be undone.`)) return
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

  const parseAiTask = async () => {
    if (!aiText.trim() || !board || !columns[0]) return
    setAiStatus('loading')
    try {
      const response = await fetch('/api/ai/parse-nl-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'AI parse failed')
      dispatch(markUndoable(taskActions.addTask({
        _id: createId('task'),
        boardId: board._id,
        columnId: columns[0].id,
        title: result.title ?? aiText,
        description: 'Created from AI-assisted natural language quick add.',
        subtasks: [],
        labels: [{ text: 'ai', color: categoryColors.design }],
        priority: result.priority ?? 'medium',
        dueDate: result.dueDate ?? null,
        assigneeIds: currentUser?._id ? [currentUser._id] : [],
        createdBy: currentUser?._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })))
      setAiText('')
      setAiStatus('idle')
    } catch (error) {
      setAiStatus('idle')
      window.alert(error.message)
    }
  }

  const inviteCollaborator = async (event) => {
    event.preventDefault()
    if (!inviteEmail.trim() || !currentBoardId) return
    setInviteStatus({ type: 'loading', text: 'Inviting...' })
    try {
      const response = await fetch(`/api/boards/${currentBoardId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Invite failed')
      setInviteEmail('')
      setInviteStatus({ type: 'success', text: `${result.invitedUser.email} can now open this board.` })
      dispatch(boardActions.setBoardMembers({ boardId: currentBoardId, ownerId: result.ownerId, members: result.members }))
      setBoardMembers((members) => {
        if (members.some((member) => member._id === result.invitedUser._id)) return members
        return [...members, { ...result.invitedUser, role: 'Collaborator' }]
      })
    } catch (error) {
      setInviteStatus({ type: 'error', text: error.message })
    }
  }

  const removeCollaborator = async (userId) => {
    const response = await fetch(`/api/boards/${currentBoardId}/members/${userId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setInviteStatus({ type: 'error', text: result.error ?? 'Could not remove collaborator' })
      return
    }
    dispatch(boardActions.setBoardMembers({ boardId: currentBoardId, members: result.members }))
    setBoardMembers((members) => members.filter((member) => member._id !== userId))
  }

  const openTask = (task) => {
    dispatch(presenceActions.startedEditingTask({ taskId: task.id, userId: currentUser?._id }))
    setModalTask(task)
    setModalColumnId(task.columnId)
    setIsModalOpen(true)
  }

  const openNewTask = (columnId = columns[0]?.id) => {
    setModalTask(null)
    setModalColumnId(columnId)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (modalTask?.id) dispatch(presenceActions.stoppedEditingTask({ taskId: modalTask.id }))
    setIsModalOpen(false)
    setModalTask(null)
  }

  const saveTask = (draft) => {
    const labels = [
      { text: draft.category, color: categoryColors[draft.category] ?? '#0ea5e9' },
    ]
    const subtasks = draft.checklist.map((item) => ({ id: item.id, text: item.text, done: item.completed }))

    if (draft.id) {
      dispatch(markUndoable(taskActions.updateTask({
        taskId: draft.id,
        changes: {
          title: draft.title,
          description: draft.description,
          priority: draft.priority,
          dueDate: draft.dueDate || null,
          labels,
          subtasks,
        },
      })))
    } else {
      dispatch(markUndoable(taskActions.addTask({
        _id: createId('task'),
        boardId: board._id,
        columnId: draft.columnId,
        title: draft.title,
        description: draft.description,
        subtasks,
        labels,
        priority: draft.priority,
        dueDate: draft.dueDate || null,
        assigneeIds: draft.assigneeIds,
        createdBy: currentUser?._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })))
    }
    closeModal()
  }

  const deleteTask = (taskId) => {
    dispatch(markUndoable(taskActions.deleteTask(taskId)))
    closeModal()
  }

  const handleDragStart = (event, task) => {
    setDraggingTaskId(task.id)
    event.dataTransfer.setData('text/plain', task.id)
    setTimeout(() => event.target.classList.add('dragging'), 0)
  }

  const handleDragEnd = (event) => {
    setDraggingTaskId(null)
    event.target.classList.remove('dragging')
  }

  const handleDropCard = (event, targetColumnId) => {
    const taskId = event.dataTransfer.getData('text/plain') || draggingTaskId
    const task = sourceTasks.find((item) => item._id === taskId)
    if (!task || task.columnId === targetColumnId) return
    dispatch(markUndoable(taskActions.moveTask({ taskId, fromColumnId: task.columnId, toColumnId: targetColumnId })))
  }

  const renderContent = () => {
    if (!board) {
      return (
        <div className="view-placeholder">
          <FolderGit2 size={48} style={{ color: 'var(--accent)' }} />
          <h4 className="view-placeholder-title">No Board Selected</h4>
          <p className="view-placeholder-desc">Create or open a FlowBoard project to start working.</p>
          <button className="action-btn" onClick={createBoard} style={{ marginTop: '18px' }}>
            <Plus size={16} /> New Board
          </button>
        </div>
      )
    }

    if (activeTab === 'board') {
      if (viewMode === 'board') {
        return <KanbanBoard columns={columns} tasks={tasks} searchQuery={searchQuery} onCardClick={openTask} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDropCard={handleDropCard} onQuickAddClick={openNewTask} />
      }
      if (viewMode === 'list') return <ListView tasks={tasks} columns={columns} searchQuery={searchQuery} onCardClick={openTask} />
      return (
        <div className="view-placeholder">
          <CalendarDays size={48} style={{ color: 'var(--accent)' }} />
          <h4 className="view-placeholder-title">Calendar View</h4>
          <p className="view-placeholder-desc">Deadlines and milestones from this board will appear here.</p>
        </div>
      )
    }

    if (activeTab === 'dashboard') {
      const completedCount = tasks.filter((task) => task.original.columnId === columns.at(-1)?.id).length
      const todoCount = tasks.filter((task) => task.original.columnId === columns[0]?.id).length
      return (
        <div className="list-view-container" style={{ gap: '24px' }}>
          <div className="dashboard-grid">
            <div className="dashboard-card" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Projects</span>
                <FolderGit2 size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <h2 style={{ fontSize: '28px', marginTop: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{board.title}</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Realtime FlowBoard workspace</span>
            </div>
            <div className="dashboard-card" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Tasks</span>
                <Clock size={18} style={{ color: 'var(--tag-medium-dot)' }} />
              </div>
              <h2 style={{ fontSize: '28px', marginTop: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{tasks.length} Tasks</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{todoCount} pending backlog</span>
            </div>
            <div className="dashboard-card" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Completed Tasks</span>
                <CheckCircle2 size={18} style={{ color: 'var(--tag-low-dot)' }} />
              </div>
              <h2 style={{ fontSize: '28px', marginTop: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{completedCount} Tasks</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{Math.round((completedCount / Math.max(tasks.length, 1)) * 100)}% Completion Rate</span>
            </div>
          </div>
        </div>
      )
    }

    if (activeTab === 'analytics') {
      return (
        <div className="list-view-container" style={{ gap: '24px' }}>
          <div className="dashboard-card" style={{ padding: '24px', cursor: 'default' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
              Workflow Distribution
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {columns.map((column) => {
                const count = tasks.filter((task) => task.columnId === column.id).length
                const percentage = tasks.length > 0 ? (count / tasks.length) * 100 : 0
                return (
                  <div key={column.id} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ width: '100px', fontSize: '13px', fontWeight: 500 }}>{column.title}</span>
                    <div style={{ flex: 1, height: '14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${percentage}%`, background: 'linear-gradient(90deg, var(--accent), #8b5cf6)', borderRadius: '6px' }} />
                    </div>
                    <span style={{ width: '30px', fontSize: '13px', fontWeight: 700, textAlign: 'right' }}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

    if (activeTab === 'members') {
      const fallbackMembers = [currentUser, ...onlineUsers.map((user) => ({ _id: user.userId, name: user.name, email: user.email, role: 'Collaborator' }))].filter(Boolean)
      const membersToShow = boardMembers.length > 0 ? boardMembers : fallbackMembers
      return (
        <div className="list-view-container">
          <div className="members-toolbar dashboard-card">
            <div>
              <h3>Board members ({membersToShow.length})</h3>
              <p>Invite registered users, check who is live, and remove collaborators.</p>
            </div>
            <form className="swift-invite-form" onSubmit={inviteCollaborator}>
              <input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} type="email" placeholder="teammate@example.com" />
              <button className="action-btn" disabled={inviteStatus?.type === 'loading'}>
                <Plus size={14} /> Invite
              </button>
            </form>
            {inviteStatus && <span className={`swift-status ${inviteStatus.type}`}>{inviteStatus.text}</span>}
          </div>
          {membersStatus === 'loading' && <span className="swift-empty">Loading collaborators...</span>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {membersToShow.map((member) => {
              const isCurrent = member._id === currentUser?._id
              const liveUser = onlineUsers.find((user) => user.userId === member._id)
              const isLive = isCurrent || Boolean(liveUser)
              const canRemove = board?.ownerId === currentUser?._id && !isCurrent
              return (
              <div key={member._id} className="dashboard-card member-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'default' }}>
                <img src={avatarFor(member._id)} alt={member.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{member.name}</h4>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <Mail size={12} />
                    {member.email ?? 'online@flowboard.app'}
                  </span>
                  <small className={isLive ? 'live-text' : 'offline-text'}>{member.role ?? (isCurrent ? 'Owner' : 'Collaborator')} - {isLive ? 'Live now' : 'Offline'}</small>
                </div>
                {canRemove ? (
                  <button className="delete-btn" onClick={() => removeCollaborator(member._id)}>Remove</button>
                ) : (
                  <UserCheck size={18} style={{ color: 'var(--accent)' }} />
                )}
              </div>
            )})}
          </div>
        </div>
      )
    }

    return (
      <div className="list-view-container" style={{ maxWidth: '600px' }}>
        <div className="dashboard-card" style={{ padding: '24px', cursor: 'default' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Project Settings</h3>
          <p style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>MongoDB sync, Groq AI, and realtime presence are active for this workspace.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser} onLogout={() => dispatch(userActions.logout())} />
      <main className="main-content">
        <Header
          board={board}
          boards={boards}
          boardsOpen={boardsOpen}
          setBoardsOpen={setBoardsOpen}
          switchBoard={switchBoard}
          deleteBoard={deleteBoard}
          createBoard={createBoard}
          theme={theme}
          toggleTheme={toggleTheme}
          viewMode={viewMode}
          setViewMode={setViewMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          aiText={aiText}
          setAiText={setAiText}
          parseAiTask={parseAiTask}
          aiStatus={aiStatus}
          onAddTaskClick={() => openNewTask()}
          onlineUsers={onlineUsers}
          currentUser={currentUser}
          inboxOpen={inboxOpen}
          setInboxOpen={setInboxOpen}
          inboxEntries={[...inboxEntries, ...activity]}
        />
        {renderContent()}
      </main>
      <CardModal isOpen={isModalOpen} onClose={closeModal} task={modalTask} columnId={modalColumnId ?? columns[0]?.id} onSave={saveTask} onDelete={deleteTask} currentUser={currentUser} />
    </div>
  )
}
