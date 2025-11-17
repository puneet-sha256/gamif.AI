"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BACKUP_DIR = exports.SESSIONS_FILE = exports.USERS_FILE = exports.DATA_DIR = void 0;
exports.initializeData = initializeData;
exports.loadUsers = loadUsers;
exports.saveUsers = saveUsers;
exports.loadSessions = loadSessions;
exports.saveSessions = saveSessions;
exports.findUserByEmail = findUserByEmail;
exports.findUserByUsername = findUserByUsername;
exports.findUserById = findUserById;
exports.findSessionById = findSessionById;
exports.updateUser = updateUser;
exports.createSession = createSession;
exports.updateSessionLastAccess = updateSessionLastAccess;
exports.removeSession = removeSession;
exports.updateUserGeneratedTasks = updateUserGeneratedTasks;
exports.getUserGeneratedTasks = getUserGeneratedTasks;
exports.updateTaskInGeneratedTasks = updateTaskInGeneratedTasks;
exports.deleteTaskFromGeneratedTasks = deleteTaskFromGeneratedTasks;
exports.addTaskToGeneratedTasks = addTaskToGeneratedTasks;
exports.addShopItem = addShopItem;
exports.deleteShopItem = deleteShopItem;
exports.getUserShopItems = getUserShopItems;
exports.buyShopItem = buyShopItem;
exports.useInventoryItem = useInventoryItem;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../../utils/logger");
// Data file paths
exports.DATA_DIR = path_1.default.resolve(process.env.DATA_DIR || path_1.default.join(process.cwd(), 'data'));
exports.USERS_FILE = path_1.default.join(exports.DATA_DIR, 'users.json');
exports.SESSIONS_FILE = path_1.default.join(exports.DATA_DIR, 'sessions.json');
exports.BACKUP_DIR = path_1.default.join(exports.DATA_DIR, 'backup');
// Initialize data directory and files
async function initializeData() {
    try {
        // Create directories
        await fs_extra_1.default.ensureDir(exports.DATA_DIR);
        await fs_extra_1.default.ensureDir(exports.BACKUP_DIR);
        // Initialize users.json if it doesn't exist
        if (!(await fs_extra_1.default.pathExists(exports.USERS_FILE))) {
            logger_1.logger.custom('📄', 'Creating users.json file...');
            await fs_extra_1.default.writeJson(exports.USERS_FILE, [], { spaces: 2 });
            logger_1.logger.success('Created users.json');
        }
        else {
            logger_1.logger.success('users.json already exists');
        }
        // Initialize sessions.json if it doesn't exist
        if (!(await fs_extra_1.default.pathExists(exports.SESSIONS_FILE))) {
            logger_1.logger.custom('📄', 'Creating sessions.json file...');
            await fs_extra_1.default.writeJson(exports.SESSIONS_FILE, [], { spaces: 2 });
            logger_1.logger.success('Created sessions.json');
        }
        else {
            logger_1.logger.success('sessions.json already exists');
        }
        logger_1.logger.success('Data directory initialized');
        logger_1.logger.custom('📁', `Data directory: ${exports.DATA_DIR}`);
        logger_1.logger.custom('👥', `Users file: ${exports.USERS_FILE}`);
        logger_1.logger.custom('🔐', `Sessions file: ${exports.SESSIONS_FILE}`);
    }
    catch (error) {
        logger_1.logger.error('Error initializing data directory:', error);
        throw error;
    }
}
// User data operations
async function loadUsers() {
    logger_1.logger.custom('🔄', 'Loading users from file...');
    try {
        const users = await fs_extra_1.default.readJson(exports.USERS_FILE);
        logger_1.logger.success(`Loaded ${users.length} users`);
        return Array.isArray(users) ? users : [];
    }
    catch (error) {
        logger_1.logger.error('Error loading users:', error);
        return [];
    }
}
async function saveUsers(users) {
    if (!Array.isArray(users)) {
        throw new Error('Users must be an array');
    }
    try {
        // Create backup
        const timestamp = new Date().toISOString().split('T')[0];
        const backupFile = path_1.default.join(exports.BACKUP_DIR, `users_backup_${timestamp}.json`);
        if (await fs_extra_1.default.pathExists(exports.USERS_FILE)) {
            await fs_extra_1.default.copy(exports.USERS_FILE, backupFile);
        }
        // Save users
        await fs_extra_1.default.writeJson(exports.USERS_FILE, users, { spaces: 2 });
    }
    catch (error) {
        logger_1.logger.error('Error saving users:', error);
        throw error;
    }
}
// Session data operations
async function loadSessions() {
    try {
        const sessions = await fs_extra_1.default.readJson(exports.SESSIONS_FILE);
        return Array.isArray(sessions) ? sessions : [];
    }
    catch (error) {
        logger_1.logger.error('Error loading sessions:', error);
        return [];
    }
}
async function saveSessions(sessions) {
    if (!Array.isArray(sessions)) {
        throw new Error('Sessions must be an array');
    }
    try {
        await fs_extra_1.default.writeJson(exports.SESSIONS_FILE, sessions, { spaces: 2 });
    }
    catch (error) {
        logger_1.logger.error('Error saving sessions:', error);
        throw error;
    }
}
// Helper functions for finding data
async function findUserByEmail(email) {
    const users = await loadUsers();
    return users.find(user => user.email.toLowerCase() === email.toLowerCase());
}
async function findUserByUsername(username) {
    const users = await loadUsers();
    return users.find(user => user.username.toLowerCase() === username.toLowerCase());
}
async function findUserById(id) {
    const users = await loadUsers();
    return users.find(user => user.id === id);
}
async function findSessionById(sessionId) {
    const sessions = await loadSessions();
    return sessions.find(session => session.sessionId === sessionId);
}
async function updateUser(userId, updates) {
    const users = await loadUsers();
    const userIndex = users.findIndex(user => user.id === userId);
    if (userIndex === -1) {
        return null;
    }
    // Merge updates with existing user
    const updatedUser = { ...users[userIndex], ...updates };
    // Remove properties that are explicitly set to null or undefined
    Object.keys(updates).forEach(key => {
        if (updates[key] === null || updates[key] === undefined) {
            delete updatedUser[key];
        }
    });
    users[userIndex] = updatedUser;
    await saveUsers(users);
    return users[userIndex];
}
async function createSession(userId, sessionId) {
    const sessions = await loadSessions();
    const newSession = {
        userId,
        sessionId,
        createdAt: new Date().toISOString(),
        lastAccess: new Date().toISOString()
    };
    sessions.push(newSession);
    await saveSessions(sessions);
    return newSession;
}
async function updateSessionLastAccess(sessionId) {
    const sessions = await loadSessions();
    const session = sessions.find(s => s.sessionId === sessionId);
    if (session) {
        session.lastAccess = new Date().toISOString();
        await saveSessions(sessions);
    }
}
async function removeSession(sessionId) {
    const sessions = await loadSessions();
    const filteredSessions = sessions.filter(session => session.sessionId !== sessionId);
    await saveSessions(filteredSessions);
}
// Update user's generated tasks
async function updateUserGeneratedTasks(userId, generatedTasks) {
    logger_1.logger.custom('🔄', `Updating generated tasks for user: ${userId}`);
    const users = await loadUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
        // Update generated tasks directly on user object
        user.generatedTasks = generatedTasks;
        await saveUsers(users);
        logger_1.logger.success(`Generated tasks updated successfully for user: ${userId}`);
    }
    else {
        logger_1.logger.error(`User not found for updating generated tasks: ${userId}`);
    }
}
// Get user's generated tasks
async function getUserGeneratedTasks(userId) {
    const user = await findUserById(userId);
    return user?.generatedTasks || null;
}
// Update a specific task in user's generated tasks
async function updateTaskInGeneratedTasks(userId, taskId, category, updates) {
    logger_1.logger.custom('🔄', `Updating task ${taskId} in category ${category} for user: ${userId}`);
    const users = await loadUsers();
    const user = users.find(u => u.id === userId);
    if (!user || !user.generatedTasks) {
        logger_1.logger.error('User or generated tasks not found');
        return false;
    }
    const tasks = user.generatedTasks[category];
    if (!tasks) {
        logger_1.logger.error('Category not found in generated tasks');
        return false;
    }
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
        logger_1.logger.error('Task not found in category');
        return false;
    }
    // Update task properties
    if (updates.title !== undefined) {
        if (updates.title === '') {
            // Empty string means remove the title (convert custom task back to AI-generated)
            delete tasks[taskIndex].title;
        }
        else {
            // Non-empty string means set/update the title
            tasks[taskIndex].title = updates.title;
        }
    }
    if (updates.description !== undefined) {
        tasks[taskIndex].description = updates.description;
    }
    if (updates.xp !== undefined) {
        tasks[taskIndex].xp = updates.xp;
    }
    if (updates.shards !== undefined) {
        tasks[taskIndex].shards = updates.shards;
    }
    await saveUsers(users);
    logger_1.logger.success('Task updated successfully');
    return true;
}
// Delete a specific task from user's generated tasks
async function deleteTaskFromGeneratedTasks(userId, taskId, category) {
    logger_1.logger.custom('🔄', `Deleting task ${taskId} from category ${category} for user: ${userId}`);
    const users = await loadUsers();
    const user = users.find(u => u.id === userId);
    if (!user || !user.generatedTasks) {
        logger_1.logger.error('User or generated tasks not found');
        return false;
    }
    const tasks = user.generatedTasks[category];
    if (!tasks) {
        logger_1.logger.error('Category not found in generated tasks');
        return false;
    }
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
        logger_1.logger.error('Task not found in category');
        return false;
    }
    // Remove the task from the array
    tasks.splice(taskIndex, 1);
    await saveUsers(users);
    logger_1.logger.success('Task deleted successfully');
    return true;
}
// Add a task to user's generated tasks (supports both AI and user-created tasks)
async function addTaskToGeneratedTasks(userId, task) {
    logger_1.logger.info(`Adding task for user: ${userId}`);
    const users = await loadUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
        logger_1.logger.error('User not found');
        return false;
    }
    // Initialize generatedTasks if it doesn't exist
    if (!user.generatedTasks) {
        user.generatedTasks = {};
    }
    // Initialize category array if it doesn't exist
    if (!user.generatedTasks[task.category]) {
        user.generatedTasks[task.category] = [];
    }
    // Create the task with ID
    const newTask = {
        id: `${task.title ? 'custom' : 'ai'}-${task.category.toLowerCase()}-${Date.now()}`,
        ...(task.title && { title: task.title }), // Only add title if provided
        description: task.description,
        xp: task.xp,
        shards: task.shards
    };
    // Add task to category
    user.generatedTasks[task.category].push(newTask);
    await saveUsers(users);
    logger_1.logger.success('Task added successfully');
    return true;
}
// Shop item operations
async function addShopItem(userId, item) {
    logger_1.logger.info(`Adding shop item for user: ${userId}`);
    const users = await loadUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
        logger_1.logger.error('User not found');
        return false;
    }
    // Initialize shopItems if it doesn't exist
    if (!user.shopItems) {
        user.shopItems = [];
    }
    // Create the shop item with ID
    const newItem = {
        id: `shop-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        title: item.title,
        description: item.description,
        price: item.price,
        image: item.image || '🎁',
        createdAt: new Date().toISOString(),
        isConsumable: item.isConsumable || false,
        isKeyItem: item.isKeyItem || false
    };
    // Add item to shop
    user.shopItems.push(newItem);
    await saveUsers(users);
    logger_1.logger.success('Shop item added successfully');
    return true;
}
async function deleteShopItem(userId, itemId) {
    logger_1.logger.info(`Deleting shop item ${itemId} for user: ${userId}`);
    const users = await loadUsers();
    const user = users.find(u => u.id === userId);
    if (!user || !user.shopItems) {
        logger_1.logger.error('User not found or no shop items');
        return false;
    }
    const initialLength = user.shopItems.length;
    user.shopItems = user.shopItems.filter(item => item.id !== itemId);
    if (user.shopItems.length === initialLength) {
        logger_1.logger.error('Shop item not found');
        return false;
    }
    await saveUsers(users);
    logger_1.logger.success('Shop item deleted successfully');
    return true;
}
async function getUserShopItems(userId) {
    logger_1.logger.info(`Getting shop items for user: ${userId}`);
    const users = await loadUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
        logger_1.logger.error('User not found');
        return null;
    }
    return user.shopItems || [];
}
async function buyShopItem(userId, itemId, itemPrice, itemDetails) {
    logger_1.logger.info(`User ${userId} attempting to buy shop item ${itemId} for ${itemPrice} shards`);
    const users = await loadUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
        logger_1.logger.error('User not found');
        return { success: false, message: 'User not found' };
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
    const currentShards = user.stats.shards || 0;
    // Check if user has enough shards
    if (currentShards < itemPrice) {
        logger_1.logger.error(`Insufficient shards. User has ${currentShards}, needs ${itemPrice}`);
        return {
            success: false,
            message: `Insufficient shards. You have ${currentShards} 💎, but need ${itemPrice} 💎`
        };
    }
    // Check if item is in user's wishlist (user-created item)
    const shopItem = user.shopItems?.find(item => item.id === itemId);
    const isWishlistItem = !!shopItem;
    // If not a wishlist item, it must be a built-in shop item - require itemDetails
    if (!isWishlistItem && !itemDetails) {
        logger_1.logger.error('Built-in shop item requires itemDetails parameter');
        return {
            success: false,
            message: 'Invalid purchase request'
        };
    }
    // Get item information from either wishlist or itemDetails
    const itemInfo = isWishlistItem ? shopItem : {
        id: itemId,
        title: itemDetails.title,
        description: itemDetails?.description,
        price: itemPrice,
        image: itemDetails?.image,
        isConsumable: itemDetails?.isConsumable || false,
        isKeyItem: itemDetails?.isKeyItem || false
    };
    // Deduct shards
    user.stats.shards = currentShards - itemPrice;
    // Remove item from shopItems (wishlist) ONLY if it's a user-created wishlist item
    if (isWishlistItem && user.shopItems) {
        user.shopItems = user.shopItems.filter(item => item.id !== itemId);
        logger_1.logger.info(`Removed item "${itemInfo.title}" from wishlist`);
    }
    // Initialize inventory if it doesn't exist
    if (!user.inventory) {
        user.inventory = [];
    }
    // Check if item with the same title already exists in inventory (for counting duplicates)
    const existingInventoryItem = user.inventory.find(item => item.title === itemInfo.title &&
        item.description === itemInfo.description &&
        item.price === itemInfo.price);
    if (existingInventoryItem) {
        // Item already in inventory, increment count
        existingInventoryItem.count += 1;
        logger_1.logger.info(`Incremented count for item "${itemInfo.title}" in inventory to ${existingInventoryItem.count}`);
    }
    else {
        // Add new item to inventory with count 1
        const inventoryItem = {
            id: itemInfo.id,
            title: itemInfo.title,
            description: itemInfo.description,
            price: itemInfo.price,
            image: itemInfo.image,
            count: 1,
            purchasedAt: new Date().toISOString(),
            isConsumable: itemInfo.isConsumable || false,
            isKeyItem: itemInfo.isKeyItem || false
        };
        user.inventory.push(inventoryItem);
        logger_1.logger.info(`Added new item "${itemInfo.title}" to inventory`);
    }
    await saveUsers(users);
    logger_1.logger.success(`Shop item purchased successfully. New shard balance: ${user.stats.shards}`);
    return {
        success: true,
        message: `Successfully purchased item for ${itemPrice} 💎. Remaining shards: ${user.stats.shards} 💎`
    };
}
// Use a consumable item from inventory
async function useInventoryItem(userId, itemId) {
    logger_1.logger.info(`User ${userId} attempting to use inventory item ${itemId}`);
    const users = await loadUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
        logger_1.logger.error('User not found');
        return { success: false, message: 'User not found' };
    }
    // Check if user has an inventory
    if (!user.inventory || user.inventory.length === 0) {
        logger_1.logger.error('User has no inventory items');
        return { success: false, message: 'No items in inventory' };
    }
    // Find the item in inventory
    const itemIndex = user.inventory.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
        logger_1.logger.error('Item not found in inventory');
        return { success: false, message: 'Item not found in inventory' };
    }
    const item = user.inventory[itemIndex];
    // Check if item is consumable
    if (!item.isConsumable) {
        logger_1.logger.error('Item is not consumable');
        return { success: false, message: 'This item cannot be used' };
    }
    // Decrease count by 1
    item.count -= 1;
    // If count reaches 0, remove the item from inventory
    if (item.count <= 0) {
        user.inventory.splice(itemIndex, 1);
        logger_1.logger.info(`Item "${item.title}" removed from inventory (count reached 0)`);
    }
    else {
        logger_1.logger.info(`Item "${item.title}" count decreased to ${item.count}`);
    }
    await saveUsers(users);
    logger_1.logger.success(`Item used successfully`);
    return {
        success: true,
        message: `Used "${item.title}" successfully`
    };
}
//# sourceMappingURL=dataOperations.js.map