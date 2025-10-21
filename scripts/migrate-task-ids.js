// Migration script to add IDs to existing tasks
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const USERS_FILE = path.join(__dirname, '../data/users.json')

async function addTaskIds() {
  console.log('🔄 Starting task ID migration...')
  
  try {
    // Read users file
    const users = await fs.readJSON(USERS_FILE)
    console.log(`📊 Found ${users.length} users`)
    
    let totalTasksUpdated = 0
    
    // Update each user's generated tasks
    for (const user of users) {
      if (user.generatedTasks) {
        let userTasksUpdated = 0
        
        // Add IDs to Strength tasks
        if (user.generatedTasks.Strength) {
          user.generatedTasks.Strength = user.generatedTasks.Strength.map((task, index) => {
            if (!task.id) {
              userTasksUpdated++
              return {
                id: `strength-${Date.now()}-${index}`,
                ...task
              }
            }
            return task
          })
        }
        
        // Add IDs to Intelligence tasks
        if (user.generatedTasks.Intelligence) {
          user.generatedTasks.Intelligence = user.generatedTasks.Intelligence.map((task, index) => {
            if (!task.id) {
              userTasksUpdated++
              return {
                id: `intelligence-${Date.now()}-${index}`,
                ...task
              }
            }
            return task
          })
        }
        
        // Add IDs to Charisma tasks
        if (user.generatedTasks.Charisma) {
          user.generatedTasks.Charisma = user.generatedTasks.Charisma.map((task, index) => {
            if (!task.id) {
              userTasksUpdated++
              return {
                id: `charisma-${Date.now()}-${index}`,
                ...task
              }
            }
            return task
          })
        }
        
        if (userTasksUpdated > 0) {
          console.log(`✅ Updated ${userTasksUpdated} tasks for user: ${user.username}`)
          totalTasksUpdated += userTasksUpdated
        }
      }
    }
    
    // Save updated users
    await fs.writeJSON(USERS_FILE, users, { spaces: 2 })
    
    console.log(`\n✨ Migration complete!`)
    console.log(`📝 Total tasks updated: ${totalTasksUpdated}`)
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

addTaskIds()
