import { BarChart3, CalendarDays, FolderKanban, HelpCircle, Inbox, Layers, Settings, Users } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { uiActions } from '../../store/uiSlice.js'
import { Avatar } from '../common/Avatar.jsx'

const navItems = [
  ['Dashboard', <BarChart3 size={16} />],
  ['Inbox', <Inbox size={16} />],
  ['Calendar', <CalendarDays size={16} />],
  ['Projects', <FolderKanban size={16} />],
  ['Collaborators', <Users size={16} />],
  ['Components', <Layers size={16} />],
  ['Settings', <Settings size={16} />],
  ['Help Center', <HelpCircle size={16} />],
]

export function DashboardSidebar() {
  const dispatch = useDispatch()
  const user = useSelector((state) => state.user.currentUser)
  const activeSidebarItem = useSelector((state) => state.ui.activeSidebarItem)

  const handleNavigate = (label) => {
    dispatch(uiActions.setActiveSidebarItem(label))
    if (label === 'Dashboard') {
      dispatch(uiActions.setActiveView('analytics'))
      return
    }
    if (label === 'Projects') {
      dispatch(uiActions.setActiveView('board'))
      return
    }
    dispatch(uiActions.setActiveView('workspace'))
  }

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-logo">
        <FolderKanban size={18} />
        <div>
          <strong>FlowBoard</strong>
          <span>Workspace</span>
        </div>
      </div>
      <nav className="sidebar-nav" aria-label="Workspace navigation">
        {navItems.map(([label, icon]) => (
          <button key={label} className={activeSidebarItem === label ? 'active' : ''} onClick={() => handleNavigate(label)}>
            {icon}
            {label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <Avatar name={user.name} color={user.avatarColor} size={30} />
        <div>
          <strong>{user.name}</strong>
          <span>{user.email}</span>
        </div>
      </div>
    </aside>
  )
}
