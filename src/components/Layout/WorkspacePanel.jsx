import { Bell, CalendarDays, HelpCircle, Inbox, Layers, Settings, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { boardActions } from '../../store/boardSlice.js'
import { uiActions } from '../../store/uiSlice.js'
import { Avatar } from '../common/Avatar.jsx'

const viewConfig = {
  Inbox: {
    icon: Inbox,
    title: 'Inbox',
    text: 'Recent activity, mentions, and incoming board updates are collected here.',
    action: 'Open activity',
    tab: 'activity',
  },
  Calendar: {
    icon: CalendarDays,
    title: 'Calendar',
    text: 'Use this area to review due dates and plan board work by day.',
    action: 'Show history',
    tab: 'history',
  },
  Collaborators: {
    icon: Users,
    title: 'Collaborators',
    text: 'Online teammates, live cursors, and editing presence are tracked from this workspace.',
    action: 'Open activity',
    tab: 'activity',
  },
  Components: {
    icon: Layers,
    title: 'Components',
    text: 'Reusable cards, labels, task templates, and board building blocks will live here.',
    action: 'Back to board',
  },
  Settings: {
    icon: Settings,
    title: 'Settings',
    text: 'Workspace preferences, theme controls, and profile settings can be configured here.',
    action: 'Back to board',
  },
  'Help Center': {
    icon: HelpCircle,
    title: 'Help Center',
    text: 'Keyboard shortcuts: Ctrl+Z undo, Ctrl+Y redo, / focuses Quick Add, Ctrl+K opens commands.',
    action: 'Back to board',
  },
}

export function WorkspacePanel() {
  const dispatch = useDispatch()
  const activeSidebarItem = useSelector((state) => state.ui.activeSidebarItem)
  const selectedDate = useSelector((state) => state.ui.selectedDate)
  const currentBoardId = useSelector((state) => state.board.currentBoardId)
  const board = useSelector((state) => state.board.boardsById[state.board.currentBoardId])
  const tasks = useSelector((state) => Object.values(state.tasks.entities).filter((task) => task.boardId === state.board.currentBoardId))
  const activity = useSelector((state) => state.activity.entries.filter((entry) => entry.boardId === state.board.currentBoardId).slice(0, 6))
  const users = useSelector((state) => state.presence.onlineUsers)
  const currentUser = useSelector((state) => state.user.currentUser)
  const token = useSelector((state) => state.user.token)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState(null)
  const [boardMembers, setBoardMembers] = useState([])
  const [membersStatus, setMembersStatus] = useState('idle')
  const [inboxEntries, setInboxEntries] = useState([])
  const config = viewConfig[activeSidebarItem] ?? viewConfig.Inbox
  const Icon = config.icon
  const dueTasks = tasks
    .filter((task) => task.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 8)
  const labels = [...new Map(tasks.flatMap((task) => task.labels).map((label) => [label.text, label])).values()]
  const highPriorityCount = tasks.filter((task) => task.priority === 'high').length
  const isBoardOwner = board?.ownerId === currentUser?._id
  const canInviteToBoard = Boolean(currentUser?._id && board)

  useEffect(() => {
    if (activeSidebarItem !== 'Collaborators' || !currentBoardId || !token) return
    let cancelled = false

    const loadMembers = async () => {
      setMembersStatus('loading')
      try {
        const response = await fetch(`/api/boards/${currentBoardId}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? 'Could not load collaborators')
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
  }, [activeSidebarItem, currentBoardId, token])

  useEffect(() => {
    if (activeSidebarItem !== 'Inbox' || !token) return
    let cancelled = false

    const loadInbox = async () => {
      try {
        const response = await fetch('/api/activity/inbox', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? 'Could not load inbox')
        if (!cancelled) setInboxEntries(result)
      } catch {
        if (!cancelled) setInboxEntries([])
      }
    }

    loadInbox()
    return () => {
      cancelled = true
    }
  }, [activeSidebarItem, token])

  const handleAction = () => {
    if (config.tab) {
      dispatch(uiActions.setSidePanelTab(config.tab))
      return
    }
    dispatch(uiActions.setActiveSidebarItem('Projects'))
    dispatch(uiActions.setActiveView('board'))
  }

  const inviteCollaborator = async (event) => {
    event.preventDefault()
    if (!inviteEmail.trim()) return
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
    setMembersStatus('loading')
    try {
      const response = await fetch(`/api/boards/${currentBoardId}/members/${userId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Could not remove collaborator')
      dispatch(boardActions.setBoardMembers({ boardId: currentBoardId, members: result.members }))
      setBoardMembers((members) => members.filter((member) => member._id !== userId))
      setMembersStatus('ready')
    } catch (error) {
      setMembersStatus('failed')
      setInviteStatus({ type: 'error', text: error.message })
    }
  }

  const renderBody = () => {
    if (activeSidebarItem === 'Inbox') {
      const entries = [...inboxEntries, ...activity]
      return (
        <div className="workspace-list">
          {entries.map((entry) => (
            <button key={entry.id ?? entry._id} onClick={() => dispatch(uiActions.setSidePanelTab('activity'))}>
              <strong>{entry.userName}</strong>
              <span>{entry.action.replaceAll('_', ' ')}: {entry.targetTitle}</span>
            </button>
          ))}
          {entries.length === 0 && <p>No inbox updates yet.</p>}
        </div>
      )
    }

    if (activeSidebarItem === 'Calendar') {
      return (
        <div className="workspace-list">
          {dueTasks.map((task) => (
            <button key={task._id} onClick={() => dispatch(uiActions.selectTask(task._id))}>
              <strong>{task.dueDate}</strong>
              <span>{task.title}</span>
            </button>
          ))}
          {dueTasks.length === 0 && <p>No due dates on this board.</p>}
        </div>
      )
    }

    if (activeSidebarItem === 'Collaborators') {
      return (
        <div className="collaborator-grid">
          {canInviteToBoard && (
            <form className="invite-form" onSubmit={inviteCollaborator}>
              <input
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                type="email"
                placeholder="teammate@example.com"
              />
              <button className="toolbar-button" disabled={inviteStatus?.type === 'loading'}>
                Invite
              </button>
              {inviteStatus && <span className={`invite-status ${inviteStatus.type}`}>{inviteStatus.text}</span>}
            </form>
          )}
          {!canInviteToBoard && <p className="empty-text">Open a board before inviting collaborators.</p>}
          <div className="members-summary">
            <strong>Board members ({boardMembers.length || users.length})</strong>
            <span>Invite a registered user by email to share this board.</span>
          </div>
          {membersStatus === 'loading' && <p className="empty-text">Loading collaborators...</p>}
          {boardMembers.map((member) => {
            const liveUser = users.find((user) => user.userId === member._id)
            const isCurrentMember = member._id === currentUser?._id
            const isLive = isCurrentMember || Boolean(liveUser)
            return (
              <div key={member._id} className="collaborator-row">
                <Avatar name={member.name} color={member.avatarColor} size={30} />
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.email}</span>
                  <small>{member.role} - {isLive ? 'Live now' : 'Offline'}</small>
                </div>
                {isBoardOwner && member._id !== currentUser?._id && (
                  <button className="text-danger-button" onClick={() => removeCollaborator(member._id)}>
                    Remove
                  </button>
                )}
              </div>
            )
          })}
          {boardMembers.length === 0 && membersStatus !== 'loading' && users.map((user) => (
            <div key={user.userId} className="collaborator-row">
              <Avatar name={user.name} color={user.avatarColor} size={30} />
              <div>
                <strong>{user.name}</strong>
                <span>{user.cursor ? 'Live on board' : 'Online'}</span>
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (activeSidebarItem === 'Components') {
      return (
        <div className="workspace-chip-grid">
          {labels.map((label) => (
            <span key={label.text} className="label" style={{ '--label': label.color }}>{label.text}</span>
          ))}
          <span className="workspace-stat">{tasks.length} task templates available from current board cards</span>
        </div>
      )
    }

    if (activeSidebarItem === 'Settings') {
      return (
        <div className="workspace-list">
          <div>
            <strong>{currentUser?.name}</strong>
            <span>{currentUser?.email}</span>
          </div>
          <div>
            <strong>Atlas persistence</strong>
            <span>Board state saves to MongoDB under board {currentBoardId}</span>
          </div>
          <div>
            <strong>{highPriorityCount} high priority tasks</strong>
            <span>Use filters on the board to focus urgent work.</span>
          </div>
        </div>
      )
    }

    return (
      <div className="workspace-list">
        {['Ctrl+Z undo', 'Ctrl+Y redo', '/ focus quick add', 'Ctrl+K command palette'].map((shortcut) => (
          <div key={shortcut}>
            <strong>{shortcut}</strong>
            <span>Available across the board workspace.</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <section className="workspace-panel">
      <div className="workspace-panel-card">
        <Icon size={28} />
        <span>{selectedDate}</span>
        <h1>{config.title}</h1>
        <p>{config.text}</p>
        {renderBody()}
        <button className="toolbar-button primary" onClick={handleAction}>
          {config.tab && <Bell size={16} />}
          {config.action}
        </button>
      </div>
    </section>
  )
}
