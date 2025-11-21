"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUser = getCurrentUser;
exports.updateUserData = updateUserData;
exports.updateExperience = updateExperience;
exports.updateShards = updateShards;
exports.getUserTasks = getUserTasks;
exports.updateGeneratedTask = updateGeneratedTask;
exports.deleteGeneratedTask = deleteGeneratedTask;
exports.addUserTask = addUserTask;
exports.addUserShopItem = addUserShopItem;
exports.deleteUserShopItem = deleteUserShopItem;
exports.getUserShopItemsList = getUserShopItemsList;
exports.buyUserShopItem = buyUserShopItem;
exports.useUserInventoryItem = useUserInventoryItem;
const validation_1 = require("../utils/validation");
const dataOperations_1 = require("../utils/dataOperations");
const responseHelpers_1 = require("../utils/responseHelpers");
const logger_1 = require("../../utils/logger");
const levelCalculation_1 = require("../../utils/levelCalculation");
// Get current user by session
async function getCurrentUser(req, res) {
    try {
        const { sessionId } = req.params;
        const session = await (0, dataOperations_1.findSessionById)(sessionId);
        if (!session) {
            return res.status(401).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INVALID_SESSION));
        }
        const user = await (0, dataOperations_1.findUserById)(session.userId);
        if (!user) {
            return res.status(404).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.USER_NOT_FOUND));
        }
        // Update session last access
        await (0, dataOperations_1.updateSessionLastAccess)(sessionId);
        res.json((0, responseHelpers_1.createSuccessResponse)('User data retrieved successfully', undefined, (0, responseHelpers_1.sanitizeUser)(user)));
    }
    catch (error) {
        logger_1.logger.error('Get user by session error:', error);
        res.status(500).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INTERNAL_ERROR));
    }
}
// Update user
async function updateUserData(req, res) {
    try {
        const { userId } = req.params;
        const updates = req.body;
        const updatedUser = await (0, dataOperations_1.updateUser)(userId, updates);
        if (!updatedUser) {
            return res.status(404).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.USER_NOT_FOUND));
        }
        res.json((0, responseHelpers_1.createSuccessResponse)(responseHelpers_1.SuccessMessages.UPDATE_SUCCESS, undefined, (0, responseHelpers_1.sanitizeUser)(updatedUser)));
    }
    catch (error) {
        logger_1.logger.error('Update user error:', error);
        res.status(500).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INTERNAL_ERROR));
    }
}
// Update experience points for attributes
async function updateExperience(req, res) {
    try {
        // Validate request body
        if (!(0, validation_1.validateExperienceUpdateRequest)(req.body)) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)('Invalid request. Session ID is required and deltas must be valid numbers'));
        }
        const { sessionId, strengthDelta, intelligenceDelta, charismaDelta, activityDate } = req.body;
        const strengthChange = strengthDelta || 0;
        const intelligenceChange = intelligenceDelta || 0;
        const charismaChange = charismaDelta || 0;
        // Verify session
        const session = await (0, dataOperations_1.findSessionById)(sessionId);
        if (!session) {
            return res.status(401).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INVALID_SESSION));
        }
        // Find user
        const user = await (0, dataOperations_1.findUserById)(session.userId);
        if (!user) {
            return res.status(404).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.USER_NOT_FOUND));
        }
        // Ensure user has stats with proper typing
        if (!user.stats) {
            user.stats = {
                experience: 0,
                shards: 0,
                strength: 0,
                intelligence: 0,
                charisma: 0
            };
        }
        // Calculate new attribute values (prevent negative values)
        const newStrength = Math.max(0, (user.stats.strength || 0) + strengthChange);
        const newIntelligence = Math.max(0, (user.stats.intelligence || 0) + intelligenceChange);
        const newCharisma = Math.max(0, (user.stats.charisma || 0) + charismaChange);
        // Store old experience for level-up detection
        const oldExperience = user.stats.experience || 0;
        // Update stats
        user.stats.strength = newStrength;
        user.stats.intelligence = newIntelligence;
        user.stats.charisma = newCharisma;
        // Total experience is sum of all attributes
        const newExperience = newStrength + newIntelligence + newCharisma;
        user.stats.experience = newExperience;
        // Detect level-up
        const newLevel = (0, levelCalculation_1.detectLevelUp)(oldExperience, newExperience);
        // Update activity history for heatmap
        // Use provided activityDate or default to today
        const activityDateToUse = activityDate || new Date().toISOString().split('T')[0];
        if (!user.activityHistory) {
            user.activityHistory = {
                dailyActivities: [],
                lastUpdated: new Date().toISOString()
            };
        }
        // Find activity for the specified date or create new one
        const targetActivity = user.activityHistory.dailyActivities.find(activity => activity.date === activityDateToUse);
        // Helper function to calculate total XP from category changes
        const calculateTotal = (str, int, cha) => Math.max(0, str) + Math.max(0, int) + Math.max(0, cha);
        if (targetActivity) {
            // Update existing activity
            targetActivity.strength += Math.max(0, strengthChange);
            targetActivity.intelligence += Math.max(0, intelligenceChange);
            targetActivity.charisma += Math.max(0, charismaChange);
            targetActivity.total = calculateTotal(targetActivity.strength, targetActivity.intelligence, targetActivity.charisma);
        }
        else {
            // Create new activity for the specified date
            const newStrengthXP = Math.max(0, strengthChange);
            const newIntelligenceXP = Math.max(0, intelligenceChange);
            const newCharismaXP = Math.max(0, charismaChange);
            user.activityHistory.dailyActivities.push({
                date: activityDateToUse,
                strength: newStrengthXP,
                intelligence: newIntelligenceXP,
                charisma: newCharismaXP,
                total: calculateTotal(newStrengthXP, newIntelligenceXP, newCharismaXP)
            });
        }
        user.activityHistory.lastUpdated = new Date().toISOString();
        // Keep only last 365 days of activity history
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 365);
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
        user.activityHistory.dailyActivities = user.activityHistory.dailyActivities.filter(activity => activity.date >= cutoffDateStr);
        // Update session last access and save user
        await (0, dataOperations_1.updateSessionLastAccess)(sessionId);
        const updatedUser = await (0, dataOperations_1.updateUser)(user.id, user);
        if (!updatedUser) {
            return res.status(500).json((0, responseHelpers_1.createErrorResponse)('Failed to update user'));
        }
        // Prepare changes object with level-up information if applicable
        const changes = {
            strengthChange,
            intelligenceChange,
            charismaChange,
            totalExperienceChange: strengthChange + intelligenceChange + charismaChange
        };
        if (newLevel !== null) {
            const oldLevel = (0, levelCalculation_1.calculateLevelFromXp)(oldExperience);
            changes.levelUp = {
                newLevel,
                oldLevel
            };
        }
        // Return updated stats
        res.json((0, responseHelpers_1.createSuccessResponse)(responseHelpers_1.SuccessMessages.EXPERIENCE_UPDATED, undefined, (0, responseHelpers_1.sanitizeUser)(updatedUser), undefined, changes));
    }
    catch (error) {
        logger_1.logger.error('Update experience error:', error);
        res.status(500).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INTERNAL_ERROR));
    }
}
// Update shards (in-game currency)
async function updateShards(req, res) {
    try {
        // Validate request body
        if (!(0, validation_1.validateShardsUpdateRequest)(req.body)) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)('Invalid request. Session ID and shards delta (number) are required'));
        }
        const { sessionId, shardsDelta, reason } = req.body;
        // Verify session
        const session = await (0, dataOperations_1.findSessionById)(sessionId);
        if (!session) {
            return res.status(401).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INVALID_SESSION));
        }
        // Find user
        const user = await (0, dataOperations_1.findUserById)(session.userId);
        if (!user) {
            return res.status(404).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.USER_NOT_FOUND));
        }
        // Ensure user has stats
        if (!user.stats) {
            user.stats = {
                experience: 0,
                shards: 0,
                strength: 0,
                intelligence: 0,
                charisma: 0
            };
        }
        // Calculate new shards value (prevent negative shards)
        const currentShards = user.stats.shards || 0;
        const newShards = Math.max(0, currentShards + shardsDelta);
        // Check if user has enough shards for subtraction
        if (shardsDelta < 0 && currentShards + shardsDelta < 0) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)(`Insufficient shards. Current balance: ${currentShards}, attempted to subtract: ${Math.abs(shardsDelta)}`));
        }
        // Update shards
        user.stats.shards = newShards;
        // Update session last access and save user
        await (0, dataOperations_1.updateSessionLastAccess)(sessionId);
        const updatedUser = await (0, dataOperations_1.updateUser)(user.id, user);
        if (!updatedUser) {
            return res.status(500).json((0, responseHelpers_1.createErrorResponse)('Failed to update user'));
        }
        // Return updated stats
        res.json((0, responseHelpers_1.createSuccessResponse)(reason
            ? `Shards updated successfully: ${reason}`
            : `Shards ${shardsDelta >= 0 ? 'added' : 'subtracted'} successfully`, undefined, (0, responseHelpers_1.sanitizeUser)(updatedUser), undefined, {
            shardsChange: shardsDelta,
            newShardsBalance: newShards,
            reason
        }));
    }
    catch (error) {
        logger_1.logger.error('Update shards error:', error);
        res.status(500).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INTERNAL_ERROR));
    }
}
// Get user's generated tasks
async function getUserTasks(req, res) {
    try {
        const { sessionId } = req.params;
        const session = await (0, dataOperations_1.findSessionById)(sessionId);
        if (!session) {
            return res.status(401).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INVALID_SESSION));
        }
        const user = await (0, dataOperations_1.findUserById)(session.userId);
        if (!user) {
            return res.status(404).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.USER_NOT_FOUND));
        }
        // Update session last access
        await (0, dataOperations_1.updateSessionLastAccess)(sessionId);
        // Get generated tasks
        const generatedTasks = await (0, dataOperations_1.getUserGeneratedTasks)(user.id);
        res.json((0, responseHelpers_1.createSuccessResponse)('Generated tasks retrieved successfully', { generatedTasks }, undefined, undefined, {
            hasGeneratedTasks: !!generatedTasks,
            tasksLastUpdated: generatedTasks?.lastUpdated
        }));
    }
    catch (error) {
        logger_1.logger.error('Get user tasks error:', error);
        res.status(500).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INTERNAL_ERROR));
    }
}
// Update a specific generated task
async function updateGeneratedTask(req, res) {
    try {
        const { sessionId, taskId, category, updates } = req.body;
        // Validate required fields
        if (!sessionId || !taskId || !category || !updates) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)('Session ID, task ID, category, and updates are required'));
        }
        // Validate category
        if (!['Strength', 'Intelligence', 'Charisma'].includes(category)) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)('Invalid category. Must be Strength, Intelligence, or Charisma'));
        }
        // Verify session
        const session = await (0, dataOperations_1.findSessionById)(sessionId);
        if (!session) {
            return res.status(401).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INVALID_SESSION));
        }
        // Find user
        const user = await (0, dataOperations_1.findUserById)(session.userId);
        if (!user) {
            return res.status(404).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.USER_NOT_FOUND));
        }
        // Update the task
        const success = await (0, dataOperations_1.updateTaskInGeneratedTasks)(user.id, taskId, category, updates);
        if (!success) {
            return res.status(404).json((0, responseHelpers_1.createErrorResponse)('Task not found or could not be updated'));
        }
        // Update session last access
        await (0, dataOperations_1.updateSessionLastAccess)(sessionId);
        // Get updated tasks
        const updatedTasks = await (0, dataOperations_1.getUserGeneratedTasks)(user.id);
        res.json((0, responseHelpers_1.createSuccessResponse)('Task updated successfully', { generatedTasks: updatedTasks }));
    }
    catch (error) {
        logger_1.logger.error('Update generated task error:', error);
        res.status(500).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INTERNAL_ERROR));
    }
}
// Delete a specific generated task
async function deleteGeneratedTask(req, res) {
    try {
        const { sessionId, taskId, category } = req.body;
        // Validate required fields
        if (!sessionId || !taskId || !category) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)('Session ID, task ID, and category are required'));
        }
        // Validate category
        if (!['Strength', 'Intelligence', 'Charisma'].includes(category)) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)('Invalid category. Must be Strength, Intelligence, or Charisma'));
        }
        // Verify session
        const session = await (0, dataOperations_1.findSessionById)(sessionId);
        if (!session) {
            return res.status(401).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INVALID_SESSION));
        }
        // Find user
        const user = await (0, dataOperations_1.findUserById)(session.userId);
        if (!user) {
            return res.status(404).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.USER_NOT_FOUND));
        }
        // Delete the task
        const success = await (0, dataOperations_1.deleteTaskFromGeneratedTasks)(user.id, taskId, category);
        if (!success) {
            return res.status(404).json((0, responseHelpers_1.createErrorResponse)('Task not found or could not be deleted'));
        }
        // Update session last access
        await (0, dataOperations_1.updateSessionLastAccess)(sessionId);
        // Get updated tasks
        const updatedTasks = await (0, dataOperations_1.getUserGeneratedTasks)(user.id);
        res.json((0, responseHelpers_1.createSuccessResponse)('Task deleted successfully', { generatedTasks: updatedTasks }));
    }
    catch (error) {
        logger_1.logger.error('Delete generated task error:', error);
        res.status(500).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INTERNAL_ERROR));
    }
}
// Add a user-created task
async function addUserTask(req, res) {
    try {
        const { sessionId, title, description, category, xp, shards } = req.body;
        // Validate required fields
        if (!sessionId || !title || !description || !category || xp === undefined || shards === undefined) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)('Missing required fields: sessionId, title, description, category, xp, and shards are required'));
        }
        // Validate category
        if (!['Strength', 'Intelligence', 'Charisma'].includes(category)) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)('Invalid category. Must be Strength, Intelligence, or Charisma'));
        }
        // Verify session
        const session = await (0, dataOperations_1.findSessionById)(sessionId);
        if (!session) {
            return res.status(401).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INVALID_SESSION));
        }
        // Find user
        const user = await (0, dataOperations_1.findUserById)(session.userId);
        if (!user) {
            return res.status(404).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.USER_NOT_FOUND));
        }
        // Add the task
        const success = await (0, dataOperations_1.addTaskToGeneratedTasks)(user.id, {
            title,
            description,
            category,
            xp,
            shards
        });
        if (!success) {
            return res.status(500).json((0, responseHelpers_1.createErrorResponse)('Failed to add task'));
        }
        // Update session last access
        await (0, dataOperations_1.updateSessionLastAccess)(sessionId);
        // Get updated tasks
        const updatedTasks = await (0, dataOperations_1.getUserGeneratedTasks)(user.id);
        res.json((0, responseHelpers_1.createSuccessResponse)('Task added successfully', { generatedTasks: updatedTasks }));
    }
    catch (error) {
        logger_1.logger.error('Add user task error:', error);
        res.status(500).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INTERNAL_ERROR));
    }
}
// Add a shop item
async function addUserShopItem(req, res) {
    try {
        const { sessionId, title, description, price, image, isConsumable, isKeyItem, allowMultiplePurchases } = req.body;
        // Validate required fields
        if (!sessionId || !title || price === undefined) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)('Missing required fields: sessionId, title, and price are required'));
        }
        // Validate price is a positive number
        if (typeof price !== 'number' || price < 0) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)('Price must be a non-negative number'));
        }
        // Verify session
        const session = await (0, dataOperations_1.findSessionById)(sessionId);
        if (!session) {
            return res.status(401).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INVALID_SESSION));
        }
        // Find user
        const user = await (0, dataOperations_1.findUserById)(session.userId);
        if (!user) {
            return res.status(404).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.USER_NOT_FOUND));
        }
        // Add the shop item
        const success = await (0, dataOperations_1.addShopItem)(user.id, {
            title,
            description,
            price,
            image,
            isConsumable,
            isKeyItem,
            allowMultiplePurchases
        });
        if (!success) {
            return res.status(500).json((0, responseHelpers_1.createErrorResponse)('Failed to add shop item'));
        }
        // Update session last access
        await (0, dataOperations_1.updateSessionLastAccess)(sessionId);
        // Get updated shop items
        const updatedItems = await (0, dataOperations_1.getUserShopItems)(user.id);
        res.json((0, responseHelpers_1.createSuccessResponse)('Shop item added successfully', { shopItems: updatedItems }));
    }
    catch (error) {
        logger_1.logger.error('Add shop item error:', error);
        res.status(500).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INTERNAL_ERROR));
    }
}
// Delete a shop item
async function deleteUserShopItem(req, res) {
    try {
        const { sessionId, itemId } = req.body;
        // Validate required fields
        if (!sessionId || !itemId) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)('Session ID and item ID are required'));
        }
        // Verify session
        const session = await (0, dataOperations_1.findSessionById)(sessionId);
        if (!session) {
            return res.status(401).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INVALID_SESSION));
        }
        // Find user
        const user = await (0, dataOperations_1.findUserById)(session.userId);
        if (!user) {
            return res.status(404).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.USER_NOT_FOUND));
        }
        // Delete the shop item
        const success = await (0, dataOperations_1.deleteShopItem)(user.id, itemId);
        if (!success) {
            return res.status(404).json((0, responseHelpers_1.createErrorResponse)('Shop item not found or could not be deleted'));
        }
        // Update session last access
        await (0, dataOperations_1.updateSessionLastAccess)(sessionId);
        // Get updated shop items
        const updatedItems = await (0, dataOperations_1.getUserShopItems)(user.id);
        res.json((0, responseHelpers_1.createSuccessResponse)('Shop item deleted successfully', { shopItems: updatedItems }));
    }
    catch (error) {
        logger_1.logger.error('Delete shop item error:', error);
        res.status(500).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INTERNAL_ERROR));
    }
}
// Get user's shop items
async function getUserShopItemsList(req, res) {
    try {
        const { sessionId } = req.params;
        // Verify session
        const session = await (0, dataOperations_1.findSessionById)(sessionId);
        if (!session) {
            return res.status(401).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INVALID_SESSION));
        }
        // Find user
        const user = await (0, dataOperations_1.findUserById)(session.userId);
        if (!user) {
            return res.status(404).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.USER_NOT_FOUND));
        }
        // Update session last access
        await (0, dataOperations_1.updateSessionLastAccess)(sessionId);
        // Get shop items
        const shopItems = await (0, dataOperations_1.getUserShopItems)(user.id);
        res.json((0, responseHelpers_1.createSuccessResponse)('Shop items retrieved successfully', { shopItems }));
    }
    catch (error) {
        logger_1.logger.error('Get shop items error:', error);
        res.status(500).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INTERNAL_ERROR));
    }
}
// Buy a shop item
async function buyUserShopItem(req, res) {
    try {
        const { sessionId, itemId, itemPrice, itemDetails } = req.body;
        // Validate required fields
        if (!sessionId || !itemId || itemPrice === undefined) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)('Session ID, item ID, and item price are required'));
        }
        // Validate price is a positive number
        if (typeof itemPrice !== 'number' || itemPrice < 0) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)('Item price must be a non-negative number'));
        }
        // Verify session
        const session = await (0, dataOperations_1.findSessionById)(sessionId);
        if (!session) {
            return res.status(401).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INVALID_SESSION));
        }
        // Find user
        const user = await (0, dataOperations_1.findUserById)(session.userId);
        if (!user) {
            return res.status(404).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.USER_NOT_FOUND));
        }
        // Buy the shop item (itemDetails is optional for built-in shop items)
        const result = await (0, dataOperations_1.buyShopItem)(user.id, itemId, itemPrice, itemDetails);
        if (!result.success) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)(result.message || 'Failed to purchase item'));
        }
        // Update session last access
        await (0, dataOperations_1.updateSessionLastAccess)(sessionId);
        // Get updated user data
        const updatedUser = await (0, dataOperations_1.findUserById)(user.id);
        res.json((0, responseHelpers_1.createSuccessResponse)(result.message || 'Item purchased successfully', undefined, updatedUser ? (0, responseHelpers_1.sanitizeUser)(updatedUser) : undefined));
    }
    catch (error) {
        logger_1.logger.error('Buy shop item error:', error);
        res.status(500).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INTERNAL_ERROR));
    }
}
// Use an inventory item
async function useUserInventoryItem(req, res) {
    try {
        const { sessionId, itemId } = req.body;
        // Validate required fields
        if (!sessionId || !itemId) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)('Session ID and item ID are required'));
        }
        // Verify session
        const session = await (0, dataOperations_1.findSessionById)(sessionId);
        if (!session) {
            return res.status(401).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INVALID_SESSION));
        }
        // Find user
        const user = await (0, dataOperations_1.findUserById)(session.userId);
        if (!user) {
            return res.status(404).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.USER_NOT_FOUND));
        }
        // Use the inventory item
        const result = await (0, dataOperations_1.useInventoryItem)(user.id, itemId);
        if (!result.success) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)(result.message || 'Failed to use item'));
        }
        // Update session last access
        await (0, dataOperations_1.updateSessionLastAccess)(sessionId);
        // Get updated user data
        const updatedUser = await (0, dataOperations_1.findUserById)(user.id);
        res.json((0, responseHelpers_1.createSuccessResponse)(result.message || 'Item used successfully', undefined, updatedUser ? (0, responseHelpers_1.sanitizeUser)(updatedUser) : undefined));
    }
    catch (error) {
        logger_1.logger.error('Use inventory item error:', error);
        res.status(500).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INTERNAL_ERROR));
    }
}
//# sourceMappingURL=userRoutes.js.map