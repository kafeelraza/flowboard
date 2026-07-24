import { Bell } from 'lucide-react'
import { useSelector } from 'react-redux'
import { Avatar } from '../common/Avatar.jsx'

const labels = {
  created_task: 'created',
  deleted_task: 'deleted',
  updated_task: 'updated',
  moved_task: 'moved',
  created_column: 'created column',
  renamed_column: 'renamed column',
  reviewed_task: 'reviewed',
}

export function ActivityFeed() {
  const entries = useSelector((state) => state.activity.entries.slice(0, 7))
  const unreadCount = useSelector((state) => state.activity.unreadCount)
  const users = useSelector((state) => state.presence.onlineUsers)

  return (
    <section className="panel activity-panel">
      <div className="panel-header">
        <h2>
          <Bell size={18} /> Activity
        </h2>
        <span>{unreadCount} new</span>
      </div>
      <div className="activity-list">
        <div className="date-divider">Today</div>
        {entries.map((entry) => (
          <div className="activity-item" key={entry.id}>
            <Avatar
              name={entry.userName}
              color={users.find((user) => user.userId === entry.userId)?.avatarColor ?? '#64748b'}
              size={20}
            />
            <div>
              <p>
                <strong>{entry.userName}</strong> {labels[entry.action] ?? entry.action} <strong>{entry.targetTitle}</strong>
              </p>
              <small>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
