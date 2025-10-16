import type { GeneratedTasks, GeneratedTask } from '../types'

// Task category icons and display names
export const TASK_CATEGORIES = {
  Strength: {
    icon: '💪',
    displayName: 'Strength',
    color: '#e74c3c'
  },
  Intelligence: {
    icon: '🧠',
    displayName: 'Intelligence', 
    color: '#3498db'
  },
  Charisma: {
    icon: '🎭',
    displayName: 'Charisma',
    color: '#9b59b6'
  }
} as const

export type TaskCategory = keyof typeof TASK_CATEGORIES

// Interface for mapped task items compatible with TaskItem component
export interface MappedTaskItem {
  id: string
  icon: string
  description: string
  category: string
  xpReward: number
  shardReward: number
  originalTask: GeneratedTask
  taskCategory: TaskCategory
}

// Convert a single GeneratedTask to TaskItem props
export function mapGeneratedTaskToTaskItem(
  task: GeneratedTask, 
  category: TaskCategory,
  index: number
): MappedTaskItem {
  const categoryInfo = TASK_CATEGORIES[category]
  
  return {
    id: `${category.toLowerCase()}-${index}`,
    icon: categoryInfo.icon,
    description: task.description,
    category: categoryInfo.displayName,
    xpReward: task.xp,
    shardReward: task.shards,
    originalTask: task,
    taskCategory: category
  }
}

// Convert GeneratedTasks to an array of TaskItem props
export function mapGeneratedTasksToTaskItems(generatedTasks: GeneratedTasks): MappedTaskItem[] {
  const mappedTasks = [] as MappedTaskItem[]
  
  // Process each category
  (Object.keys(TASK_CATEGORIES) as TaskCategory[]).forEach((category: TaskCategory) => {
    const tasks = generatedTasks[category]
    if (tasks && tasks.length > 0) {
      tasks.forEach((task: GeneratedTask, index: number) => {
        mappedTasks.push(mapGeneratedTaskToTaskItem(task, category, index))
      })
    }
  })
  
  return mappedTasks
}

// Group mapped tasks by category for display
export function groupMappedTasksByCategory(mappedTasks: MappedTaskItem[]): Record<TaskCategory, MappedTaskItem[]> {
  const grouped: Record<TaskCategory, MappedTaskItem[]> = {
    Strength: [],
    Intelligence: [],
    Charisma: []
  }
  
  mappedTasks.forEach(task => {
    grouped[task.taskCategory].push(task)
  })
  
  return grouped
}

// Get task statistics
export function getTaskStatistics(generatedTasks: GeneratedTasks) {
  const stats = {
    totalTasks: 0,
    totalXP: 0,
    totalShards: 0,
    categories: {
      strength: generatedTasks.Strength?.length || 0,
      intelligence: generatedTasks.Intelligence?.length || 0,
      charisma: generatedTasks.Charisma?.length || 0
    }
  }
  
  // Calculate totals
  Object.keys(TASK_CATEGORIES).forEach((key) => {
    const category = key as TaskCategory
    const tasks = generatedTasks[category]
    if (tasks) {
      stats.totalTasks += tasks.length
      tasks.forEach((task: GeneratedTask) => {
        stats.totalXP += task.xp
        stats.totalShards += task.shards
      })
    }
  })
  
  return stats
}

// Check if user has any generated tasks
export function hasGeneratedTasks(generatedTasks: GeneratedTasks | null | undefined): boolean {
  if (!generatedTasks) return false
  
  return (
    (generatedTasks.Strength?.length || 0) > 0 ||
    (generatedTasks.Intelligence?.length || 0) > 0 ||
    (generatedTasks.Charisma?.length || 0) > 0
  )
}