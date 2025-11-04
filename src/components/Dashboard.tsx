import './Dashboard.css'
import { useAuth } from '../contexts/AuthContext'
import { useAlert } from '../contexts/AlertContext'
import { useEffect, useState } from 'react'
import StatCard from './StatCard'
import TaskItem from './TaskItem'
import ShopItem from './ShopItem'
import ProgressBar from './ProgressBar'
import DailyActivityModal from './DailyActivityModal'
import TaskModal from './TaskModal'
import ShopItemModal from './ShopItemModal'
import RewardClaimModal from './RewardClaimModal'
import { 
  mapGeneratedTasksToTaskItems, 
  groupMappedTasksByCategory, 
  hasGeneratedTasks,
  TASK_CATEGORIES,
  type MappedTaskItem
} from '../utils/taskMapping'
import type { GeneratedTasks, GeneratedTask } from '../types'
import { userDatabase } from '../client/services/fileUserDatabase'
import { aiService } from '../client/services/aiService'
import { userService } from '../client/services/userService'
import { apiClient } from '../client/services/apiClient'

interface DashboardProps {
  onLogout: () => void
}

type TabType = 'profile' | 'tasks' | 'inventory' | 'shop'

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const { user, logout, getUserTasks, editGeneratedTask, deleteGeneratedTask, addUserTask, addShopItem, deleteShopItem, getShopItems, updateUser, refreshUserTasks } = useAuth()
  const { showSuccess, showError, showWarning, showInfo } = useAlert()
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [showDailyInput, setShowDailyInput] = useState(false)
  const [dailyActivity, setDailyActivity] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTasks | null>(null)
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  
  // Task modal state (unified for add and edit)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<GeneratedTask & { category: string } | null>(null)

  // Shop modal state
  const [showShopItemModal, setShowShopItemModal] = useState(false)

  // Reward claim modal state
  const [showRewardClaimModal, setShowRewardClaimModal] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)

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
    console.log('🔄 Dashboard: Loading generated tasks...')
    try {
      const tasks = await getUserTasks()
      setGeneratedTasks(tasks)
      
      if (tasks && hasGeneratedTasks(tasks)) {
        console.log('✅ Dashboard: Generated tasks loaded:', {
          hasStrength: !!tasks?.Strength?.length,
          hasIntelligence: !!tasks?.Intelligence?.length,
          hasCharisma: !!tasks?.Charisma?.length
        })
      } else {
        console.log('ℹ️ Dashboard: No tasks found in database.')
        
        // Check if user has goals data to generate tasks from
        if (user?.goalsData && user?.profileData) {
          console.log('🤖 Dashboard: User has goals and profile. Attempting to generate tasks...')
          
          const sessionId = userDatabase.getSessionId()
          if (sessionId) {
            try {
              const result = await aiService.generateTasks(
                sessionId,
                user.goalsData,
                user.profileData
              )
              
              if (result.success && result.data?.generatedTasks) {
                console.log('✅ Dashboard: Tasks generated successfully via AI')
                setGeneratedTasks(result.data.generatedTasks)
                
                // Refresh user data to sync with backend
                const freshTasks = await getUserTasks()
                if (freshTasks) {
                  setGeneratedTasks(freshTasks)
                }
              } else {
                console.log('⚠️ Dashboard: Task generation failed:', result.message)
              }
            } catch (error) {
              console.error('❌ Dashboard: Error generating tasks:', error)
            }
          } else {
            console.log('⚠️ Dashboard: No session ID available for task generation')
          }
        } else {
          console.log('ℹ️ Dashboard: User needs to complete Goals Setup to generate tasks.')
        }
      }
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
      showError('Failed to delete task. Please try again.')
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

  // Handler for adding shop items
  const handleAddShopItem = async (item: {
    title: string
    description?: string
    price: number
    image?: string
  }) => {
    const success = await addShopItem(item)
    if (success) {
      setShowShopItemModal(false)
    } else {
      throw new Error('Failed to add shop item')
    }
  }

  // Handler for deleting shop items
  const handleDeleteShopItem = async (itemId: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      const success = await deleteShopItem(itemId)
      if (!success) {
        showError('Failed to delete shop item. Please try again.')
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
        showError('Session expired. Please log in again.')
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

      // Call the AI service for activity analysis
      const result = await aiService.analyzeDailyActivity({
        sessionId,
        dailyActivity,
        currentTasks
      })

      if (result.success && result.data) {
        console.log('✅ AI Analysis completed successfully')
        console.log('🎯 Activity Matches:', result.data.matches)
        console.log('💰 Rewards:', result.data.rewards)

        // Save unclaimed rewards to user data if there are any rewards
        if (result.data.rewards?.activityRewards && result.data.rewards.activityRewards.length > 0) {
          const unclaimedRewards = {
            activities: result.data.rewards.activityRewards.map((reward: any) => ({
              activityName: reward.activityName,
              matchType: reward.matchType,
              category: reward.category as 'Strength' | 'Intelligence' | 'Charisma',
              matchedTask: reward.matchedTask,
              goalLink: reward.goalLink,
              effortRatio: reward.effortRatio,
              xpEarned: reward.xpEarned,
              shardsEarned: reward.shardsEarned,
              calculationNotes: reward.calculationNotes,
              timestamp: new Date().toISOString()
            })),
            totalXP: result.data.rewards.totalXP,
            totalShards: result.data.rewards.totalShards,
            categoryBreakdown: result.data.rewards.categoryBreakdown,
            lastUpdated: new Date().toISOString()
          }

          // Save to user data
          const success = await updateUser({ unclaimedRewards })
          
          if (success) {
            console.log('✅ Unclaimed rewards saved successfully')
            showSuccess(`🎉 Great job! You've earned rewards from ${result.data.rewards.activityRewards.length} activities.\n\nClick the "Unclaimed Rewards" button to view and claim them!`)
          } else {
            console.error('❌ Failed to save unclaimed rewards')
            showError('Activity analyzed but failed to save rewards. Please try again.')
          }
        } else {
          showInfo('No activities were identified in your update that match your goals.')
        }
        
        setDailyActivity('')
        setShowDailyInput(false)
      } else {
        console.error('❌ AI Analysis failed:', result.message)
        showError(`Failed to analyze activity: ${result.message}`)
      }
    } catch (error) {
      console.error('❌ Error analyzing daily activity:', error)
      showError('Sorry, there was an error analyzing your activity. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleClaimRewards = async () => {
    if (!user?.unclaimedRewards) return
    
    setIsClaiming(true)
    
    try {
      const sessionId = userDatabase.getSessionId()
      if (!sessionId) {
        showError('Session expired. Please log in again.')
        setIsClaiming(false)
        return
      }

      const rewards = user.unclaimedRewards
      
      console.log('🎁 Starting reward claim process...')
      
      // Step 1: Use the userService API to claim rewards (updates stats in backend)
      const result = await userService.claimRewards({
        sessionId,
        totalXP: rewards.totalXP,
        totalShards: rewards.totalShards,
        strengthXP: rewards.categoryBreakdown.Strength.xp,
        intelligenceXP: rewards.categoryBreakdown.Intelligence.xp,
        charismaXP: rewards.categoryBreakdown.Charisma.xp
      })
      
      if (result.success) {
        console.log('✅ Stats updated in backend')
        
        // Step 2: Clear unclaimed rewards in backend
        console.log('🧹 Clearing unclaimed rewards in backend...')
        
        if (!user.id) {
          console.error('❌ User ID not found')
          showError('Failed to clear rewards. Please try again.')
          return
        }
        
        // Use apiClient to clear unclaimed rewards
        try {
          const clearResponse = await apiClient.put(`/user/${user.id}`, { 
            unclaimedRewards: null 
          })
          
          if (clearResponse.success) {
            console.log('✅ Unclaimed rewards cleared in backend')
            
            // Step 3: Refresh user data from server to sync UI
            console.log('🔄 Refreshing user data from server...')
            await refreshUserTasks()
            
            console.log('✅ Rewards claimed successfully - all steps completed')
            showSuccess(`🎉 Congratulations!\n\nYou've claimed:\n+${rewards.totalXP} XP\n+${rewards.totalShards} Shards\n\nKeep up the great work!`)
            setShowRewardClaimModal(false)
          } else {
            console.error('⚠️ Rewards applied but failed to clear unclaimed rewards in backend')
            showWarning('Rewards claimed successfully, but there was an issue clearing the unclaimed rewards. Please refresh the page.')
          }
        } catch (clearError) {
          console.error('❌ Error clearing unclaimed rewards:', clearError)
          showWarning('Rewards claimed successfully, but there was an issue clearing the unclaimed rewards. Please refresh the page.')
        }
      } else {
        console.error('❌ Failed to claim rewards - API call failed')
        showError('Failed to claim rewards. Please try again.')
      }
    } catch (error) {
      console.error('❌ Error claiming rewards:', error)
      showError('Sorry, there was an error claiming your rewards. Please try again.')
    } finally {
      setIsClaiming(false)
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
          <div className="loading-tasks">⏳ Thinking...</div>
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
                disabled={isLoadingTasks}
              >
                {isLoadingTasks ? (
                  <>
                    <span className="loading-spinner"></span>
                    Thinking...
                  </>
                ) : (
                  <>🔄 Generate Tasks</>
                )}
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

  const renderShopTab = () => {
    const userShopItems = getShopItems()

    return (
      <div className="tab-content">
        <div className="shop-header">
          <div className="shop-header-content">
            <h2>Shop</h2>
            <p>Spend your shards on rewards and upgrades</p>
          </div>
          <div className="shop-header-actions">
            <div className="currency-display">
              <span className="currency-amount">{user?.stats?.shards || 0} 💎 Shards</span>
            </div>
            <button 
              onClick={() => setShowShopItemModal(true)}
              className="add-task-btn"
            >
              ➕ Add Item
            </button>
          </div>
        </div>
        
        <div className="shop-grid">
          {/* User's Custom Items */}
          {userShopItems.length > 0 && (
            <div className="shop-section">
              <h3>🎯 My Wish List</h3>
              <div className="shop-items">
                {userShopItems.map((item) => (
                  <ShopItem
                    key={item.id}
                    image={item.image || '🎁'}
                    title={item.title}
                    description={item.description || 'Custom reward'}
                    price={item.price}
                    userShards={user?.stats?.shards || 0}
                    isUserItem={true}
                    onDelete={() => handleDeleteShopItem(item.id)}
                  />
                ))}
              </div>
            </div>
          )}

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

        {/* Shop Item Modal */}
        <ShopItemModal
          isOpen={showShopItemModal}
          onClose={() => setShowShopItemModal(false)}
          onSave={handleAddShopItem}
        />
      </div>
    )
  }

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
          {user?.unclaimedRewards && user.unclaimedRewards.activities.length > 0 && (
            <button 
              className="unclaimed-rewards-button" 
              onClick={() => setShowRewardClaimModal(true)}
            >
              <span className="reward-icon">🎁</span>
              <span className="reward-text">Unclaimed Rewards</span>
              <span className="reward-badge">{user.unclaimedRewards.activities.length}</span>
            </button>
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

      {/* Reward Claim Modal */}
      <RewardClaimModal
        isOpen={showRewardClaimModal}
        onClose={() => setShowRewardClaimModal(false)}
        unclaimedRewards={user?.unclaimedRewards || null}
        onClaimRewards={handleClaimRewards}
        isClaiming={isClaiming}
      />
    </div>
  )
}

export default Dashboard
