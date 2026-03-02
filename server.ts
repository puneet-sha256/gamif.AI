import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { initializeData, DATA_DIR } from './src/server/utils/dataOperations'
import {
  registerUser, loginUser, logoutUser, sendOtp, verifyOtpAndRegister,
  sendPasswordResetOtp, verifyPasswordResetOtp, resetPassword
} from './src/server/routes/authRoutes'
import {
  getCurrentUser, updateUserData, updateExperience, updateShards,
  getUserTasks, updateGeneratedTask, deleteGeneratedTask,
  addUserTask, addUserShopItem, deleteUserShopItem,
  getUserShopItemsList, buyUserShopItem, useUserInventoryItem
} from './src/server/routes/userRoutes'
import { healthCheck } from './src/server/routes/healthRoutes'
import { generateTasks, analyzeDailyActivity } from './src/server/routes/aiRoutes'
import {
  getVapidKey, subscribe, unsubscribe,
  updatePreferences, getNotificationStatus
} from './src/server/routes/notificationRoutes'
import { startNotificationScheduler } from './src/server/services/notificationScheduler'
import { logger } from './src/utils/logger'

const app = express()
const PORT = process.env.PORT || 3001

// Get allowed origins from environment variable or use defaults
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'https://stunning-enigma-q4grwvjxxpjh9g7r-5173.app.github.dev'
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

// OTP verification routes
app.post('/api/auth/send-otp', sendOtp)
app.post('/api/auth/verify-otp', verifyOtpAndRegister)

// Forgot password routes
app.post('/api/auth/forgot-password/send-otp', sendPasswordResetOtp)
app.post('/api/auth/forgot-password/verify-otp', verifyPasswordResetOtp)
app.post('/api/auth/forgot-password/reset', resetPassword)

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

// Push notification routes
app.get('/api/notifications/vapid-public-key', getVapidKey)
app.post('/api/notifications/subscribe', subscribe)
app.post('/api/notifications/unsubscribe', unsubscribe)
app.put('/api/notifications/preferences', updatePreferences)
app.get('/api/notifications/status/:sessionId', getNotificationStatus)

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
    logger.custom('💾', `Storage mode: ${process.env.STORAGE_MODE || 'file'}`)

    // Start push notification scheduler (non-blocking; skips if VAPID keys not set)
    startNotificationScheduler()
  })
}

startServer().catch((error) => {
  logger.error('Failed to start server:', error)
})
