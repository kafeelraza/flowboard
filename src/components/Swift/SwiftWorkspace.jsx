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
  MessageCircle,
  Moon,
  MoreHorizontal,
  Plus,
  RotateCcw,
  RotateCw,
  Search,
  Send,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { markUndoable } from '../../store/actionCreators.js'
import { boardActions, selectBoard, selectColumnsInOrder } from '../../store/boardSlice.js'
import { createId } from '../../store/id.js'
import { presenceActions } from '../../store/presenceSlice.js'
import { taskActions } from '../../store/taskSlice.js'
import { userActions } from '../../store/userSlice.js'

const avatarOptions = [
  { id: 'bolt', emoji: '⚡', colors: ['#5f5af6', '#a855f7'] },
  { id: 'rocket', emoji: '🚀', colors: ['#0284c7', '#22d3ee'] },
  { id: 'fire', emoji: '🔥', colors: ['#ef4444', '#f97316'] },
  { id: 'leaf', emoji: '🌿', colors: ['#16a34a', '#84cc16'] },
  { id: 'moon', emoji: '🌙', colors: ['#334155', '#7c3aed'] },
  { id: 'star', emoji: '⭐', colors: ['#f59e0b', '#facc15'] },
  { id: 'gem', emoji: '💎', colors: ['#06b6d4', '#6366f1'] },
]

const chatReactions = ['\uD83D\uDC4D', '\u2764\uFE0F', '\uD83D\uDD25', '\u2705']

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

const avatarFor = (userId = 'user', preferredAvatarId = null) => {
  const selected = preferredAvatarId ? avatarOptions.find((avatar) => avatar.id === preferredAvatarId) : null
  const score = [...userId].reduce((total, char) => total + char.charCodeAt(0), 0)
  const avatar = selected ?? avatarOptions[score % avatarOptions.length]
  const [start, end] = avatar.colors
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient></defs><rect width="100" height="100" rx="28" fill="url(#g)"/><text x="50" y="58" font-size="42" text-anchor="middle" dominant-baseline="middle">${avatar.emoji}</text></svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
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

function Sidebar({ collapsed, setCollapsed, activeTab, setActiveTab, user, selectedAvatarId, onLogout }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <Zap size={20} fill="currentColor" />
        </div>
        <span className="logo-text">FlowBoard</span>
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
            <img className="avatar" src={avatarFor(user?._id, selectedAvatarId)} alt={user?.name ?? 'User'} />
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
  setActiveTab,
  searchQuery,
  setSearchQuery,
  openAiTask,
  aiStatus,
  currentUser,
  selectedAvatarId,
  boardMembers,
  openMembers,
  chatOpen,
  setChatOpen,
  chatUnread,
  inboxOpen,
  setInboxOpen,
  inboxEntries,
}) {
  const boardMenuRef = useRef(null)
  const inboxMenuRef = useRef(null)

  useEffect(() => {
    const closeMenus = (event) => {
      if (boardMenuRef.current && !boardMenuRef.current.contains(event.target)) setBoardsOpen(false)
      if (inboxMenuRef.current && !inboxMenuRef.current.contains(event.target)) setInboxOpen(false)
    }
    document.addEventListener('pointerdown', closeMenus)
    return () => document.removeEventListener('pointerdown', closeMenus)
  }, [setBoardsOpen, setInboxOpen])

  const showBoardView = (nextViewMode) => {
    setActiveTab('board')
    setViewMode(nextViewMode)
  }

  const visibleMembers = (boardMembers.length > 0 ? boardMembers : [currentUser]).filter(Boolean).slice(0, 2)

  return (
    <header className="header">
      <div className="header-left">
        <span className="header-subtitle">Projects / FlowBoard</span>
        <div className="header-title-row">
          <h1 className="header-title">{board?.title ?? 'Project Kanban'}</h1>
          <div className="swift-board-switcher" ref={boardMenuRef}>
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
        <button className={`view-tab ${viewMode === 'board' ? 'active' : ''}`} onClick={() => showBoardView('board')}>
          <Kanban size={16} />
          <span>Board</span>
        </button>
        <button className={`view-tab ${viewMode === 'list' ? 'active' : ''}`} onClick={() => showBoardView('list')}>
          <ListFilter size={16} />
          <span>List</span>
        </button>
        <button className={`view-tab ${viewMode === 'calendar' ? 'active' : ''}`} onClick={() => showBoardView('calendar')}>
          <CalendarDays size={16} />
          <span>Calendar</span>
        </button>
      </div>

      <div className="header-right">
        <button className="ai-trigger-btn" onClick={openAiTask} disabled={aiStatus === 'loading'} title="Create task with AI">
          <Sparkles size={16} />
          <span>{aiStatus === 'loading' ? 'Creating...' : 'AI Task'}</span>
        </button>
        <div className="search-container">
          <Search size={16} className="search-icon" />
          <input className="search-input" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search tasks..." />
        </div>
        <button className="swift-live-stack" onClick={openMembers} title="Open board members">
          {visibleMembers.map((user) => (
            <img key={user._id} src={avatarFor(user._id, user._id === currentUser?._id ? selectedAvatarId : null)} alt={user.name} />
          ))}
          {boardMembers.length > 2 && <span>+{boardMembers.length - 2}</span>}
        </button>
        <button className={`theme-toggle-btn chat-toggle ${chatOpen ? 'active' : ''}`} onClick={() => setChatOpen((value) => !value)} title="Board chat">
          <MessageCircle size={18} />
          {chatUnread > 0 && <span className="swift-dot">{chatUnread > 9 ? '9+' : chatUnread}</span>}
        </button>
        <button className="theme-toggle-btn" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))} title="Undo">
          <RotateCcw size={18} />
        </button>
        <button className="theme-toggle-btn" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }))} title="Redo">
          <RotateCw size={18} />
        </button>
        <div className="swift-board-switcher" ref={inboxMenuRef}>
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
      {task.editingUser && (
        <div className="swift-editing-badge">
          <img src={avatarFor(task.editingUser._id)} alt={task.editingUser.name} />
          <span>{task.editingUser.name} editing</span>
        </div>
      )}
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

