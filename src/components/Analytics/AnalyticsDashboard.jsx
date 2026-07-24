import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const burndown = [
  { day: 'Mon', tasks: 18 },
  { day: 'Tue', tasks: 15 },
  { day: 'Wed', tasks: 13 },
  { day: 'Thu', tasks: 9 },
  { day: 'Fri', tasks: 6 },
]

const velocity = [
  { day: 'Mon', done: 2 },
  { day: 'Tue', done: 3 },
  { day: 'Wed', done: 1 },
  { day: 'Thu', done: 4 },
]

export function AnalyticsDashboard() {
  return (
    <section className="analytics-dashboard">
      <article className="metric-card">
        <span>Burndown</span>
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={burndown}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="tasks" stroke="#2563eb" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </article>
      <article className="metric-card">
        <span>Velocity</span>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={velocity}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="done" fill="#16a34a" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </article>
      <article className="metric-card">
        <span>Activity heatmap</span>
        <div className="heatmap-grid">
          {Array.from({ length: 35 }).map((_, index) => (
            <span key={index} className={`heat-cell level-${index % 4}`} />
          ))}
        </div>
      </article>
      <article className="metric-card">
        <span>Bottleneck indicator</span>
        {[
          ['Backlog', 35],
          ['In progress', 84],
          ['Review', 54],
          ['Done', 18],
        ].map(([label, value]) => (
          <div className="bottleneck-row" key={label}>
            <strong>{label}</strong>
            <span>
              <i style={{ width: `${value}%` }} />
            </span>
          </div>
        ))}
      </article>
    </section>
  )
}
