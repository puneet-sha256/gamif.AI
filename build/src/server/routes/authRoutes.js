"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.logoutUser = logoutUser;
const validation_1 = require("../utils/validation");
const dataOperations_1 = require("../utils/dataOperations");
const authUtils_1 = require("../utils/authUtils");
const responseHelpers_1 = require("../utils/responseHelpers");
const logger_1 = require("../../utils/logger");
// Register new user
async function registerUser(req, res) {
    try {
        // Validate request body
        if (!(0, validation_1.validateRegisterRequest)(req.body)) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)('Invalid request. Username, valid email, and password (min 6 chars) are required'));
        }
        const { username, email, password } = req.body;
        // Check if user already exists
        const existingUserByEmail = await (0, dataOperations_1.findUserByEmail)(email);
        const existingUserByUsername = await (0, dataOperations_1.findUserByUsername)(username);
        if (existingUserByEmail) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.USER_EXISTS));
        }
        if (existingUserByUsername) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.USERNAME_TAKEN));
        }
        // Create new user
        const newUser = {
            id: (0, authUtils_1.generateUserId)(),
            username,
            email,
            passwordHash: (0, authUtils_1.hashPassword)(password),
            createdAt: new Date().toISOString(),
            stats: {
                experience: 0,
                shards: 0,
                strength: 0,
                intelligence: 0,
                charisma: 0
            }
        };
        const users = await (0, dataOperations_1.loadUsers)();
        users.push(newUser);
        await (0, dataOperations_1.saveUsers)(users);
        res.json((0, responseHelpers_1.createSuccessResponse)(responseHelpers_1.SuccessMessages.REGISTRATION_SUCCESS, undefined, (0, responseHelpers_1.sanitizeUser)(newUser)));
    }
    catch (error) {
        logger_1.logger.error('Registration error:', error);
        res.status(500).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INTERNAL_ERROR));
    }
}
// Login user
async function loginUser(req, res) {
    try {
        // Validate request body
        if (!(0, validation_1.validateLoginRequest)(req.body)) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)('Invalid request. Valid email and password are required'));
        }
        const { email, password } = req.body;
        const user = await (0, dataOperations_1.findUserByEmail)(email);
        if (!user) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.USER_NOT_FOUND));
        }
        if (!(0, authUtils_1.verifyPassword)(password, user.passwordHash)) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INVALID_CREDENTIALS));
        }
        // Update last login
        user.lastLogin = new Date().toISOString();
        const users = await (0, dataOperations_1.loadUsers)();
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
            users[userIndex] = user;
            await (0, dataOperations_1.saveUsers)(users);
        }
        // Create session
        const sessionId = (0, authUtils_1.generateSessionId)();
        await (0, dataOperations_1.createSession)(user.id, sessionId);
        res.json((0, responseHelpers_1.createSuccessResponse)(responseHelpers_1.SuccessMessages.LOGIN_SUCCESS, undefined, (0, responseHelpers_1.sanitizeUser)(user), sessionId));
    }
    catch (error) {
        logger_1.logger.error('Login error:', error);
        res.status(500).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INTERNAL_ERROR));
    }
}
// Logout user
async function logoutUser(req, res) {
    try {
        const { sessionId } = req.body;
        if (sessionId && typeof sessionId === 'string' && sessionId.trim().length > 0) {
            await (0, dataOperations_1.removeSession)(sessionId);
        }
        res.json((0, responseHelpers_1.createSuccessResponse)(responseHelpers_1.SuccessMessages.LOGOUT_SUCCESS));
    }
    catch (error) {
        logger_1.logger.error('Logout error:', error);
        res.status(500).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INTERNAL_ERROR));
    }
}
//# sourceMappingURL=authRoutes.js.map