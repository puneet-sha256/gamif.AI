import './Dashboard.css'
import { useAuth } from '../contexts/AuthContext'
import { useEffect, useState } from 'react'
import StatCard from './StatCard'
import TaskItem from './TaskItem'
import ShopItem from './ShopItem'
import ProgressBar from './ProgressBar'
import DailyActivityModal from './DailyActivityModal'
import TaskModal from './TaskModal'
import { 
  mapGeneratedTasksToTaskItems, 
  groupMappedTasksByCategory, 
  hasGeneratedTasks,
  TASK_CATEGORIES,
  type MappedTaskItem
} from '../utils/taskMapping'
import type { GeneratedTasks, GeneratedTask } from '../types'
import { userDatabase } from '../client/services/fileUserDatabase'

interface DashboardProps {
  onLogout: () => void
}

type TabType = 'profile' | 'tasks' | 'inventory' | 'shop'

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const { user, logout, getUserTasks, editGeneratedTask, deleteGeneratedTask, addUserTask } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [showDailyInput, setShowDailyInput] = useState(false)
  const [dailyActivity, setDailyActivity] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTasks | null>(null)
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  
  // Task modal state (unified for add and edit)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<GeneratedTask & { category: string } | null>(null)

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

  // Handle task edit - opens modal with task data
  const handleEditTask = (taskId: string, category: 'Strength' | 'Intelligence' | 'Charisma') => {
    if (!generatedTasks) return
    
    const tasks = generatedTasks[category]
    const task = tasks?.find(t => t.id === taskId)
    
    if (task) {
      setEditingTask({
        ...task,
        category
      })
      setShowTaskModal(true)
    }
  }

  // Handle task delete
  const handleDeleteTask = async (taskId: string, category: 'Strength' | 'Intelligence' | 'Charisma') => {
    const success = await deleteGeneratedTask(taskId, category)
    if (success) {
      // Refresh tasks
      await loadGeneratedTasks()
    } else {
      alert('Failed to delete task. Please try again.')
    }
  }

  // Unified handler for both add and edit task
  const handleSaveTask = async (task: {
    title?: string
    description: string
    category?: 'Strength' | 'Intelligence' | 'Charisma'
    xp: number
    shards: number
  }) => {
    if (editingTask) {
      // Edit mode - use category from editingTask
      const updates: { title?: string; description?: string; xp?: number; shards?: number } = {
        title: task.title, // Always include title (can be empty or filled)
        description: task.description,
        xp: task.xp,
        shards: task.shards
      }
      
      const success = await editGeneratedTask(editingTask.id, editingTask.category as 'Strength' | 'Intelligence' | 'Charisma', updates)
      if (success) {
        await loadGeneratedTasks()
        setShowTaskModal(false)
        setEditingTask(null)
      } else {
        throw new Error('Failed to update task')
      }
    } else {
      // Add mode - category is required
      if (!task.title) {
        throw new Error('Title is required for new tasks')
      }
      if (!task.category) {
        throw new Error('Category is required for new tasks')
      }
      const success = await addUserTask({
        title: task.title,
        description: task.description,
        category: task.category,
        xp: task.xp,
        shards: task.shards
      })
      if (success) {
        await loadGeneratedTasks()
        setShowTaskModal(false)
      } else {
        throw new Error('Failed to add task')
      }
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
      const sessionId = userDatabase.getSessionId()
      if (!sessionId) {
        alert('Session expired. Please log in again.')
        return
      }

      // Prepare current tasks data to send to the AI
      const currentTasks = generatedTasks ? {
        Strength: generatedTasks.Strength?.map(task => ({
          id: task.id,
          title: task.title || '',
          description: task.description,
          category: 'Strength' as const,
          xp: task.xp,
          shards: task.shards
        })),
        Intelligence: generatedTasks.Intelligence?.map(task => ({
          id: task.id,
          title: task.title || '',
          description: task.description,
          category: 'Intelligence' as const,
          xp: task.xp,
          shards: task.shards
        })),
        Charisma: generatedTasks.Charisma?.map(task => ({
          id: task.id,
          title: task.title || '',
          description: task.description,
          category: 'Charisma' as const,
          xp: task.xp,
          shards: task.shards
        }))
      } : undefined

      console.log('🤖 Sending daily activity to AI for analysis...')
      console.log('📝 Activity:', dailyActivity)
      console.log('📋 Current Tasks:', currentTasks)

      // Call the API endpoint
      const response = await fetch('http://localhost:3001/api/ai/analyze-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          dailyActivity,
          currentTasks
        }),
      })

      const result = await response.json()

      if (result.success && result.data) {
        console.log('✅ AI Analysis completed successfully')
        console.log('🎯 Activity Matches:', result.data.matches)
        console.log('💰 Rewards:', result.data.rewards)

        // Build a comprehensive message combining all information
        let fullMessage = ''

        // Add processed activities
        if (result.data.rewards?.activityRewards && result.data.rewards.activityRewards.length > 0) {
          fullMessage += '🎯 PROCESSED ACTIVITIES:\n' + '='.repeat(40) + '\n\n'
          
          result.data.rewards.activityRewards.forEach((reward: any, index: number) => {
            const typeEmoji: { [key: string]: string } = {
              'exact': '✅',
              'similar': '🔄',
              'goal-aligned': '🎯'
            }
            const emoji = typeEmoji[reward.matchType] || '•'
            
            const categoryEmoji: { [key: string]: string } = {
              'Strength': '💪',
              'Intelligence': '🧠',
              'Charisma': '✨'
            }
            const catEmoji = categoryEmoji[reward.category] || '📌'

            fullMessage += `${index + 1}. ${emoji} ${reward.activityName} ${catEmoji}\n`
            fullMessage += `   Match: ${reward.matchType}\n`
            if (reward.matchedTask) {
              fullMessage += `   Task: ${reward.matchedTask}\n`
            }
            fullMessage += `   Rewards: +${reward.xpEarned} XP, +${reward.shardsEarned} shards\n\n`
          })

          // Add summary
          fullMessage += '\n' + '='.repeat(40) + '\n'
          fullMessage += `🎉 SUMMARY\n`
          fullMessage += '='.repeat(40) + '\n'
          fullMessage += `💰 Total XP: +${result.data.rewards.totalXP}\n`
          fullMessage += `💎 Total Shards: +${result.data.rewards.totalShards}\n\n`
          fullMessage += `� By Category:\n`
          fullMessage += `  💪 Strength: ${result.data.rewards.categoryBreakdown.Strength.xp} XP\n`
          fullMessage += `  🧠 Intelligence: ${result.data.rewards.categoryBreakdown.Intelligence.xp} XP\n`
          fullMessage += `  ✨ Charisma: ${result.data.rewards.categoryBreakdown.Charisma.xp} XP\n\n`
          fullMessage += `✅ Processed: ${result.data.rewards.processedCount}\n`
          fullMessage += `⏭️ Skipped: ${result.data.rewards.skippedCount}\n`
        }

        // Add skipped activities if any
        if (result.data.rewards?.skippedActivities && result.data.rewards.skippedActivities.length > 0) {
          fullMessage += '\n' + '='.repeat(40) + '\n'
          fullMessage += '⏭️ SKIPPED (Unrelated to Goals):\n'
          fullMessage += '='.repeat(40) + '\n\n'
          
          result.data.rewards.skippedActivities.forEach((skipped: any, index: number) => {
            fullMessage += `${index + 1}. ${skipped.activityName}\n`
            fullMessage += `   ${skipped.reason}\n`
            fullMessage += `   ${skipped.notes}\n\n`
          })
        }

        // Show single comprehensive alert
        if (fullMessage) {
          alert(fullMessage)
        } else {
          alert('No activities were identified in your update.')
        }
        
        setDailyActivity('')
        setShowDailyInput(false)
      } else {
        console.error('❌ AI Analysis failed:', result.message)
        alert(`Failed to analyze activity: ${result.message}`)
      }
    } catch (error) {
      console.error('❌ Error analyzing daily activity:', error)
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
          <div className="tasks-header-content">
            <h2>Tasks & Challenges</h2>
            <p>Complete your personalized AI-generated tasks to earn experience and shards</p>
          </div>
          <button 
            onClick={() => {
              setEditingTask(null)
              setShowTaskModal(true)
            }}
            className="add-task-btn"
          >
            ➕ Add Task
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
                    description={task.originalTask.title ? `${task.originalTask.title}: ${task.description}` : task.description}
                    category={task.category + (task.originalTask.title ? ' ✨' : '')}
                    xpReward={task.xpReward}
                    shardReward={task.shardReward}
                    taskId={task.originalTask.id}
                    taskCategory={task.taskCategory}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
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
                    description={task.originalTask.title ? `${task.originalTask.title}: ${task.description}` : task.description}
                    category={task.category + (task.originalTask.title ? ' ✨' : '')}
                    xpReward={task.xpReward}
                    shardReward={task.shardReward}
                    taskId={task.originalTask.id}
                    taskCategory={task.taskCategory}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
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
                    description={task.originalTask.title ? `${task.originalTask.title}: ${task.description}` : task.description}
                    category={task.category + (task.originalTask.title ? ' ✨' : '')}
                    xpReward={task.xpReward}
                    shardReward={task.shardReward}
                    taskId={task.originalTask.id}
                    taskCategory={task.taskCategory}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
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

        {/* Unified Task Modal (for both add and edit) */}
        <TaskModal
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false)
            setEditingTask(null)
          }}
          onSave={handleSaveTask}
          taskData={editingTask}
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
