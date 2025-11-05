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

const DAYS_PER_WEEK = 7
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ activityHistory }) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all')

  // Generate grid data for last 12 months
  const { gridData, monthLabels } = useMemo(() => {
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

    // Calculate start date (go back 12 months from today, then to the Sunday before that)
    const startDate = new Date(today)
    startDate.setFullYear(startDate.getFullYear() - 1)
    const dayOfWeek = startDate.getDay() // 0 = Sunday
    startDate.setDate(startDate.getDate() - dayOfWeek) // Go to previous Sunday
    
    // Build grid: 7 rows (days of week) x ~53 columns (weeks)
    const grid: Array<Array<{ date: string; value: number; dateObj: Date } | null>> = Array.from({ length: DAYS_PER_WEEK }, () => [])
    const months: Array<{ month: string; weekIndex: number; span: number }> = []
    
    let currentMonth = ''
    let monthStartWeek = 0
    let weekIndex = 0
    
    const currentDate = new Date(startDate)
    
    // Generate data for each week
    while (currentDate <= today) {
      const weekStart = new Date(currentDate)
      
      // Check if we're starting a new month
      const monthName = weekStart.toLocaleDateString('en-US', { month: 'short' })
      if (monthName !== currentMonth) {
        if (currentMonth !== '') {
          // Save previous month
          months.push({
            month: currentMonth,
            weekIndex: monthStartWeek,
            span: weekIndex - monthStartWeek
          })
        }
        currentMonth = monthName
        monthStartWeek = weekIndex
      }
      
      // Add days for this week
      for (let dayOfWeek = 0; dayOfWeek < DAYS_PER_WEEK; dayOfWeek++) {
        const date = new Date(weekStart)
        date.setDate(date.getDate() + dayOfWeek)
        
        if (date <= today && date >= startDate) {
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
          
          grid[dayOfWeek].push({ date: dateStr, value, dateObj: date })
        } else {
          grid[dayOfWeek].push(null)
        }
      }
      
      weekIndex++
      currentDate.setDate(currentDate.getDate() + DAYS_PER_WEEK)
    }
    
    // Add final month
    if (currentMonth !== '') {
      months.push({
        month: currentMonth,
        weekIndex: monthStartWeek,
        span: weekIndex - monthStartWeek
      })
    }
    
    return { gridData: grid, monthLabels: months }
  }, [activityHistory, selectedCategory])

  // Calculate stats
  const stats = useMemo(() => {
    let totalXP = 0
    let activeDays = 0
    
    gridData.forEach(row => {
      row.forEach(cell => {
        if (cell && cell.value > 0) {
          totalXP += cell.value
          activeDays++
        }
      })
    })
    
    return { totalXP, activeDays }
  }, [gridData])

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

  return (
    <div className="activity-heatmap">
      <div className="heatmap-header">
        <div className="heatmap-title-section">
          <h3>Activity Heatmap</h3>
          <p>Your effort over the last 12 months</p>
        </div>
        
        <div className="heatmap-stats">
          <div className="heatmap-stat">
            <span className="stat-value">{stats.totalXP}</span>
            <span className="stat-label">Total XP</span>
          </div>
          <div className="heatmap-stat">
            <span className="stat-value">{stats.activeDays}</span>
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
        {/* Month labels */}
        <div className="heatmap-months">
          {monthLabels.map((label, idx) => (
            <div
              key={idx}
              className="month-label"
              style={{ gridColumnStart: label.weekIndex + 2, gridColumnEnd: `span ${label.span}` }}
            >
              {label.month}
            </div>
          ))}
        </div>

        {/* Grid with day labels and cells */}
        <div className="heatmap-grid">
          {gridData.map((row, rowIndex) => (
            <div key={rowIndex} className="heatmap-row">
              {/* Day label - only show Mon, Wed, Fri */}
              <div className="day-label">
                {rowIndex % 2 === 1 ? DAY_LABELS[rowIndex] : ''}
              </div>
              
              {/* Week cells */}
              <div className="week-cells">
                {row.map((cell, colIndex) => (
                  cell ? (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className="heatmap-cell"
                      style={{ backgroundColor: getCellColor(cell.value) }}
                      title={`${formatDate(cell.date)}: ${cell.value} XP`}
                      data-value={cell.value}
                    />
                  ) : (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className="heatmap-cell empty"
                    />
                  )
                ))}
              </div>
            </div>
          ))}
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
