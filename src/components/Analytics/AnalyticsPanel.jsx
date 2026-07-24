import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useSelector } from 'react-redux'
import { taskSelectors } from '../../store/taskSlice.js'

export function AnalyticsPanel() {
  const tasks = useSelector(taskSelectors.selectAll)
  const total = tasks.length
  const done = tasks.filter((task) => task.columnId === 'col-done').length
  const high = tasks.filter((task) => task.priority === 'high').length
  const chart = [
    { name: 'Mon', open: total + 4 },
    { name: 'Tue', open: total + 2 },
    { name: 'Wed', open: total + 1 },
    { name: 'Thu', open: total - done },
  ]

  return (
    <div className="analytics-strip">
      <div>
        <strong>{Math.round((done / Math.max(total, 1)) * 100)}%</strong>
        <span>done</span>
      </div>
      <div>
        <strong>{high}</strong>
        <span>high priority</span>
      </div>
      <div className="mini-chart">
        <ResponsiveContainer width="100%" height={42}>
          <AreaChart data={chart}>
            <Tooltip />
            <Area type="monotone" dataKey="open" stroke="#2563eb" fill="#bfdbfe" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
