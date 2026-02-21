import { useMemo, useState } from 'react'
import './ActivityHeatmap.css'
import type { ActivityHistory } from '../shared/types/user.types'

interface ActivityHeatmapProps {
  activityHistory?: ActivityHistory
  onCellClick?: (date: string) => void
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
const WEEKS_TO_SHOW = 53 // Exactly 53 weeks

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ activityHistory, onCellClick }) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all')

  // Generate grid data for exactly 53 weeks
  const { gridData, monthLabels } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Find the Sunday of the current week (week starts on Sunday)
    const todayDayOfWeek = today.getDay()
    const currentWeekSunday = new Date(today)
    currentWeekSunday.setDate(currentWeekSunday.getDate() - todayDayOfWeek)
    currentWeekSunday.setHours(0, 0, 0, 0)
    
    // Start date is 52 weeks before current week's Sunday
    const startDate = new Date(currentWeekSunday)
    startDate.setDate(startDate.getDate() - (52 * 7))
    startDate.setHours(0, 0, 0, 0)
    
    // End date is today (we want to include all days up to today)
    const endDate = new Date(today)
    
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
    
    // Build grid: 7 rows (days of week) x 53 columns (weeks)
    const grid: Array<Array<{ date: string; value: number; dateObj: Date } | null>> = Array.from({ length: DAYS_PER_WEEK }, () => [])
    const monthsMap = new Map<string, number>() // month name -> first week index containing 1st of that month
    
    const currentDate = new Date(startDate)
    let weekIndex = 0
    let lastMonthAdded: string | null = null
    
    // Add the first month label at week 0
    const firstMonth = startDate.toLocaleDateString('en-US', { month: 'short' })
    monthsMap.set(firstMonth + startDate.getFullYear(), 0)
    lastMonthAdded = firstMonth + startDate.getFullYear()
    
    // Generate data for exactly 53 weeks
    while (weekIndex < WEEKS_TO_SHOW) {
      // For each day of the week in this week column
      for (let dayOfWeek = 0; dayOfWeek < DAYS_PER_WEEK; dayOfWeek++) {
        const date = new Date(currentDate)
        date.setDate(date.getDate() + dayOfWeek)
        date.setHours(0, 0, 0, 0)
        
        const monthKey = date.toLocaleDateString('en-US', { month: 'short' }) + date.getFullYear()
        
        // Check if we've entered a new month and it's not already recorded
        if (monthKey !== lastMonthAdded && !monthsMap.has(monthKey)) {
          monthsMap.set(monthKey, weekIndex)
          lastMonthAdded = monthKey
        }
        
        if (date <= endDate) {
          // Format date as YYYY-MM-DD in local timezone to avoid timezone issues
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          const dateStr = `${year}-${month}-${day}`
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
          
          // dayOfWeek index matches the row since we start from Sunday
          grid[dayOfWeek].push({ date: dateStr, value, dateObj: date })
        } else {
          grid[dayOfWeek].push(null)
        }
      }
      
      weekIndex++
      currentDate.setDate(currentDate.getDate() + DAYS_PER_WEEK)
    }
    
    // Build month labels array from the map
    const months: Array<{ month: string; weekIndex: number }> = []
    const sortedMonths = Array.from(monthsMap.entries()).sort((a, b) => a[1] - b[1])
    
    for (let i = 0; i < sortedMonths.length; i++) {
      const [monthKey, weekIdx] = sortedMonths[i]
      // Extract just the month name (remove year)
      const monthName = monthKey.substring(0, 3)
      months.push({ month: monthName, weekIndex: weekIdx })
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
          <p>Your effort over the last year</p>
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

      {stats.activeDays === 0 && (
        <p className="heatmap-empty-message">Complete daily activities to fill your heatmap</p>
      )}

      <div className="heatmap-container">
        {/* Month labels */}
        <div className="heatmap-months">
          {monthLabels.map((label, idx) => {
            // Calculate flex-grow based on weeks until next label
            const nextWeekIndex = idx < monthLabels.length - 1 ? monthLabels[idx + 1].weekIndex : WEEKS_TO_SHOW
            const weekSpan = nextWeekIndex - label.weekIndex
            
            return (
              <div
                key={idx}
                className="month-label"
                style={{ 
                  flexGrow: weekSpan,
                  flexShrink: 0
                }}
              >
                {label.month}
              </div>
            )
          })}
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
                      onClick={() => onCellClick?.(cell.date)}
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
