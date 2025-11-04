import { useMemo, useState } from 'react'
import './ActivityHeatmap.css'
import type { ActivityHistory } from '../shared/types/user.types'

interface ActivityHeatmapProps {
  activityHistory?: ActivityHistory
}

type CategoryFilter = 'all' | 'Strength' | 'Intelligence' | 'Charisma'

const CATEGORY_COLORS = {
  Strength: '#ef4444',
  Intelligence: '#3b82f6',
  Charisma: '#8b5cf6',
  all: '#10b981'
}

const TOTAL_DAYS = 84 // 12 weeks of activity history
const DAYS_PER_WEEK = 7

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ activityHistory }) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all')

  // Generate last 84 days (12 weeks) of data
  const heatmapData = useMemo(() => {
    const days: Array<{ date: string; value: number; dateObj: Date }> = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Create a map of existing activity data
    const activityMap = new Map<string, { strength: number; intelligence: number; charisma: number; total: number }>()
    if (activityHistory?.dailyActivities) {
      activityHistory.dailyActivities.forEach(activity => {
        activityMap.set(activity.date, {
          strength: activity.strength,
          intelligence: activity.intelligence,
          charisma: activity.charisma,
          total: activity.total
        })
      })
    }

    // Generate last 84 days
    for (let i = TOTAL_DAYS - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const activity = activityMap.get(dateStr)
      let value = 0
      
      if (activity) {
        switch (selectedCategory) {
          case 'Strength':
            value = activity.strength
            break
          case 'Intelligence':
            value = activity.intelligence
            break
          case 'Charisma':
            value = activity.charisma
            break
          case 'all':
          default:
            value = activity.total
            break
        }
      }
      
      days.push({ date: dateStr, value, dateObj: date })
    }
    
    return days
  }, [activityHistory, selectedCategory])

  // Calculate intensity levels (0-4 scale)
  const getIntensityLevel = (value: number): number => {
    if (value === 0) return 0
    if (value <= 20) return 1
    if (value <= 50) return 2
    if (value <= 100) return 3
    return 4
  }

  // Get color based on intensity
  const getCellColor = (value: number): string => {
    const intensity = getIntensityLevel(value)
    const baseColor = CATEGORY_COLORS[selectedCategory]
    
    if (intensity === 0) return 'rgba(148, 163, 184, 0.1)'
    
    // Convert hex to rgba with varying opacity
    const hex = baseColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    
    const opacities = [0.2, 0.4, 0.6, 0.8, 1.0]
    return `rgba(${r}, ${g}, ${b}, ${opacities[intensity]})`
  }

  // Format date for tooltip
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Group days into weeks
  const weeks = useMemo(() => {
    const grouped: Array<Array<{ date: string; value: number; dateObj: Date }>> = []
    for (let i = 0; i < heatmapData.length; i += DAYS_PER_WEEK) {
      grouped.push(heatmapData.slice(i, i + DAYS_PER_WEEK))
    }
    return grouped
  }, [heatmapData])

  // Get month labels
  const monthLabels = useMemo(() => {
    const labels: Array<{ month: string; index: number }> = []
    let currentMonth = ''
    
    heatmapData.forEach((day, index) => {
      const month = day.dateObj.toLocaleDateString('en-US', { month: 'short' })
      if (month !== currentMonth && index % DAYS_PER_WEEK === 0) {
        currentMonth = month
        labels.push({ month, index: Math.floor(index / 7) })
      }
    })
    
    return labels
  }, [heatmapData])

  const totalXP = useMemo(() => {
    return heatmapData.reduce((sum, day) => sum + day.value, 0)
  }, [heatmapData])

  const daysWithActivity = useMemo(() => {
    return heatmapData.filter(day => day.value > 0).length
  }, [heatmapData])

  return (
    <div className="activity-heatmap">
      <div className="heatmap-header">
        <div className="heatmap-title-section">
          <h3>Activity Heatmap</h3>
          <p>Your effort over the last 12 weeks</p>
        </div>
        
        <div className="heatmap-stats">
          <div className="heatmap-stat">
            <span className="stat-value">{totalXP}</span>
            <span className="stat-label">Total XP</span>
          </div>
          <div className="heatmap-stat">
            <span className="stat-value">{daysWithActivity}</span>
            <span className="stat-label">Active Days</span>
          </div>
        </div>
      </div>

      <div className="heatmap-filters">
        <button
          className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
          style={{ '--filter-color': CATEGORY_COLORS.all } as React.CSSProperties}
        >
          All Categories
        </button>
        <button
          className={`filter-btn ${selectedCategory === 'Strength' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('Strength')}
          style={{ '--filter-color': CATEGORY_COLORS.Strength } as React.CSSProperties}
        >
          💪 Strength
        </button>
        <button
          className={`filter-btn ${selectedCategory === 'Intelligence' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('Intelligence')}
          style={{ '--filter-color': CATEGORY_COLORS.Intelligence } as React.CSSProperties}
        >
          🧠 Intelligence
        </button>
        <button
          className={`filter-btn ${selectedCategory === 'Charisma' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('Charisma')}
          style={{ '--filter-color': CATEGORY_COLORS.Charisma } as React.CSSProperties}
        >
          ✨ Charisma
        </button>
      </div>

      <div className="heatmap-container">
        <div className="heatmap-months">
          {monthLabels.map((label, idx) => (
            <div
              key={idx}
              className="month-label"
              style={{ gridColumn: `${label.index + 1} / span 1` }}
            >
              {label.month}
            </div>
          ))}
        </div>

        <div className="heatmap-grid">
          <div className="day-labels">
            <div className="day-label">Mon</div>
            <div className="day-label"></div>
            <div className="day-label">Wed</div>
            <div className="day-label"></div>
            <div className="day-label">Fri</div>
            <div className="day-label"></div>
            <div className="day-label">Sun</div>
          </div>

          <div className="heatmap-weeks">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="heatmap-week">
                {week.map((day) => (
                  <div
                    key={day.date}
                    className="heatmap-cell"
                    style={{ backgroundColor: getCellColor(day.value) }}
                    title={`${formatDate(day.date)}: ${day.value} XP`}
                    data-value={day.value}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="heatmap-legend">
          <span className="legend-label">Less</span>
          <div className="legend-scale">
            <div className="legend-cell" style={{ backgroundColor: 'rgba(148, 163, 184, 0.1)' }} />
            <div className="legend-cell" style={{ backgroundColor: getCellColor(10) }} />
            <div className="legend-cell" style={{ backgroundColor: getCellColor(30) }} />
            <div className="legend-cell" style={{ backgroundColor: getCellColor(60) }} />
            <div className="legend-cell" style={{ backgroundColor: getCellColor(120) }} />
          </div>
          <span className="legend-label">More</span>
        </div>
      </div>
    </div>
  )
}

export default ActivityHeatmap
