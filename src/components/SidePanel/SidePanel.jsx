import { X } from 'lucide-react'
import { motion as Motion, useReducedMotion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import { uiActions } from '../../store/uiSlice.js'
import { ActivityFeed } from '../ActivityFeed/ActivityFeed.jsx'
import { HistoryPanel } from '../History/HistoryPanel.jsx'

export function SidePanel() {
  const dispatch = useDispatch()
  const isOpen = useSelector((state) => state.ui.isSidePanelOpen)
  const activeTab = useSelector((state) => state.ui.sidePanelTab)
  const prefersReducedMotion = useReducedMotion()

  return (
    <Motion.aside
      className={`side-panel ${isOpen ? 'open' : ''}`}
      animate={prefersReducedMotion ? undefined : { x: isOpen ? 0 : 20 }}
      transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 1 }}
    >
      <div className="side-panel-header">
        <div className="panel-tabs">
          <button
            className={activeTab === 'history' ? 'active' : ''}
            onClick={() => dispatch(uiActions.setSidePanelTab('history'))}
          >
            History
          </button>
          <button
            className={activeTab === 'activity' ? 'active' : ''}
            onClick={() => dispatch(uiActions.setSidePanelTab('activity'))}
          >
            Activity
          </button>
        </div>
        <button className="icon-button compact ghost" onClick={() => dispatch(uiActions.closeSidePanel())} title="Close panel">
          <X size={16} />
        </button>
      </div>
      {activeTab === 'history' ? <HistoryPanel /> : <ActivityFeed />}
    </Motion.aside>
  )
}