function CalendarView({ tasks, onCardClick }) {
  const datedTasks = tasks
    .filter((task) => task.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  return (
    <div className="list-view-container calendar-view">
      {datedTasks.length === 0 ? (
        <div className="view-placeholder">
          <CalendarDays size={48} style={{ color: 'var(--accent)' }} />
          <h4 className="view-placeholder-title">No Due Dates Yet</h4>
          <p className="view-placeholder-desc">Add due dates to tasks and they will appear in this calendar view.</p>
        </div>
      ) : (
        datedTasks.map((task) => (
          <button key={task.id} className="calendar-task-card" onClick={() => onCardClick(task)}>
            <div className="calendar-date-pill">
              <strong>{formatDate(task.dueDate)}</strong>
              <span>{new Date(`${task.dueDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' })}</span>
            </div>
            <div>
              <h3>{task.title}</h3>
              <p>{task.description || 'No description'}</p>
            </div>
            <span className={`card-tag tag-${task.priority}`}>{task.priority}</span>
          </button>
        ))
      )}
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
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [aiBreakdownStatus, setAiBreakdownStatus] = useState('idle')

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
    setAiSuggestions([])
    setAiBreakdownStatus('idle')
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

  const breakDownWithAi = async () => {
    const taskTitle = title.trim() || task?.title || 'New task'
    setAiBreakdownStatus('loading')
    try {
      const response = await fetch('/api/ai/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskTitle }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'AI breakdown failed')
      setAiSuggestions((result.subtasks ?? []).map((text) => ({ id: createId('suggestion'), text })))
      setAiBreakdownStatus('ready')
    } catch {
      setAiBreakdownStatus('failed')
    }
  }

  const acceptAiSuggestions = (accepted = aiSuggestions) => {
    if (accepted.length === 0) return
    setChecklist((items) => [
      ...items,
      ...accepted.map((item) => ({ id: createId('sub'), text: item.text, completed: false })),
    ])
    setAiSuggestions((items) => items.filter((item) => !accepted.some((acceptedItem) => acceptedItem.id === item.id)))
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
            <div className="swift-section-title-row">
              <span className="modal-section-title">Checklist</span>
              <button className="ai-inline-btn" onClick={breakDownWithAi} disabled={aiBreakdownStatus === 'loading'}>
                <Sparkles size={15} />
                {aiBreakdownStatus === 'loading' ? 'Thinking...' : 'Break down with AI'}
              </button>
            </div>
            {aiBreakdownStatus === 'failed' && <p className="empty-text">Couldn't reach AI right now. Try again.</p>}
            {aiSuggestions.length > 0 && (
              <div className="swift-ai-suggestions">
                <div className="suggestion-header">
                  <strong>AI suggestions</strong>
                  <button onClick={() => acceptAiSuggestions()}>Accept all</button>
                </div>
                {aiSuggestions.map((item) => (
                  <div className="suggestion-row" key={item.id}>
                    <span>{item.text}</span>
                    <button onClick={() => acceptAiSuggestions([item])}>Accept</button>
                    <button onClick={() => setAiSuggestions((items) => items.filter((suggestion) => suggestion.id !== item.id))}>Reject</button>
                  </div>
                ))}
              </div>
            )}
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

function BoardNameModal({ isOpen, title, setTitle, onClose, onCreate }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content board-name-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <h2>Create Board</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-section">
            <span className="modal-section-title">Board name</span>
            <input
              className="modal-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && onCreate()}
              placeholder="Design Sprint"
              autoFocus
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="save-btn" onClick={onCreate}>Create Board</button>
        </div>
      </div>
    </div>
  )
}

function AiTaskModal({
  isOpen,
  aiText,
  setAiText,
  aiStatus,
  boardOptions,
  targetBoardId,
  setTargetBoardId,
  onClose,
  onCreate,
}) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ai-task-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <h2>Create With AI</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-section">
            <span className="modal-section-title">Task instruction</span>
            <textarea
              className="modal-textarea ai-task-textarea"
              value={aiText}
              onChange={(event) => setAiText(event.target.value)}
              placeholder="Add navbar fix in one board and mark it high priority"
              rows={4}
              autoFocus
            />
          </div>
          <div className="modal-section">
            <span className="modal-section-title">Target board</span>
            <select className="modal-select" value={targetBoardId ?? ''} onChange={(event) => setTargetBoardId(event.target.value)}>
              {boardOptions.map((item) => (
                <option key={item.boardId} value={item.boardId}>
                  {item.title}
                </option>
              ))}
            </select>
            <small className="ai-task-hint">Board name written in the instruction will be auto-detected when it matches one of your boards.</small>
          </div>
        </div>
        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="save-btn" onClick={onCreate} disabled={aiStatus === 'loading' || !aiText.trim()}>
            {aiStatus === 'loading' ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ChatPanel({ isOpen, onClose, board, currentUser, selectedAvatarId, messages, draft, setDraft, onSend, onTyping, onReact, onEdit, onDelete, typingUsers, readState }) {
  const messagesEndRef = useRef(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [reactionPickerId, setReactionPickerId] = useState(null)
  const [reactionPickerPlacement, setReactionPickerPlacement] = useState('above')
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editingText, setEditingText] = useState('')

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [isOpen, messages])

  useEffect(() => {
    if (!isOpen) return undefined

    const closeFloatingMenus = () => {
      setContextMenu(null)
      setReactionPickerId(null)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') closeFloatingMenus()
    }

    window.addEventListener('click', closeFloatingMenus)
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      window.removeEventListener('click', closeFloatingMenus)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <aside className="chat-panel" onContextMenu={(event) => event.stopPropagation()}>
      <div className="chat-header">
        <div>
          <span>Board Chat</span>
          <strong>{board?.title ?? 'FlowBoard'}</strong>
        </div>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <MessageCircle size={30} />
            <strong>No messages yet</strong>
            <span>Start a quick board conversation with your teammates.</span>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = String(message.userId) === String(currentUser?._id)
            const messageKey = message._id ?? `${message.userId}-${message.timestamp}`
            const isEditing = editingMessageId === messageKey
            const reactionCounts = chatReactions
              .map((emoji) => ({
                emoji,
                count: (message.reactions ?? []).filter((reaction) => reaction.emoji === emoji).length,
              }))
              .filter((reaction) => reaction.count > 0)
            return (
              <div key={messageKey} className={`chat-message ${isMine ? 'mine' : ''}`}>
                {!isMine && <img src={avatarFor(message.userId)} alt={message.userName} />}
                <div
                  onContextMenu={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setReactionPickerId(null)
                    setContextMenu({
                      x: Math.min(event.clientX, window.innerWidth - 188),
                      y: Math.min(event.clientY, window.innerHeight - (isMine ? 112 : 64)),
                      message,
                      isMine,
                    })
                  }}
                >
                  <small>
                    {isMine ? 'You' : message.userName ?? 'Teammate'}
                    <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {message.editedAt && <span>edited</span>}
                  </small>
                  {isEditing ? (
                    <form
                      className="chat-inline-edit"
                      onSubmit={async (event) => {
                        event.preventDefault()
                        const nextText = editingText.trim()
                        if (!nextText || nextText === message.text) {
                          setEditingMessageId(null)
                          return
                        }
                        await onEdit(message, nextText)
                        setEditingMessageId(null)
                      }}
                    >
                      <textarea
                        autoFocus
                        value={editingText}
                        onChange={(event) => setEditingText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            event.preventDefault()
                            setEditingMessageId(null)
                          }
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault()
                            event.currentTarget.form?.requestSubmit()
                          }
                        }}
                      />
                      <div>
                        <button type="button" onClick={() => setEditingMessageId(null)}>Cancel</button>
                        <button type="submit" disabled={!editingText.trim()}>Save</button>
                      </div>
                    </form>
                  ) : (
                    <p>{message.deletedAt ? 'This message was deleted.' : message.text}</p>
                  )}
                  {!message.deletedAt && (
                    <>
                    <button
                      className="chat-reaction-trigger"
                      type="button"
                      aria-label="React to message"
                      onClick={(event) => {
                        event.stopPropagation()
                        setContextMenu(null)
                        const bubble = event.currentTarget.closest('.chat-message')
                        const bounds = bubble?.getBoundingClientRect()
                        setReactionPickerPlacement(bounds && bounds.top < window.innerHeight / 2 ? 'below' : 'above')
                        setReactionPickerId(reactionPickerId === messageKey ? null : messageKey)
                      }}
                    >
                      {'\u263A'}
                    </button>
                    {reactionPickerId === messageKey && (
                      <div className={`chat-reaction-palette ${reactionPickerPlacement}`} onClick={(event) => event.stopPropagation()}>
                        {chatReactions.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              onReact(message, emoji)
                              setReactionPickerId(null)
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                    {reactionCounts.length > 0 && (
                      <div className="chat-reaction-summary">
                        {reactionCounts.map((reaction) => (
                          <span className="chat-reaction-chip" key={reaction.emoji}>
                            {reaction.emoji}
                            {reaction.count > 1 ? ` ${reaction.count}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="chat-message-actions" aria-hidden="true">
                      {['👍', '❤️', '🔥', '✅'].map((emoji) => {
                        const count = (message.reactions ?? []).filter((reaction) => reaction.emoji === emoji).length
                        return (
                          <button key={emoji} type="button" onClick={() => onReact(message, emoji)}>
                            {emoji}{count > 0 ? ` ${count}` : ''}
                          </button>
                        )
                      })}
                      {isMine && (
                        <>
                          <button type="button" onClick={() => onEdit(message)}>Edit</button>
                          <button type="button" onClick={() => onDelete(message)}>Delete</button>
                        </>
                      )}
                    </div>
                    </>
                  )}
                  {isMine && readState.readAt >= message.timestamp && <em>Seen</em>}
                </div>
                {isMine && <img src={avatarFor(currentUser?._id, selectedAvatarId)} alt={currentUser?.name ?? 'You'} />}
              </div>
            )
          })
        )}
        {typingUsers.length > 0 && <div className="typing-indicator">{typingUsers.map((user) => user.userName).join(', ')} typing...</div>}
        <div ref={messagesEndRef} />
      </div>
      {contextMenu && (
        <div
          className="chat-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(contextMenu.message.text ?? '')
              setContextMenu(null)
            }}
          >
            Copy text
          </button>
          {contextMenu.isMine && !contextMenu.message.deletedAt && (
            <>
              <button
                type="button"
                onClick={() => {
                  const messageKey = contextMenu.message._id ?? `${contextMenu.message.userId}-${contextMenu.message.timestamp}`
                  setEditingMessageId(messageKey)
                  setEditingText(contextMenu.message.text ?? '')
                  setContextMenu(null)
                }}
              >
                Edit message
              </button>
              <button
                className="danger"
                type="button"
                onClick={() => {
                  onDelete(contextMenu.message)
                  setContextMenu(null)
                }}
              >
                Delete message
              </button>
            </>
          )}
        </div>
      )}
      <form className="chat-compose" onSubmit={onSend}>
        <input
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            onTyping(Boolean(event.target.value.trim()))
          }}
          onBlur={() => onTyping(false)}
          placeholder="Message this board..."
        />
        <button disabled={!draft.trim()}>
          <Send size={16} />
        </button>
      </form>
    </aside>
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
  const editingMap = useSelector((state) => state.presence.editingMap)
  const activity = useSelector((state) => state.activity.entries.filter((entry) => entry.boardId === state.board.currentBoardId).slice(0, 6))
  const [theme, setTheme] = useState(() => localStorage.getItem('flowboard:theme') || 'light')
  const [selectedAvatarId, setSelectedAvatarId] = useState(() => localStorage.getItem('flowboard:avatar') || avatarOptions[0].id)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('board')
  const [viewMode, setViewMode] = useState('board')
  const [searchQuery, setSearchQuery] = useState('')
  const [boardsOpen, setBoardsOpen] = useState(false)
  const [boards, setBoards] = useState([])
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatDraft, setChatDraft] = useState('')
  const [chatUnread, setChatUnread] = useState(0)
  const [chatTypingUsers, setChatTypingUsers] = useState([])
  const [chatReadState, setChatReadState] = useState({})
  const [inboxOpen, setInboxOpen] = useState(false)
  const [inboxEntries, setInboxEntries] = useState([])
  const [aiText, setAiText] = useState('')
  const [aiStatus, setAiStatus] = useState('idle')
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiTargetBoardId, setAiTargetBoardId] = useState(currentBoardId)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState(null)
  const [boardMembers, setBoardMembers] = useState([])
  const [membersStatus, setMembersStatus] = useState('idle')
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false)
  const [newBoardTitle, setNewBoardTitle] = useState('')
  const [draggingTaskId, setDraggingTaskId] = useState(null)
  const [modalTask, setModalTask] = useState(null)
  const [modalColumnId, setModalColumnId] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('flowboard:theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('flowboard:avatar', selectedAvatarId)
  }, [selectedAvatarId])

  useEffect(() => {
    if ((!boardsOpen && !isAiModalOpen) || !token) return
    fetch('/api/boards', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then(setBoards)
      .catch(() => setBoards([]))
  }, [boardsOpen, isAiModalOpen, token])

  useEffect(() => {
    setAiTargetBoardId(currentBoardId)
  }, [currentBoardId])

  useEffect(() => {
    setChatMessages([])
    setChatUnread(0)
    setChatTypingUsers([])
    setChatReadState({})
    setChatOpen(false)
  }, [currentBoardId])

  useEffect(() => {
    if (!currentBoardId || !token || !chatOpen) return
    fetch(`/api/boards/${currentBoardId}/chat`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((messages) => {
        setChatMessages(Array.isArray(messages) ? messages : [])
        setChatUnread(0)
        fetch(`/api/boards/${currentBoardId}/chat/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {})
      })
      .catch(() => setChatMessages([]))
  }, [chatOpen, currentBoardId, token])

  useEffect(() => {
    const handleChatMessage = (event) => {
      const message = event.detail
      if (!message || message.boardId !== currentBoardId) return
      setChatMessages((items) => {
        const messageId = message._id?.toString?.() ?? message._id
        if (messageId && items.some((item) => String(item._id) === String(messageId))) return items
        return [...items, message].slice(-120)
      })
      if (!chatOpen) setChatUnread((count) => Math.min(count + 1, 99))
    }

    window.addEventListener('flowboard:chat-message', handleChatMessage)
    return () => window.removeEventListener('flowboard:chat-message', handleChatMessage)
  }, [chatOpen, currentBoardId])

  useEffect(() => {
    const updateMessage = (message) => {
      if (!message || message.boardId !== currentBoardId) return
      setChatMessages((items) => items.map((item) => (String(item._id) === String(message._id) ? message : item)))
    }
    const handleChatUpdate = (event) => updateMessage(event.detail)
    const handleTyping = (event) => {
      const detail = event.detail
      if (!detail || detail.boardId !== currentBoardId || detail.userId === currentUser?._id) return
      setChatTypingUsers((users) => {
        const withoutUser = users.filter((user) => user.userId !== detail.userId)
        return detail.isTyping ? [...withoutUser, detail] : withoutUser
      })
      if (detail.isTyping) {
        window.setTimeout(() => {
          setChatTypingUsers((users) => users.filter((user) => user.userId !== detail.userId))
        }, 3500)
      }
    }
    const handleRead = (event) => {
      const detail = event.detail
      if (!detail || detail.boardId !== currentBoardId || detail.userId === currentUser?._id) return
      setChatReadState((state) => ({ ...state, [detail.userId]: { readAt: detail.readAt } }))
    }
    window.addEventListener('flowboard:chat-message-update', handleChatUpdate)
    window.addEventListener('flowboard:chat-typing', handleTyping)
    window.addEventListener('flowboard:chat-read', handleRead)
    return () => {
      window.removeEventListener('flowboard:chat-message-update', handleChatUpdate)
      window.removeEventListener('flowboard:chat-typing', handleTyping)
      window.removeEventListener('flowboard:chat-read', handleRead)
    }
  }, [currentBoardId, currentUser?._id])

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
    if (!currentBoardId || !token) return
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
  }, [currentBoardId, token])

  const usersById = useMemo(() => {
    const users = new Map()
    if (currentUser?._id) users.set(currentUser._id, currentUser)
    onlineUsers.forEach((user) => users.set(user.userId, { _id: user.userId, name: user.name, email: user.email, avatarColor: user.avatarColor }))
    return users
  }, [currentUser, onlineUsers])

  const columns = sourceColumns.map((column) => ({ id: column._id, title: column.title }))
  const boardOptions = useMemo(() => {
    const options = new Map()
    if (board?._id) options.set(board._id, { boardId: board._id, title: board.title })
    boards.forEach((item) => {
      if (item.boardId) options.set(item.boardId, item)
    })
    return [...options.values()]
  }, [board, boards])

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
        return { id, name: user?.name ?? 'Teammate', avatar: avatarFor(id, id === currentUser?._id ? selectedAvatarId : null) }
      }),
      editingUser: editingMap[task._id] ? usersById.get(editingMap[task._id]) ?? currentUser : null,
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
    setNewBoardTitle(`Untitled Board ${boards.length + 1}`)
    setIsBoardModalOpen(true)
  }

  const confirmCreateBoard = () => {
    const title = newBoardTitle.trim()
    if (!title) return
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
            title,
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
    setIsBoardModalOpen(false)
    setNewBoardTitle('')
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

  const detectBoardFromInstruction = (instruction) => {
    const normalizedInstruction = instruction.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    return boardOptions.find((item) => {
      const title = item.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      if (!title) return false
      return new RegExp(`(^|\\s)${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(normalizedInstruction)
    })
  }

  const buildAiTask = (result, targetBoardId, targetColumnId, fallbackTitle) => {
    const priorityFromText = /(^|\s)(urgent|high|important)(\s|$)/i.test(fallbackTitle) ? 'high' : null
    return {
      _id: createId('task'),
      boardId: targetBoardId,
      columnId: targetColumnId,
      title: result.title ?? fallbackTitle,
      description: 'Created from AI-assisted natural language quick add.',
      subtasks: [],
      labels: [{ text: 'ai', color: categoryColors.design }],
      priority: result.priority ?? priorityFromText ?? 'medium',
      dueDate: result.dueDate ?? null,
      assigneeIds: currentUser?._id ? [currentUser._id] : [],
      createdBy: currentUser?._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  const addTaskToSavedBoard = async (targetBoardId, result, fallbackTitle) => {
    const response = await fetch(`/api/boards/${targetBoardId}/state`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const snapshot = await response.json()
    if (!response.ok || !snapshot?.board || !snapshot?.tasks) throw new Error(snapshot?.error ?? 'Could not load target board')

    const nextBoard = JSON.parse(JSON.stringify(snapshot.board))
    const nextTasks = JSON.parse(JSON.stringify(snapshot.tasks))
    const targetBoard = nextBoard.boardsById?.[targetBoardId]
    const columnIds = targetBoard?.columns ?? nextBoard.columnOrder ?? []
    const targetColumnId = columnIds.find((id) => nextBoard.columnsById?.[id]) ?? columnIds[0]
    if (!targetColumnId) throw new Error('Target board has no column to receive this task')

    const task = buildAiTask(result, targetBoardId, targetColumnId, fallbackTitle)
    nextTasks.entities = { ...(nextTasks.entities ?? {}), [task._id]: task }
    nextTasks.ids = [...new Set([...(nextTasks.ids ?? []), task._id])]
    nextBoard.columnsById[targetColumnId].taskIds = [...(nextBoard.columnsById[targetColumnId].taskIds ?? []), task._id]

    const saveResponse = await fetch(`/api/boards/${targetBoardId}/state`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ board: nextBoard, tasks: nextTasks }),
    })
    const saveResult = await saveResponse.json().catch(() => ({}))
    if (!saveResponse.ok) throw new Error(saveResult.error ?? 'Could not save AI task')
  }

  const parseAiTask = async () => {
    const instruction = aiText.trim()
    const detectedBoard = detectBoardFromInstruction(instruction)
    const targetBoardId = detectedBoard?.boardId ?? aiTargetBoardId ?? currentBoardId
    if (!instruction || !targetBoardId) return
    setAiStatus('loading')
    try {
      const response = await fetch('/api/ai/parse-nl-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: instruction }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'AI parse failed')
      if (targetBoardId === currentBoardId) {
        if (!board || !columns[0]) throw new Error('Current board is not ready yet')
        dispatch(markUndoable(taskActions.addTask(buildAiTask(result, board._id, columns[0].id, instruction))))
      } else {
        await addTaskToSavedBoard(targetBoardId, result, instruction)
      }
      setAiText('')
      setIsAiModalOpen(false)
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

  const changeMemberRole = async (userId, role) => {
    const response = await fetch(`/api/boards/${currentBoardId}/members/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ role }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setInviteStatus({ type: 'error', text: result.error ?? 'Could not change role' })
      return
    }
    setBoardMembers((members) => members.map((member) => (member._id === userId ? { ...member, role: role === 'viewer' ? 'Viewer' : 'Editor' } : member)))
  }

  const sendChatMessage = async (event) => {
    event.preventDefault()
    const text = chatDraft.trim()
    if (!text || !currentBoardId) return
    dispatch({ type: 'chat/typing', payload: { isTyping: false } })
    setChatDraft('')
    try {
      const response = await fetch(`/api/boards/${currentBoardId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text, userName: currentUser?.name }),
      })
      const message = await response.json()
      if (!response.ok) throw new Error(message.error ?? 'Message failed')
      setChatMessages((items) => {
        if (items.some((item) => String(item._id) === String(message._id))) return items
        return [...items, message].slice(-120)
      })
    } catch (error) {
      setChatDraft(text)
      window.alert(error.message)
    }
  }

  const sendTyping = (isTyping) => {
    dispatch({ type: 'chat/typing', payload: { isTyping } })
  }

  const updateChatMessage = async (message, changes) => {
    const response = await fetch(`/api/boards/${currentBoardId}/chat/${message._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(changes),
    })
    const updated = await response.json()
    if (!response.ok) throw new Error(updated.error ?? 'Message update failed')
    setChatMessages((items) => items.map((item) => (String(item._id) === String(updated._id) ? updated : item)))
  }

  const editChatMessage = async (message, text) => {
    if (!text?.trim() || text.trim() === message.text) return
    try {
      await updateChatMessage(message, { text: text.trim() })
    } catch (error) {
      window.alert(error.message)
    }
  }

  const deleteChatMessage = async (message) => {
    if (!window.confirm('Delete this message?')) return
    try {
      const response = await fetch(`/api/boards/${currentBoardId}/chat/${message._id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const updated = await response.json()
      if (!response.ok) throw new Error(updated.error ?? 'Message delete failed')
      setChatMessages((items) => items.map((item) => (String(item._id) === String(updated._id) ? updated : item)))
    } catch (error) {
      window.alert(error.message)
    }
  }

  const reactToChatMessage = async (message, emoji) => {
    try {
      const response = await fetch(`/api/boards/${currentBoardId}/chat/${message._id}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ emoji }),
      })
      const updated = await response.json()
      if (!response.ok) throw new Error(updated.error ?? 'Reaction failed')
      setChatMessages((items) => items.map((item) => (String(item._id) === String(updated._id) ? updated : item)))
    } catch (error) {
      window.alert(error.message)
    }
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
      return <CalendarView tasks={tasks} onCardClick={openTask} />
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
      const completedColumnId = columns.at(-1)?.id
      const doneCount = tasks.filter((task) => task.columnId === completedColumnId).length
      const overdueCount = tasks.filter((task) => task.dueDate && isOverdue(task.dueDate) && task.columnId !== completedColumnId).length
      const highPriorityCount = tasks.filter((task) => task.priority === 'high').length
      const aiTaskCount = tasks.filter((task) => task.tags.includes('ai') || task.original.labels.some((label) => label.text.toLowerCase() === 'ai')).length
      const completionRate = Math.round((doneCount / Math.max(tasks.length, 1)) * 100)
      const priorityRows = ['high', 'medium', 'low'].map((priority) => {
        const count = tasks.filter((task) => task.priority === priority).length
        return { priority, count, percentage: Math.round((count / Math.max(tasks.length, 1)) * 100) }
      })
      const nextAction =
        overdueCount > 0
          ? `Focus ${overdueCount} overdue task${overdueCount === 1 ? '' : 's'} before adding new work.`
          : highPriorityCount > 0
            ? `Move ${highPriorityCount} high-priority task${highPriorityCount === 1 ? '' : 's'} toward review.`
            : 'Board looks calm. Add due dates to improve forecasting.'

      return (
        <div className="list-view-container analytics-view">
          <div className="analytics-summary-grid">
            <div className="analytics-metric">
              <span>Completion</span>
              <strong>{completionRate}%</strong>
              <small>{doneCount} of {tasks.length} tasks done</small>
            </div>
            <div className="analytics-metric">
              <span>Overdue</span>
              <strong>{overdueCount}</strong>
              <small>Needs attention now</small>
            </div>
            <div className="analytics-metric">
              <span>High Priority</span>
              <strong>{highPriorityCount}</strong>
              <small>Critical work in board</small>
            </div>
            <div className="analytics-metric">
              <span>AI Created</span>
              <strong>{aiTaskCount}</strong>
              <small>Tasks drafted with AI</small>
            </div>
          </div>

          <div className="analytics-grid">
            <section className="analytics-panel">
              <h3>
                <BarChart3 size={18} />
                Workflow Distribution
              </h3>
              <div className="analytics-bars">
              {columns.map((column) => {
                const count = tasks.filter((task) => task.columnId === column.id).length
                const percentage = tasks.length > 0 ? (count / tasks.length) * 100 : 0
                return (
                    <div key={column.id} className="analytics-bar-row">
                      <span>{column.title}</span>
                      <div>
                        <i style={{ width: `${percentage}%` }} />
                      </div>
                      <strong>{count}</strong>
                    </div>
                )
              })}
              </div>
            </section>

            <section className="analytics-panel">
              <h3>
                <ListFilter size={18} />
                Priority Split
              </h3>
              <div className="priority-chart">
                {priorityRows.map((row) => (
                  <div key={row.priority} className={`priority-row priority-${row.priority}`}>
                    <span>{row.priority}</span>
                    <div>
                      <i style={{ width: `${row.percentage}%` }} />
                    </div>
                    <strong>{row.count}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="analytics-panel analytics-insight">
              <h3>
                <Sparkles size={18} />
                AI Board Insight
              </h3>
              <p>{nextAction}</p>
              <div className="insight-pills">
                <span>{boardMembers.length || 1} member{(boardMembers.length || 1) === 1 ? '' : 's'}</span>
                <span>{columns.length} stages</span>
                <span>{activity.length} recent updates</span>
              </div>
            </section>
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
                <img src={avatarFor(member._id, member._id === currentUser?._id ? selectedAvatarId : null)} alt={member.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{member.name}</h4>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <Mail size={12} />
                    {member.email ?? 'online@flowboard.app'}
                  </span>
                  <small className={isLive ? 'live-text' : 'offline-text'}>{member.role ?? (isCurrent ? 'Owner' : 'Collaborator')} - {isLive ? 'Live now' : 'Offline'}</small>
                </div>
                {canRemove ? (
                  <div className="member-actions">
                    <select value={member.role === 'Viewer' ? 'viewer' : 'editor'} onChange={(event) => changeMemberRole(member._id, event.target.value)}>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button className="delete-btn" onClick={() => removeCollaborator(member._id)}>Remove</button>
                  </div>
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
          <div className="avatar-picker">
            <span>Choose profile avatar</span>
            <div>
              {avatarOptions.map((avatar) => (
                <button key={avatar.id} className={selectedAvatarId === avatar.id ? 'selected' : ''} onClick={() => setSelectedAvatarId(avatar.id)} title={avatar.id}>
                  <img src={avatarFor(currentUser?._id, avatar.id)} alt={avatar.id} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser} selectedAvatarId={selectedAvatarId} onLogout={() => dispatch(userActions.logout())} />
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
          setActiveTab={setActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          openAiTask={() => setIsAiModalOpen(true)}
          aiStatus={aiStatus}
          currentUser={currentUser}
          selectedAvatarId={selectedAvatarId}
          boardMembers={boardMembers}
          openMembers={() => setActiveTab('members')}
          chatOpen={chatOpen}
          setChatOpen={setChatOpen}
          chatUnread={chatUnread}
          inboxOpen={inboxOpen}
          setInboxOpen={setInboxOpen}
          inboxEntries={[...inboxEntries, ...activity]}
        />
        {renderContent()}
      </main>
      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        board={board}
        currentUser={currentUser}
        selectedAvatarId={selectedAvatarId}
        messages={chatMessages}
        draft={chatDraft}
        setDraft={setChatDraft}
        onSend={sendChatMessage}
        onTyping={sendTyping}
        onReact={reactToChatMessage}
        onEdit={editChatMessage}
        onDelete={deleteChatMessage}
        typingUsers={chatTypingUsers}
        readState={Object.values(chatReadState).sort((a, b) => b.readAt - a.readAt)[0] ?? {}}
      />
      <CardModal isOpen={isModalOpen} onClose={closeModal} task={modalTask} columnId={modalColumnId ?? columns[0]?.id} onSave={saveTask} onDelete={deleteTask} currentUser={currentUser} />
      <BoardNameModal isOpen={isBoardModalOpen} title={newBoardTitle} setTitle={setNewBoardTitle} onClose={() => setIsBoardModalOpen(false)} onCreate={confirmCreateBoard} />
      <AiTaskModal
        isOpen={isAiModalOpen}
        aiText={aiText}
        setAiText={setAiText}
        aiStatus={aiStatus}
        boardOptions={boardOptions}
        targetBoardId={aiTargetBoardId ?? currentBoardId}
        setTargetBoardId={setAiTargetBoardId}
        onClose={() => setIsAiModalOpen(false)}
        onCreate={parseAiTask}
      />
    </div>
  )
}
