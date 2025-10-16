import './Dashboard.css'
import { useAuth } from '../contexts/AuthContext'
import { useEffect, useState } from 'react'
import StatCard from './StatCard'
import TaskItem from './TaskItem'
import ShopItem from './ShopItem'
import ProgressBar from './ProgressBar'
import DailyActivityModal from './DailyActivityModal'
import { 
  mapGeneratedTasksToTaskItems, 
  groupMappedTasksByCategory, 
  hasGeneratedTasks,
  TASK_CATEGORIES,
  type MappedTaskItem
} from '../utils/taskMapping'
import type { GeneratedTasks } from '../types'

interface DashboardProps {
  onLogout: () => void
}

type TabType = 'profile' | 'tasks' | 'inventory' | 'shop'

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const { user, logout, getUserTasks } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [showDailyInput, setShowDailyInput] = useState(false)
  const [dailyActivity, setDailyActivity] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTasks | null>(null)
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)

  useEffect(() => {
    console.log('🎯 Dashboard: Component mounted')
    if (user) {
      console.log('✅ Dashboard: User data loaded:', {
        id: user.id,
        username: user.username,
        email: user.email,
        hasProfile: !!user.profileData,
        hasGoals: !!user.goalsData,
        hasGeneratedTasks: !!user.generatedTasks
      })
      
      // Set generated tasks from user data
      setGeneratedTasks(user.generatedTasks || null)
    } else {
      console.log('⚠️ Dashboard: No user data available')
    }
  }, [user])

  // Function to load fresh generated tasks
  const loadGeneratedTasks = async () => {
    setIsLoadingTasks(true)
    try {
      const tasks = await getUserTasks()
      setGeneratedTasks(tasks)
      console.log('✅ Dashboard: Generated tasks loaded:', {
        hasStrength: !!tasks?.Strength?.length,
        hasIntelligence: !!tasks?.Intelligence?.length,
        hasCharisma: !!tasks?.Charisma?.length
      })
    } catch (error) {
      console.error('❌ Dashboard: Error loading generated tasks:', error)
    } finally {
      setIsLoadingTasks(false)
    }
  }

  const handleLogout = async () => {
    console.log('🔄 Dashboard: Logout initiated by user')
    try {
      await logout()
      console.log('✅ Dashboard: Logout successful, navigating away')
      onLogout()
    } catch (error) {
      console.error('❌ Dashboard: Error during logout:', error)
    }
  }

  const getCurrency = (code: string) => {
    const currencies: { [key: string]: string } = {
      'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 
      'KRW': '₩', 'INR': '₹', 'CAD': 'C$', 'AUD': 'A$'
    }
    return currencies[code] || code
  }

  const analyzeDailyActivity = async () => {
    if (!dailyActivity.trim()) return
    
    setIsAnalyzing(true)
    
    try {
      // Simple AI-like analysis (would be replaced with actual AI service)
      const activities = dailyActivity.toLowerCase()
      let totalXP = 0
      let strengthXP = 0
      let intelligenceXP = 0
      let charismaXP = 0
      let shards = 0
      
      // Fitness activities
      if (activities.includes('exercise') || activities.includes('workout') || activities.includes('gym') || activities.includes('run')) {
        strengthXP += 30
        shards += 8
      }
      if (activities.includes('walk') || activities.includes('jog') || activities.includes('bike')) {
        strengthXP += 20
        shards += 5
      }
      
      // Learning activities
      if (activities.includes('read') || activities.includes('book') || activities.includes('study')) {
        intelligenceXP += 25
        shards += 6
      }
      if (activities.includes('learn') || activities.includes('course') || activities.includes('tutorial')) {
        intelligenceXP += 35
        shards += 8
      }
      if (activities.includes('code') || activities.includes('program') || activities.includes('develop')) {
        intelligenceXP += 40
        shards += 10
      }
      
      // Social activities
      if (activities.includes('meeting') || activities.includes('presentation') || activities.includes('speak')) {
        charismaXP += 30
        shards += 7
      }
      if (activities.includes('help') || activities.includes('teach') || activities.includes('mentor')) {
        charismaXP += 25
        shards += 6
      }
      
      totalXP = strengthXP + intelligenceXP + charismaXP
      
      if (totalXP > 0) {
        // Here you would call your actual API to update XP and shards
        console.log('🎯 Daily Activity Analysis:', {
          strengthXP,
          intelligenceXP, 
          charismaXP,
          totalXP,
          shards
        })
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        alert(`Amazing work today! 🎉\n\nXP Earned:\n• Strength: +${strengthXP}\n• Intelligence: +${intelligenceXP}\n• Charisma: +${charismaXP}\n• Shards: +${shards} 💎\n\nTotal XP: +${totalXP}`)
      } else {
        alert('Keep going! Try mentioning specific activities like exercise, reading, coding, or social interactions to earn XP! 💪')
      }
      
      setDailyActivity('')
      setShowDailyInput(false)
    } catch (error) {
      console.error('Error analyzing daily activity:', error)
      alert('Sorry, there was an error analyzing your activity. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const profileData = user?.profileData
  const goalsData = user?.goalsData

  // Calculate experience progress for next level
  const calculateLevelProgress = (experience: number) => {
    // New formula: xp_for_level(n) = 100 + Math.floor((n - 1) / 10) * 50
    const xpForLevel = (n: number) => 100 + Math.floor((n - 1) / 10) * 50
    
    // Calculate what level the user should actually be at based on total experience
    const calculateActualLevel = (totalExp: number): number => {
      let level = 1
      let expUsed = 0
      
      while (true) {
        const expNeededForNextLevel = xpForLevel(level)
        if (expUsed + expNeededForNextLevel > totalExp) {
          break
        }
        expUsed += expNeededForNextLevel
        level++
      }
      
      return level
    }
    
    const actualLevel = calculateActualLevel(experience)
    
    // Calculate total XP needed up to the start of actual level
    let totalExpForCurrentLevel = 0
    for (let i = 1; i < actualLevel; i++) {
      totalExpForCurrentLevel += xpForLevel(i)
    }
    
    const expNeededForNextLevel = xpForLevel(actualLevel)
    
    // Calculate progress within current level
    const expInCurrentLevel = Math.max(0, experience - totalExpForCurrentLevel)
    const progressPercentage = Math.min((expInCurrentLevel / expNeededForNextLevel) * 100, 100)
    
    return {
      current: expInCurrentLevel,
      needed: expNeededForNextLevel,
      percentage: progressPercentage,
      actualLevel: actualLevel
    }
  }

  // Calculate attribute distribution from total experience
  const calculateAttributeDistribution = () => {
    const totalExp = user?.stats?.experience || 0
    const strength = user?.stats?.strength || 0
    const intelligence = user?.stats?.intelligence || 0
    const charisma = user?.stats?.charisma || 0
    
    // If attributes don't sum to total experience, show as percentage distribution
    const attributeSum = strength + intelligence + charisma
    
    if (attributeSum === 0 || totalExp === 0) {
      return { 
        strength: 0, 
        intelligence: 0, 
        charisma: 0, 
        total: 0,
        strengthPercent: 0,
        intelligencePercent: 0,
        charismaPercent: 0
      }
    }
    
    return {
      strength: strength,
      intelligence: intelligence,
      charisma: charisma,
      total: totalExp,
      strengthPercent: (strength / totalExp * 100),
      intelligencePercent: (intelligence / totalExp * 100),
      charismaPercent: (charisma / totalExp * 100)
    }
  }

  console.log('🎯 Dashboard: Rendering with data:', {
    hasProfileData: !!profileData,
    hasGoalsData: !!goalsData,
    profileName: profileData?.name,
    currency: profileData?.currency
  })

  if (!user) {
    console.log('⚠️ Dashboard: No user data, cannot render dashboard')
    return <div>Loading user data...</div>
  }

  const renderProfileTab = () => (
    <div className="tab-content">
      <div className="profile-overview">
        <h2>Player Profile</h2>
        <p>Your journey in the development realm continues...</p>
      </div>
      
      <div className="profile-content">
        {profileData && (
          <div className="profile-info-section">
            <div className="profile-card">
              <h3>Personal Information</h3>
              <div className="profile-details">
                <div className="profile-item">
                  <span className="label">Player Name:</span>
                  <span className="value">{profileData.name}</span>
                </div>
                <div className="profile-item">
                  <span className="label">Age:</span>
                  <span className="value">{profileData.age} years</span>
                </div>
                <div className="profile-item">
                  <span className="label">Monthly Limit:</span>
                  <span className="value">
                    {getCurrency(profileData.currency)}{profileData.monthlyLimit.toLocaleString()}
                  </span>
                </div>
                <div className="profile-item">
                  <span className="label">Currency:</span>
                  <span className="value">{profileData.currency}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="player-stats-section">
          <div className="stats-row">
            <StatCard 
              icon="⚔️" 
              title={`Level ${calculateLevelProgress(user?.stats?.experience || 0).actualLevel}`}
              className="level-card"
            >
              <ProgressBar
                current={calculateLevelProgress(user?.stats?.experience || 0).current}
                max={calculateLevelProgress(user?.stats?.experience || 0).needed}
                percentage={calculateLevelProgress(user?.stats?.experience || 0).percentage}
              />
            </StatCard>
            
            <StatCard 
              icon="💎" 
              title="Shards"
              value={user?.stats?.shards || 0}
            />
          </div>
        </div>

        <div className="experience-section">
          <div className="experience-card">
            <h3>Experience Distribution</h3>
            {(() => {
              const distribution = calculateAttributeDistribution()
              const { strength, intelligence, charisma, total } = distribution
              
              if (total === 0) {
                return (
                  <div className="no-experience">
                    <span>No experience earned yet</span>
                  </div>
                )
              }

              // Calculate angles for the ring segments
              const strengthAngle = (strength / total) * 360
              const intelligenceAngle = (intelligence / total) * 360
              const charismaAngle = (charisma / total) * 360

              const radius = 70
              const strokeWidth = 18
              const normalizedRadius = radius - strokeWidth * 0.5
              const circumference = normalizedRadius * 2 * Math.PI

              // Calculate stroke dash arrays for each segment
              const strengthDash = (strengthAngle / 360) * circumference
              const intelligenceDash = (intelligenceAngle / 360) * circumference
              const charismaDash = (charismaAngle / 360) * circumference

              return (
                <div className="experience-content">
                  <div className="ring-chart-wrapper">
                    <svg height={radius * 2} width={radius * 2}>
                      {/* Background circle */}
                      <circle
                        cx={radius}
                        cy={radius}
                        r={normalizedRadius}
                        stroke="rgba(148, 163, 184, 0.2)"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                      />
                      
                      {/* Strength segment */}
                      <circle
                        cx={radius}
                        cy={radius}
                        r={normalizedRadius}
                        stroke="#ef4444"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={`${strengthDash} ${circumference}`}
                        strokeDashoffset={0}
                        transform={`rotate(-90 ${radius} ${radius})`}
                        className="strength-segment"
                      />
                      
                      {/* Intelligence segment */}
                      <circle
                        cx={radius}
                        cy={radius}
                        r={normalizedRadius}
                        stroke="#3b82f6"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={`${intelligenceDash} ${circumference}`}
                        strokeDashoffset={-strengthDash}
                        transform={`rotate(-90 ${radius} ${radius})`}
                        className="intelligence-segment"
                      />
                      
                      {/* Charisma segment */}
                      <circle
                        cx={radius}
                        cy={radius}
                        r={normalizedRadius}
                        stroke="#8b5cf6"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={`${charismaDash} ${circumference}`}
                        strokeDashoffset={-(strengthDash + intelligenceDash)}
                        transform={`rotate(-90 ${radius} ${radius})`}
                        className="charisma-segment"
                      />
                    </svg>
                    
                    <div className="ring-center-text">
                      <div className="total-exp">{total}</div>
                      <div className="exp-label">Total XP</div>
                    </div>
                  </div>
                  
                  <div className="experience-legend">
                    <div className="legend-row">
                      <div className="legend-color strength-color"></div>
                      <span className="legend-label">💪 Strength</span>
                      <span className="legend-stats">{strength} XP ({distribution.strengthPercent.toFixed(1)}%)</span>
                    </div>
                    <div className="legend-row">
                      <div className="legend-color intelligence-color"></div>
                      <span className="legend-label">🧠 Intelligence</span>
                      <span className="legend-stats">{intelligence} XP ({distribution.intelligencePercent.toFixed(1)}%)</span>
                    </div>
                    <div className="legend-row">
                      <div className="legend-color charisma-color"></div>
                      <span className="legend-label">✨ Charisma</span>
                      <span className="legend-stats">{charisma} XP ({distribution.charismaPercent.toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )

  const renderTasksTab = () => {
    // Check if we have generated tasks
    const hasUserTasks = hasGeneratedTasks(generatedTasks)
    
    if (isLoadingTasks) {
      return (
        <div className="tab-content">
          <div className="tasks-header">
            <h2>Tasks & Challenges</h2>
            <p>Loading your personalized tasks...</p>
          </div>
          <div className="loading-tasks">⏳ Loading...</div>
        </div>
      )
    }

    if (!hasUserTasks) {
      return (
        <div className="tab-content">
          <div className="tasks-header">
            <h2>Tasks & Challenges</h2>
            <p>Complete tasks to earn experience and shards</p>
          </div>
          
          <div className="no-tasks-message">
            <div className="no-tasks-content">
              <h3>🎯 No Tasks Generated Yet</h3>
              <p>Complete your profile and goals setup to get personalized daily tasks!</p>
              <button 
                onClick={loadGeneratedTasks}
                className="refresh-tasks-btn"
              >
                🔄 Load Tasks
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Convert generated tasks to mappable format
    const mappedTasks = mapGeneratedTasksToTaskItems(generatedTasks!)
    const groupedTasks = groupMappedTasksByCategory(mappedTasks)

    return (
      <div className="tab-content">
        <div className="tasks-header">
          <h2>Tasks & Challenges</h2>
          <p>Complete your personalized AI-generated tasks to earn experience and shards</p>
          <button 
            onClick={loadGeneratedTasks}
            className="refresh-tasks-btn small"
            disabled={isLoadingTasks}
          >
            🔄 Refresh
          </button>
        </div>
        
        <div className="tasks-grid">
          {/* Strength Tasks */}
          {groupedTasks.Strength.length > 0 && (
            <div className="task-section">
              <h3>{TASK_CATEGORIES.Strength.icon} Strength Tasks</h3>
              <div className="task-list">
                {groupedTasks.Strength.map((task: MappedTaskItem) => (
                  <TaskItem
                    key={task.id}
                    icon={task.icon}
                    description={task.description}
                    category={task.category}
                    xpReward={task.xpReward}
                    shardReward={task.shardReward}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Intelligence Tasks */}
          {groupedTasks.Intelligence.length > 0 && (
            <div className="task-section">
              <h3>{TASK_CATEGORIES.Intelligence.icon} Intelligence Tasks</h3>
              <div className="task-list">
                {groupedTasks.Intelligence.map((task: MappedTaskItem) => (
                  <TaskItem
                    key={task.id}
                    icon={task.icon}
                    description={task.description}
                    category={task.category}
                    xpReward={task.xpReward}
                    shardReward={task.shardReward}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Charisma Tasks */}
          {groupedTasks.Charisma.length > 0 && (
            <div className="task-section">
              <h3>{TASK_CATEGORIES.Charisma.icon} Charisma Tasks</h3>
              <div className="task-list">
                {groupedTasks.Charisma.map((task: MappedTaskItem) => (
                  <TaskItem
                    key={task.id}
                    icon={task.icon}
                    description={task.description}
                    category={task.category}
                    xpReward={task.xpReward}
                    shardReward={task.shardReward}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="challenge-section">
          <h3>🏆 Weekly Challenges</h3>
          <div className="challenge-list">
            <TaskItem
              icon="🎯"
              description="Complete daily tasks for 7 days straight"
              category="Consistency"
              xpReward={200}
              shardReward={50}
              isChallenge={true}
              progress="3/7 days"
            />
          </div>
        </div>
        
        {/* Daily Activity Input Section */}
        <div className="daily-activity-section">
          <button 
            className="daily-activity-btn"
            onClick={() => setShowDailyInput(true)}
          >
            <span className="btn-icon">🤖</span>
            <div className="btn-content">
              <span className="btn-title">Log Daily Activities</span>
              <span className="btn-subtitle">Let AI analyze your day and award XP!</span>
            </div>
          </button>
        </div>
        
        <DailyActivityModal
          isOpen={showDailyInput}
          onClose={() => setShowDailyInput(false)}
          dailyActivity={dailyActivity}
          setDailyActivity={setDailyActivity}
          isAnalyzing={isAnalyzing}
          onAnalyze={analyzeDailyActivity}
        />
      </div>
    )
  }

  const renderShopTab = () => (
    <div className="tab-content">
      <div className="shop-header">
        <h2>Shop</h2>
        <p>Spend your shards on rewards and upgrades</p>
        <div className="currency-display">
          <span className="currency-amount">{user?.stats?.shards || 0} 💎 Shards</span>
        </div>
      </div>
      
      <div className="shop-grid">
        <div className="shop-section">
          <h3>💝 Rewards</h3>
          <div className="shop-items">
            <ShopItem
              image="🎮"
              title="Gaming Session"
              description="Unlock 2 hours of guilt-free gaming"
              price={50}
              userShards={user?.stats?.shards || 0}
            />
            
            <ShopItem
              image="🍕"
              title="Treat Yourself"
              description="Order your favorite meal"
              price={75}
              userShards={user?.stats?.shards || 0}
            />
            
            <ShopItem
              image="📚"
              title="Book Purchase"
              description="Buy that book you've been wanting"
              price={100}
              userShards={user?.stats?.shards || 0}
            />
          </div>
        </div>

        <div className="shop-section">
          <h3>⚡ Power-ups</h3>
          <div className="shop-items">
            <ShopItem
              image="🔥"
              title="XP Booster"
              description="Double XP for 24 hours"
              price={30}
              userShards={user?.stats?.shards || 0}
            />
            
            <ShopItem
              image="⏰"
              title="Task Extension"
              description="Extra day to complete tasks"
              price={25}
              userShards={user?.stats?.shards || 0}
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab()
      case 'tasks':
        return renderTasksTab()
      case 'inventory':
        // Inventory is disabled, redirect to profile
        setActiveTab('profile')
        return renderProfileTab()
      case 'shop':
        return renderShopTab()
      default:
        return renderProfileTab()
    }
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-logo">
          <h1>GAMIF.AI</h1>
          <div className="subtitle">Player Development System</div>
        </div>
        <div className="user-info">
          {profileData && (
            <span className="welcome-text">Welcome, {profileData.name}!</span>
          )}
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
      
      <div className="dashboard-navigation">
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="tab-icon">👤</span>
            Profile
          </button>
          <button 
            className={`nav-tab ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            <span className="tab-icon">📋</span>
            Tasks & Challenges
          </button>
          <button 
            className={`nav-tab ${activeTab === 'inventory' ? 'active' : ''} disabled`}
            onClick={() => {}} // Disabled, no action
            disabled
          >
            <span className="tab-icon">🎒</span>
            <div className="tab-text">
              <span>Inventory</span>
              <span className="coming-soon">Coming Soon</span>
            </div>
          </button>
          <button 
            className={`nav-tab ${activeTab === 'shop' ? 'active' : ''}`}
            onClick={() => setActiveTab('shop')}
          >
            <span className="tab-icon">🛒</span>
            Shop
          </button>
        </div>
      </div>
      
      <div className="dashboard-content">
        {renderTabContent()}
      </div>
    </div>
  )
}

export default Dashboard
