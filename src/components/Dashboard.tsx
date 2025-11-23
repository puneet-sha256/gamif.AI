import './Dashboard.css'
import { useAuth } from '../contexts/AuthContext'
import { useAlert } from '../contexts/AlertContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { useEffect, useState } from 'react'
import StatCard from './StatCard'
import TaskItem from './TaskItem'
import ShopItem from './ShopItem'
import ProgressBar from './ProgressBar'
import DailyActivityModal from './DailyActivityModal'
import TaskModal from './TaskModal'
import ShopItemModal from './ShopItemModal'
import RewardClaimModal from './RewardClaimModal'
import TaskHistoryModal from './TaskHistoryModal'
import ActivityHeatmap from './ActivityHeatmap'
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
import { calculateLevelProgress } from '../utils/levelCalculation'
import { calculateStreakMultiplier, formatMultiplier, calculateStreaksFromHistory } from '../utils/streakCalculation'

interface DashboardProps {
  onLogout: () => void
}

type TabType = 'profile' | 'tasks' | 'inventory' | 'shop'

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const { user, logout, getUserTasks, editGeneratedTask, deleteGeneratedTask, addUserTask, addShopItem, deleteShopItem, getShopItems, buyShopItem, useInventoryItem, updateUser, refreshUserTasks } = useAuth()
  const { showSuccess, showError, showWarning, showInfo } = useAlert()
  const { showConfirm } = useConfirm()
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

  // Task history modal state
  const [showTaskHistoryModal, setShowTaskHistoryModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Window width state for responsive chart sizing
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)

  useEffect(() => {
    if (user) {
      
      
      // Set generated tasks from user data
      setGeneratedTasks(user.generatedTasks || null)
    } else {
    }
  }, [user])

  // Track window resize for responsive chart
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Function to load fresh generated tasks
  const loadGeneratedTasks = async () => {
    setIsLoadingTasks(true)
    try {
      const tasks = await getUserTasks()
      setGeneratedTasks(tasks)
      
      if (tasks && hasGeneratedTasks(tasks)) {
        
      } else {
        
        // Check if user has goals data to generate tasks from
        if (user?.goalsData && user?.profileData) {
          
          const sessionId = userDatabase.getSessionId()
          if (sessionId) {
            try {
              const result = await aiService.generateTasks(
                sessionId,
                user.goalsData,
                user.profileData
              )
              
              if (result.success && result.data?.generatedTasks) {
                setGeneratedTasks(result.data.generatedTasks)
                
                // Refresh user data to sync with backend
                const freshTasks = await getUserTasks()
                if (freshTasks) {
                  setGeneratedTasks(freshTasks)
                }
              } else {
              }
            } catch (error) {
              console.error('❌ Dashboard: Error generating tasks:', error)
            }
          } else {
          }
        } else {
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
    const confirmed = await showConfirm(
      'Are you sure you want to delete this item?',
      'Delete',
      'Cancel'
    )
    if (confirmed) {
      const success = await deleteShopItem(itemId)
      if (!success) {
        showError('Failed to delete shop item. Please try again.')
      }
    }
  }

  // Handler for buying shop items
  const handleBuyShopItem = async (
    itemId: string, 
    itemTitle: string, 
    itemPrice: number,
    itemDescription?: string,
    itemImage?: string,
    isConsumable?: boolean,
    isKeyItem?: boolean,
    allowMultiplePurchases?: boolean
  ) => {
    // Check if this is a user's wishlist item or a built-in shop item
    const isWishlistItem = user?.shopItems?.some(item => item.id === itemId)
    
    // For built-in shop items, pass the item details
    const itemDetails = !isWishlistItem ? {
      title: itemTitle,
      description: itemDescription,
      image: itemImage,
      isConsumable,
      isKeyItem,
      allowMultiplePurchases
    } : undefined
    
    const success = await buyShopItem(itemId, itemPrice, itemDetails)
    if (success) {
      showSuccess(`🎉 Congratulations! You've successfully purchased "${itemTitle}" for ${itemPrice.toFixed(2)} 💎 shards!`)
    } else {
      showError('Failed to purchase item. Please make sure you have enough shards.')
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
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

  const analyzeDailyActivity = async (activityDate: string) => {
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

      // Call the AI service for activity analysis
      const result = await aiService.analyzeDailyActivity({
        sessionId,
        dailyActivity,
        currentTasks,
        activityDate
      })

      if (result.success && result.data) {

        // Save unclaimed rewards to user data if there are any rewards
        if (result.data.rewards?.activityRewards && result.data.rewards.activityRewards.length > 0) {
          // Get existing unclaimed rewards
          const existingRewards = user?.unclaimedRewards
          
          // Map new rewards
          const newActivities = result.data.rewards.activityRewards.map((reward: any) => ({
            activityName: reward.activityName,
            matchType: reward.matchType,
            category: reward.category as 'Strength' | 'Intelligence' | 'Charisma',
            matchedTask: reward.matchedTask,
            goalLink: reward.goalLink,
            effortRatio: reward.effortRatio,
            xpEarned: reward.xpEarned,
            shardsEarned: reward.shardsEarned,
            calculationNotes: reward.calculationNotes,
            timestamp: new Date().toISOString(),
            activityDate: activityDate
          }))
          
          // Merge with existing activities
          const allActivities = [...(existingRewards?.activities || []), ...newActivities]
          
          // Calculate combined totals
          const totalXP = (existingRewards?.totalXP || 0) + result.data.rewards.totalXP
          
          const totalShards = (existingRewards?.totalShards || 0) + result.data.rewards.totalShards
          
          // Merge category breakdowns
          const categoryBreakdown = {
            Strength: {
              xp: (existingRewards?.categoryBreakdown?.Strength?.xp || 0) + (result.data.rewards.categoryBreakdown?.Strength?.xp || 0),
              shards: (existingRewards?.categoryBreakdown?.Strength?.shards || 0) + (result.data.rewards.categoryBreakdown?.Strength?.shards || 0)
            },
            Intelligence: {
              xp: (existingRewards?.categoryBreakdown?.Intelligence?.xp || 0) + (result.data.rewards.categoryBreakdown?.Intelligence?.xp || 0),
              shards: (existingRewards?.categoryBreakdown?.Intelligence?.shards || 0) + (result.data.rewards.categoryBreakdown?.Intelligence?.shards || 0)
            },
            Charisma: {
              xp: (existingRewards?.categoryBreakdown?.Charisma?.xp || 0) + (result.data.rewards.categoryBreakdown?.Charisma?.xp || 0),
              shards: (existingRewards?.categoryBreakdown?.Charisma?.shards || 0) + (result.data.rewards.categoryBreakdown?.Charisma?.shards || 0)
            }
          }
          
          const unclaimedRewards = {
            activities: allActivities,
            totalXP,
            totalShards,
            categoryBreakdown,
            lastUpdated: new Date().toISOString()
          }

          // Also save to task history for permanent record
          const existingTaskHistory = user?.taskHistory
          
          // Map rewards to completed tasks - ActivityReward type from backend already has the correct shape
          const completedTasks = result.data.rewards.activityRewards.map((reward: any) => ({
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
          }))
          
          // Find or create daily task history for the activity date
          let dailyTasks = existingTaskHistory?.dailyTasks || []
          const existingDayIndex = dailyTasks.findIndex(dt => dt.date === activityDate)
          
          if (existingDayIndex >= 0) {
            // Append to existing day's tasks efficiently
            dailyTasks[existingDayIndex].tasks.push(...completedTasks)
          } else {
            // Create new day entry
            dailyTasks.push({
              date: activityDate,
              tasks: completedTasks
            })
          }
          
          const taskHistory = {
            dailyTasks,
            lastUpdated: new Date().toISOString()
          }

          // Save to user data
          const success = await updateUser({ unclaimedRewards, taskHistory })
          
          if (success) {
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
      
      // Calculate current level before claiming rewards
      const currentLevel = calculateLevelProgress(user?.stats?.experience || 0).actualLevel
      
      // Group activities by date
      const activitiesByDate = new Map<string, {
        activities: typeof rewards.activities,
        strengthXP: number,
        intelligenceXP: number,
        charismaXP: number,
        totalXP: number,
        totalShards: number
      }>()
      
      rewards.activities.forEach(activity => {
        // Fallback to today's date if activityDate is missing (for backward compatibility)
        const date = activity.activityDate || new Date().toISOString().split('T')[0]
        if (!activitiesByDate.has(date)) {
          activitiesByDate.set(date, {
            activities: [],
            strengthXP: 0,
            intelligenceXP: 0,
            charismaXP: 0,
            totalXP: 0,
            totalShards: 0
          })
        }
        
        const dateGroup = activitiesByDate.get(date)!
        dateGroup.activities.push(activity)
        dateGroup.totalXP += activity.xpEarned
        dateGroup.totalShards += activity.shardsEarned
        
        if (activity.category === 'Strength') {
          dateGroup.strengthXP += activity.xpEarned
        } else if (activity.category === 'Intelligence') {
          dateGroup.intelligenceXP += activity.xpEarned
        } else if (activity.category === 'Charisma') {
          dateGroup.charismaXP += activity.xpEarned
        }
      })
      
      // Step 1: Claim rewards for each date and check for level-ups
      let allSuccess = true
      let leveledUp = false
      let newLevel = currentLevel
      let totalBaseShards = 0
      let totalFinalShards = 0
      let hasMultipliers = false
      
      for (const [date, dateRewards] of activitiesByDate.entries()) {
        // Calculate base shards breakdown for this date
        const baseShardsBreakdown = {
          strength: 0,
          intelligence: 0,
          charisma: 0
        }
        
        dateRewards.activities.forEach(activity => {
          if (activity.category === 'Strength') {
            baseShardsBreakdown.strength += activity.shardsEarned
          } else if (activity.category === 'Intelligence') {
            baseShardsBreakdown.intelligence += activity.shardsEarned
          } else if (activity.category === 'Charisma') {
            baseShardsBreakdown.charisma += activity.shardsEarned
          }
        })

        const result = await userService.claimRewards({
          sessionId,
          totalXP: dateRewards.totalXP,
          totalShards: dateRewards.totalShards,
          strengthXP: dateRewards.strengthXP,
          intelligenceXP: dateRewards.intelligenceXP,
          charismaXP: dateRewards.charismaXP,
          activityDate: date,
          baseShardsBreakdown
        })
        
        if (!result.success) {
          allSuccess = false
          console.error(`❌ Failed to claim rewards for date ${date}`)
        } else {
          // Track base and final shards
          if (result.baseShards !== undefined && result.finalShards !== undefined) {
            totalBaseShards += result.baseShards
            totalFinalShards += result.finalShards
            if (result.baseShards !== result.finalShards) {
              hasMultipliers = true
            }
          } else {
            totalBaseShards += dateRewards.totalShards
            totalFinalShards += dateRewards.totalShards
          }

          // Check if we leveled up from this experience result
          const experienceMetadata = result.experienceResult?.metadata
          if (experienceMetadata?.leveledUp) {
            leveledUp = true
            newLevel = experienceMetadata.newLevel
          }
        }
      }
      
      if (allSuccess) {
        
        // Step 2: Clear unclaimed rewards in backend
        
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
            
            // Step 3: Refresh user data from server to sync UI
            await refreshUserTasks()
            
            // Build success message with multiplier info
            let message = ''
            if (leveledUp) {
              message = `🎊✨ LEVEL UP! ✨🎊\n\nCongratulations! You've reached Level ${newLevel}!\n\n`
            } else {
              message = `🎉 Congratulations!\n\nYou've claimed:\n`
            }
            
            message += `+${rewards.totalXP} XP\n`
            
            if (hasMultipliers && totalBaseShards !== totalFinalShards) {
              message += `+${totalBaseShards.toFixed(2)} 💎 Base Shards\n`
              message += `✨ Streak Bonus: ${(totalFinalShards - totalBaseShards).toFixed(2)} 💎\n`
              message += `= ${totalFinalShards.toFixed(2)} 💎 Total Shards\n`
            } else {
              message += `+${totalFinalShards.toFixed(2)} 💎 Shards\n`
            }
            
            if (!leveledUp) {
              message += `\nKeep up the great work!`
            } else {
              message += `\nYou're becoming unstoppable!`
            }
            
            showSuccess(message)
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

  const handleClaimIndividualReward = async (index: number) => {
    if (!user?.unclaimedRewards) return
    
    try {
      const sessionId = userDatabase.getSessionId()
      if (!sessionId) {
        showError('Session expired. Please log in again.')
        return
      }

      const rewards = user.unclaimedRewards
      const activity = rewards.activities[index]
      
      if (!activity) {
        showError('Activity not found.')
        return
      }

      // Calculate XP distribution for this single activity
      const strengthXP = activity.category === 'Strength' ? activity.xpEarned : 0
      const intelligenceXP = activity.category === 'Intelligence' ? activity.xpEarned : 0
      const charismaXP = activity.category === 'Charisma' ? activity.xpEarned : 0

      // Calculate base shards breakdown
      const baseShardsBreakdown = {
        strength: activity.category === 'Strength' ? activity.shardsEarned : 0,
        intelligence: activity.category === 'Intelligence' ? activity.shardsEarned : 0,
        charisma: activity.category === 'Charisma' ? activity.shardsEarned : 0
      }

      // Step 1: Use the userService API to claim individual reward
      const result = await userService.claimRewards({
        sessionId,
        totalXP: activity.xpEarned,
        totalShards: activity.shardsEarned,
        strengthXP,
        intelligenceXP,
        charismaXP,
        // Fallback to today's date if activityDate is missing (for backward compatibility)
        activityDate: activity.activityDate || new Date().toISOString().split('T')[0],
        baseShardsBreakdown
      })
      
      if (result.success) {
        if (!user.id) {
          console.error('❌ User ID not found')
          showError('Failed to update rewards. Please try again.')
          return
        }

        // Check if we leveled up
        const experienceMetadata = result.experienceResult?.metadata
        const leveledUp = experienceMetadata?.leveledUp
        const newLevel = experienceMetadata?.newLevel

        // Step 2: Remove the claimed activity from unclaimed rewards
        const updatedActivities = rewards.activities.filter((_, i) => i !== index)
        
        // Recalculate totals
        let newTotalXP = 0
        let newTotalShards = 0
        const newCategoryBreakdown = {
          Strength: { xp: 0, shards: 0 },
          Intelligence: { xp: 0, shards: 0 },
          Charisma: { xp: 0, shards: 0 }
        }

        updatedActivities.forEach(act => {
          newTotalXP += act.xpEarned
          newTotalShards += act.shardsEarned
          newCategoryBreakdown[act.category].xp += act.xpEarned
          newCategoryBreakdown[act.category].shards += act.shardsEarned
        })

        const updatedRewards = updatedActivities.length > 0 ? {
          activities: updatedActivities,
          totalXP: newTotalXP,
          totalShards: newTotalShards,
          categoryBreakdown: newCategoryBreakdown,
          lastUpdated: new Date().toISOString()
        } : null

        try {
          const updateResponse = await apiClient.put(`/user/${user.id}`, { 
            unclaimedRewards: updatedRewards 
          })
          
          if (updateResponse.success) {
            // Step 3: Refresh user data from server to sync UI
            await refreshUserTasks()
            
            // Get base and final shards for display
            const baseShards = result.baseShards ?? activity.shardsEarned
            const finalShards = result.finalShards ?? activity.shardsEarned
            
            // Build success message
            let message = ''
            if (leveledUp) {
              message = `🎊✨ LEVEL UP! ✨🎊\n\nCongratulations! You've reached Level ${newLevel}!\n\n`
            } else {
              message = `🎉 Claimed reward!\n\n`
            }
            
            message += `+${activity.xpEarned} XP (${activity.category})\n`
            
            if (baseShards !== finalShards) {
              message += `+${baseShards.toFixed(2)} 💎 Base Shards\n`
              message += `✨ Streak Bonus: ${(finalShards - baseShards).toFixed(2)} 💎\n`
              message += `= ${finalShards.toFixed(2)} 💎 Total Shards`
            } else {
              message += `+${finalShards.toFixed(2)} 💎 Shards`
            }
            
            if (leveledUp) {
              message += `\n\nYou're becoming unstoppable!`
            }
            
            showSuccess(message)
          } else {
            console.error('⚠️ Reward claimed but failed to update unclaimed rewards in backend')
            showWarning('Reward claimed successfully, but there was an issue updating. Please refresh the page.')
          }
        } catch (updateError) {
          console.error('❌ Error updating unclaimed rewards:', updateError)
          showWarning('Reward claimed successfully, but there was an issue updating. Please refresh the page.')
        }
      } else {
        console.error('❌ Failed to claim individual reward - API call failed')
        showError('Failed to claim reward. Please try again.')
      }
    } catch (error) {
      console.error('❌ Error claiming individual reward:', error)
      showError('Sorry, there was an error claiming your reward. Please try again.')
    }
  }

  const profileData = user?.profileData

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

  // Handle heatmap cell click
  const handleHeatmapCellClick = (date: string) => {
    setSelectedDate(date)
    setShowTaskHistoryModal(true)
  }

  // Get task history for selected date
  const getTaskHistoryForDate = (date: string | null) => {
    if (!date || !user?.taskHistory) return null
    
    const dailyTasks = user.taskHistory.dailyTasks.find(dt => dt.date === date)
    return dailyTasks || null
  }

  

  if (!user) {
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
              value={(user?.stats?.shards || 0).toFixed(2)}
            />
          </div>

          {/* Streak Multipliers Section */}
          <div className="streak-multipliers-section">
            <h3 className="streak-section-title">🔥 Streak Multipliers</h3>
            <div className="streak-cards">
              {(() => {
                // Calculate current streaks from activity history
                const today = new Date().toISOString().split('T')[0]
                const currentStreaks = calculateStreaksFromHistory(user?.activityHistory, today)
                
                return (
                  <>
                    <div className="streak-card strength-streak">
                      <div className="streak-header">
                        <span className="streak-icon">💪</span>
                        <span className="streak-category">Strength</span>
                      </div>
                      <div className="streak-info">
                        <div className="streak-count">
                          {currentStreaks.strengthStreak} day{currentStreaks.strengthStreak !== 1 ? 's' : ''}
                        </div>
                        <div className="streak-multiplier">
                          {formatMultiplier(calculateStreakMultiplier(currentStreaks.strengthStreak))}
                        </div>
                      </div>
                    </div>

                    <div className="streak-card intelligence-streak">
                      <div className="streak-header">
                        <span className="streak-icon">🧠</span>
                        <span className="streak-category">Intelligence</span>
                      </div>
                      <div className="streak-info">
                        <div className="streak-count">
                          {currentStreaks.intelligenceStreak} day{currentStreaks.intelligenceStreak !== 1 ? 's' : ''}
                        </div>
                        <div className="streak-multiplier">
                          {formatMultiplier(calculateStreakMultiplier(currentStreaks.intelligenceStreak))}
                        </div>
                      </div>
                    </div>

                    <div className="streak-card charisma-streak">
                      <div className="streak-header">
                        <span className="streak-icon">✨</span>
                        <span className="streak-category">Charisma</span>
                      </div>
                      <div className="streak-info">
                        <div className="streak-count">
                          {currentStreaks.charismaStreak} day{currentStreaks.charismaStreak !== 1 ? 's' : ''}
                        </div>
                        <div className="streak-multiplier">
                          {formatMultiplier(calculateStreakMultiplier(currentStreaks.charismaStreak))}
                        </div>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
            <p className="streak-description">
              Earn 10+ XP in a category daily to build your streak! Multipliers boost your shard rewards. 
              {user?.activityHistory?.streakCache && 
                ` Last calculated: ${new Date(user.activityHistory.streakCache.asOfDate).toLocaleDateString()}`
              }
            </p>
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

              // Responsive sizing based on window width
              const getResponsiveRadius = () => {
                if (windowWidth < 480) return 55  // Extra small mobile
                if (windowWidth < 768) return 60  // Mobile
                return 70  // Tablet and desktop
              }
              
              const getResponsiveStrokeWidth = () => {
                if (windowWidth < 480) return 14  // Extra small mobile
                if (windowWidth < 768) return 16  // Mobile
                return 18  // Tablet and desktop
              }

              const radius = getResponsiveRadius()
              const strokeWidth = getResponsiveStrokeWidth()
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

        {/* Activity Heatmap Section */}
        <div className="heatmap-section">
          <ActivityHeatmap 
            activityHistory={user?.activityHistory} 
            onCellClick={handleHeatmapCellClick}
          />
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
            <h2>Tasks</h2>
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
            <h2>Tasks</h2>
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
            <h2>Tasks</h2>
            <p>Complete your personalized AI-generated tasks to earn experience and shards</p>
          </div>
          <div className="tasks-header-actions">
            <button 
              className="daily-activity-btn-header"
              onClick={() => setShowDailyInput(true)}
            >
              <span className="btn-icon">🤖</span>
              <span className="btn-text">Log Daily Activities</span>
            </button>
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
          {userShopItems.length > 0 ? (
            <div className="shop-section">
              <h3>🎯 My Wish List</h3>
              <div className="shop-items">
                {userShopItems.map((item) => (
                  <ShopItem
                    key={item.id}
                    id={item.id}
                    image={item.image || '🎁'}
                    title={item.title}
                    description={item.description || 'Custom reward'}
                    price={item.price}
                    userShards={user?.stats?.shards || 0}
                    isUserItem={true}
                    onBuy={() => handleBuyShopItem(item.id, item.title, item.price, item.description, item.image, item.isConsumable, item.isKeyItem, item.allowMultiplePurchases)}
                    onDelete={() => handleDeleteShopItem(item.id)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="no-tasks-message">
              <div className="no-tasks-content">
                <h3>🛒 Your Shop is Empty</h3>
                <p>Click the "➕ Add Item" button above to add items to your wish list!</p>
              </div>
            </div>
          )}
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

  const renderInventoryTab = () => {
    const inventoryItems = user?.inventory || []
    
    // Separate items into key items and consumables
    const keyItems = inventoryItems.filter(item => item.isKeyItem)
    const consumables = inventoryItems.filter(item => item.isConsumable)
    const regularItems = inventoryItems.filter(item => !item.isKeyItem && !item.isConsumable)

    const handleUseItem = async (itemId: string, itemTitle: string) => {
      const confirmed = await showConfirm(
        `Are you sure you want to use "${itemTitle}"?\n\nThis item will be consumed and removed from your inventory.`,
        'Use',
        'Cancel'
      )
      
      if (confirmed) {
        const success = await useInventoryItem(itemId)
        if (success) {
          showSuccess(`You used "${itemTitle}"!`)
        } else {
          showError('Failed to use item. Please try again.')
        }
      }
    }

    return (
      <div className="tab-content">
        <div className="shop-header">
          <div className="shop-header-content">
            <h2>Inventory</h2>
            <p>Your purchased items</p>
          </div>
        </div>
        
        {inventoryItems.length === 0 ? (
          <div className="no-tasks-message">
            <div className="no-tasks-content">
              <h3>🎒 Your Inventory is Empty</h3>
              <p>Purchase items from the shop to see them here!</p>
            </div>
          </div>
        ) : (
          <div className="shop-grid">
            {/* Key Items Section */}
            {keyItems.length > 0 && (
              <div className="shop-section">
                <h3>🔑 Key Items</h3>
                <div className="shop-items">
                  {keyItems.map((item) => (
                    <div key={item.id} className="shop-item">
                      <div className="item-image">{item.image || '🎁'}</div>
                      <div className="item-info">
                        <h4>{item.title}</h4>
                        <p>{item.description || 'Key item'}</p>
                        <div className="item-price">Owned: {item.count}x</div>
                      </div>
                      <div className="shop-item-actions">
                        <span className="item-badge key-item-badge">Key Item</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Consumable Items Section */}
            {consumables.length > 0 && (
              <div className="shop-section">
                <h3>⚡ Consumables</h3>
                <div className="shop-items">
                  {consumables.map((item) => (
                    <div key={item.id} className="shop-item">
                      <div className="item-image">{item.image || '🎁'}</div>
                      <div className="item-info">
                        <h4>{item.title}</h4>
                        <p>{item.description || 'Consumable item'}</p>
                        <div className="item-price">Owned: {item.count}x</div>
                      </div>
                      <div className="shop-item-actions">
                        <button 
                          className="buy-button" 
                          onClick={() => handleUseItem(item.id, item.title)}
                          title={`Use ${item.title}`}
                        >
                          Use
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Regular Items Section */}
            {regularItems.length > 0 && (
              <div className="shop-section">
                <h3>📦 Regular Items</h3>
                <div className="shop-items">
                  {regularItems.map((item) => (
                    <div key={item.id} className="shop-item">
                      <div className="item-image">{item.image || '🎁'}</div>
                      <div className="item-info">
                        <h4>{item.title}</h4>
                        <p>{item.description || 'Purchased item'}</p>
                        <div className="item-price">Owned: {item.count}x</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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
        return renderInventoryTab()
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
          <button 
            className={`unclaimed-rewards-button ${user?.unclaimedRewards && user.unclaimedRewards.activities.length > 0 ? 'has-rewards' : ''}`}
            onClick={() => setShowRewardClaimModal(true)}
          >
            <span className="reward-icon">🎁</span>
            <span className="reward-text">Unclaimed Rewards</span>
            {user?.unclaimedRewards && user.unclaimedRewards.activities.length > 0 && (
              <span className="reward-badge">{user.unclaimedRewards.activities.length}</span>
            )}
          </button>
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
            Tasks
          </button>
          <button 
            className={`nav-tab ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <span className="tab-icon">🎒</span>
            Inventory
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
        onClaimIndividualReward={handleClaimIndividualReward}
        isClaiming={isClaiming}
      />

      {/* Task History Modal */}
      <TaskHistoryModal
        isOpen={showTaskHistoryModal}
        onClose={() => {
          setShowTaskHistoryModal(false)
          setSelectedDate(null)
        }}
        date={selectedDate}
        taskHistory={getTaskHistoryForDate(selectedDate)}
      />
    </div>
  )
}

export default Dashboard
