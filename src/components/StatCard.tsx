import React from 'react'

interface StatCardProps {
  icon: string
  title: string
  value?: string | number
  children?: React.ReactNode
  className?: string
}

const StatCard: React.FC<StatCardProps> = ({ 
  icon, 
  title, 
  value, 
  children, 
  className = '' 
}) => {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <h3>{title}</h3>
        {value !== undefined && (
          <div className="stat-value">{value}</div>
        )}
        {children}
      </div>
    </div>
  )
}

export default StatCard