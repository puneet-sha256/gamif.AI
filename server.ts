import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { initializeData, DATA_DIR, USERS_FILE, SESSIONS_FILE } from './src/server/utils/dataOperations'
import {
  registerUser, loginUser, logoutUser
} from './src/server/routes/authRoutes'
import {
  getCurrentUser, updateUserData, updateExperience, updateShards,
  getUserTasks, updateGeneratedTask, deleteGeneratedTask,
  addUserTask, addUserShopItem, deleteUserShopItem,
  getUserShopItemsList, buyUserShopItem, useUserInventoryItem
} from './src/server/routes/userRoutes'
import { healthCheck } from './src/server/routes/healthRoutes'
import { generateTasks, analyzeDailyActivity } from './src/server/routes/aiRoutes'
import { logger } from './src/utils/logger'

const app = express()
const PORT = process.env.PORT || 3001

// Get allowed origins from environment variable or use defaults
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:5173',
      'https://turbo-couscous-4v94xq5rg6xfjpgg-5173.app.github.dev'
    ]

// -----------------------------
//  Middleware
// -----------------------------
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.options(/.*/, cors())
app.use(express.json())

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  logger.custom('🌐', `Server: ${timestamp} - ${req.method} ${req.path}`)

  if (req.body && Object.keys(req.body).length > 0) {
    const safeBody = { ...req.body }
    if (safeBody.password) safeBody.password = '[HIDDEN]'
    logger.custom('📥', 'Server: Request body:', safeBody)
  }

  const originalSend = res.send
  res.send = function (data) {
    logger.custom('📤', `Server: ${req.method} ${req.path} - Status: ${res.statusCode}`)
    return originalSend.call(this, data)
  }

  next()
})

// -----------------------------
//  API routes
// -----------------------------

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
app.post('/api/user/shop/buy', buyUserShopItem)

// Inventory routes
app.post('/api/user/inventory/use', useUserInventoryItem)

// Game mechanics routes
app.patch('/api/user/experience', updateExperience)
app.patch('/api/user/shards', updateShards)

// Azure AI routes
app.post('/api/ai/generate-tasks', generateTasks)
app.post('/api/ai/analyze-activity', analyzeDailyActivity)

// -----------------------------
//  Serve built frontend (Vite dist)
// -----------------------------
const distPath = path.resolve(__dirname, '../dist')
app.use(express.static(distPath))

// Serve index.html for everything that does NOT start with /api
app.get(/^\/(?!api($|\/)).*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});


// -----------------------------
//  Initialize and start server
// -----------------------------
async function startServer() {
  await initializeData()

  app.listen(PORT, () => {
    logger.custom('🚀', `Solo Leveling API Server running on http://localhost:${PORT}`)
    logger.custom('📁', `Data directory: ${DATA_DIR}`)
    logger.custom('👥', `Users file: ${USERS_FILE}`)
    logger.custom('🔐', `Sessions file: ${SESSIONS_FILE}`)
  })
}

startServer().catch((error) => {
  logger.error('Failed to start server:', error)
})
