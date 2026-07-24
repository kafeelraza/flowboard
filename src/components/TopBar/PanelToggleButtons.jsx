import { Bell, History } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { uiActions } from '../../store/uiSlice.js'

export function PanelToggleButtons() {
  const dispatch = useDispatch()
  const unreadCount = useSelector((state) => state.activity.unreadCount)
  const activeTab = useSelector((state) => state.ui.sidePanelTab)
  const isOpen = useSelector((state) => state.ui.isSidePanelOpen)

  const openPanel = (tab) => {
    dispatch(uiActions.setSidePanelTab(tab))
  }

  return (
    <div className="top-icon-group">
      <button
        className={`icon-button compact ${isOpen && activeTab === 'history' ? 'active' : ''}`}
        onClick={() => openPanel('history')}
        title="History"
      >
        <History size={17} />
      </button>
      <button
        className={`icon-button compact activity-toggle ${isOpen && activeTab === 'activity' ? 'active' : ''}`}
        onClick={() => openPanel('activity')}
        title="Activity"
      >
        <Bell size={17} />
        {unreadCount > 0 && <span className="notification-dot" />}
      </button>
    </div>
  )
}
