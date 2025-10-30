import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initializeData, DATA_DIR, USERS_FILE, SESSIONS_FILE } from './src/server/utils/dataOperations'
import { registerUser, loginUser, logoutUser } from './src/server/routes/authRoutes'
import { getCurrentUser, updateUserData, updateExperience, updateShards, getUserTasks, updateGeneratedTask, deleteGeneratedTask, addUserTask, addUserShopItem, deleteUserShopItem, getUserShopItemsList } from './src/server/routes/userRoutes'
import { healthCheck } from './src/server/routes/healthRoutes'
import { generateTasks, analyzeDailyActivity } from './src/server/routes/aiRoutes'

const app = express()
const PORT = 3001

// Middleware
app.use(cors({
  origin: ["http://localhost:5173", "https://turbo-couscous-4v94xq5rg6xfjpgg-5173.app.github.dev"], // Support both local and Codespaces
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}))
app.options(/.*/, cors())
app.use(express.json())

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`🌐 Server: ${timestamp} - ${req.method} ${req.path}`)
  if (req.body && Object.keys(req.body).length > 0) {
    // Log body but hide sensitive data
    const safeBody = { ...req.body }
    if (safeBody.password) safeBody.password = '[HIDDEN]'
    console.log(`📥 Server: Request body:`, safeBody)
  }
  
  // Log response
  const originalSend = res.send
  res.send = function(data) {
    console.log(`📤 Server: ${req.method} ${req.path} - Status: ${res.statusCode}`)
    return originalSend.call(this, data)
  }
  
  next()
})

// Health check route
app.get('/api/health', healthCheck)

// Authentication routes
app.post('/api/register', registerUser)
app.post('/api/login', loginUser)
app.post('/api/logout', logoutUser)

// User management routes
app.get('/api/user/session/:sessionId', getCurrentUser)
app.get('/api/user/tasks/:sessionId', getUserTasks)
app.put('/api/user/:userId', updateUserData)

// Task management routes
app.post('/api/user/tasks/add', addUserTask)
app.put('/api/user/tasks/update', updateGeneratedTask)
app.delete('/api/user/tasks/delete', deleteGeneratedTask)

// Shop item management routes
app.post('/api/user/shop/add', addUserShopItem)
app.delete('/api/user/shop/delete', deleteUserShopItem)
app.get('/api/user/shop/:sessionId', getUserShopItemsList)

// Game mechanics routes
app.patch('/api/user/experience', updateExperience)
app.patch('/api/user/shards', updateShards)

// Azure AI routes
app.post('/api/ai/generate-tasks', generateTasks)
app.post('/api/ai/analyze-activity', analyzeDailyActivity)

// Initialize and start server
async function startServer() {
  await initializeData()
  
  app.listen(PORT, () => {
    console.log(`🚀 Solo Leveling API Server running on http://localhost:${PORT}`)
    console.log(`📁 Data directory: ${DATA_DIR}`)
    console.log(`👥 Users file: ${USERS_FILE}`)
    console.log(`🔐 Sessions file: ${SESSIONS_FILE}`)
  })
}

startServer().catch(console.error)