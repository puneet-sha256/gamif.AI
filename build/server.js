"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dataOperations_1 = require("./src/server/utils/dataOperations");
const authRoutes_1 = require("./src/server/routes/authRoutes");
const userRoutes_1 = require("./src/server/routes/userRoutes");
const healthRoutes_1 = require("./src/server/routes/healthRoutes");
const aiRoutes_1 = require("./src/server/routes/aiRoutes");
const logger_1 = require("./src/utils/logger");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Get allowed origins from environment variable or use defaults
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [
        'http://localhost:5173',
        'https://turbo-couscous-4v94xq5rg6xfjpgg-5173.app.github.dev'
    ];
// -----------------------------
//  Middleware
// -----------------------------
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options(/.*/, (0, cors_1.default)());
app.use(express_1.default.json());
// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    logger_1.logger.custom('🌐', `Server: ${timestamp} - ${req.method} ${req.path}`);
    if (req.body && Object.keys(req.body).length > 0) {
        const safeBody = { ...req.body };
        if (safeBody.password)
            safeBody.password = '[HIDDEN]';
        logger_1.logger.custom('📥', 'Server: Request body:', safeBody);
    }
    const originalSend = res.send;
    res.send = function (data) {
        logger_1.logger.custom('📤', `Server: ${req.method} ${req.path} - Status: ${res.statusCode}`);
        return originalSend.call(this, data);
    };
    next();
});
// -----------------------------
//  API routes
// -----------------------------
// Health check route
app.get('/api/health', healthRoutes_1.healthCheck);
// Authentication routes
app.post('/api/register', authRoutes_1.registerUser);
app.post('/api/login', authRoutes_1.loginUser);
app.post('/api/logout', authRoutes_1.logoutUser);
// User management routes
app.get('/api/user/session/:sessionId', userRoutes_1.getCurrentUser);
app.get('/api/user/tasks/:sessionId', userRoutes_1.getUserTasks);
app.put('/api/user/:userId', userRoutes_1.updateUserData);
// Task management routes
app.post('/api/user/tasks/add', userRoutes_1.addUserTask);
app.put('/api/user/tasks/update', userRoutes_1.updateGeneratedTask);
app.delete('/api/user/tasks/delete', userRoutes_1.deleteGeneratedTask);
// Shop item management routes
app.post('/api/user/shop/add', userRoutes_1.addUserShopItem);
app.delete('/api/user/shop/delete', userRoutes_1.deleteUserShopItem);
app.get('/api/user/shop/:sessionId', userRoutes_1.getUserShopItemsList);
app.post('/api/user/shop/buy', userRoutes_1.buyUserShopItem);
// Inventory routes
app.post('/api/user/inventory/use', userRoutes_1.useUserInventoryItem);
// Game mechanics routes
app.patch('/api/user/experience', userRoutes_1.updateExperience);
app.patch('/api/user/shards', userRoutes_1.updateShards);
// Azure AI routes
app.post('/api/ai/generate-tasks', aiRoutes_1.generateTasks);
app.post('/api/ai/analyze-activity', aiRoutes_1.analyzeDailyActivity);
// -----------------------------
//  Serve built frontend (Vite dist)
// -----------------------------
const distPath = path_1.default.resolve(__dirname, '../dist');
app.use(express_1.default.static(distPath));
// Serve index.html for everything that does NOT start with /api
app.get(/^\/(?!api($|\/)).*/, (_req, res) => {
    res.sendFile(path_1.default.join(distPath, 'index.html'));
});
// -----------------------------
//  Initialize and start server
// -----------------------------
async function startServer() {
    await (0, dataOperations_1.initializeData)();
    app.listen(PORT, () => {
        logger_1.logger.custom('🚀', `Solo Leveling API Server running on http://localhost:${PORT}`);
        logger_1.logger.custom('📁', `Data directory: ${dataOperations_1.DATA_DIR}`);
        logger_1.logger.custom('👥', `Users file: ${dataOperations_1.USERS_FILE}`);
        logger_1.logger.custom('🔐', `Sessions file: ${dataOperations_1.SESSIONS_FILE}`);
    });
}
startServer().catch((error) => {
    logger_1.logger.error('Failed to start server:', error);
});
//# sourceMappingURL=server.js.map