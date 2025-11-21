"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TASK_CATEGORIES = void 0;
exports.mapGeneratedTaskToTaskItem = mapGeneratedTaskToTaskItem;
exports.mapGeneratedTasksToTaskItems = mapGeneratedTasksToTaskItems;
exports.groupMappedTasksByCategory = groupMappedTasksByCategory;
exports.getTaskStatistics = getTaskStatistics;
exports.hasGeneratedTasks = hasGeneratedTasks;
// Task category icons and display names
exports.TASK_CATEGORIES = {
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
};
// Convert a single GeneratedTask to TaskItem props
function mapGeneratedTaskToTaskItem(task, category, index) {
    const categoryInfo = exports.TASK_CATEGORIES[category];
    return {
        id: `${category.toLowerCase()}-${index}`,
        icon: categoryInfo.icon,
        description: task.description,
        category: categoryInfo.displayName,
        xpReward: task.xp,
        shardReward: task.shards,
        originalTask: task,
        taskCategory: category
    };
}
// Convert GeneratedTasks to an array of TaskItem props
function mapGeneratedTasksToTaskItems(generatedTasks) {
    const mappedTasks = [];
    // Process each category
    Object.keys(exports.TASK_CATEGORIES).forEach((category) => {
        const tasks = generatedTasks[category];
        if (tasks && tasks.length > 0) {
            tasks.forEach((task, index) => {
                mappedTasks.push(mapGeneratedTaskToTaskItem(task, category, index));
            });
        }
    });
    return mappedTasks;
}
// Group mapped tasks by category for display
function groupMappedTasksByCategory(mappedTasks) {
    const grouped = {
        Strength: [],
        Intelligence: [],
        Charisma: []
    };
    mappedTasks.forEach(task => {
        grouped[task.taskCategory].push(task);
    });
    return grouped;
}
// Get task statistics
function getTaskStatistics(generatedTasks) {
    const stats = {
        totalTasks: 0,
        totalXP: 0,
        totalShards: 0,
        categories: {
            strength: generatedTasks.Strength?.length || 0,
            intelligence: generatedTasks.Intelligence?.length || 0,
            charisma: generatedTasks.Charisma?.length || 0
        }
    };
    // Calculate totals
    Object.keys(exports.TASK_CATEGORIES).forEach((key) => {
        const category = key;
        const tasks = generatedTasks[category];
        if (tasks) {
            stats.totalTasks += tasks.length;
            tasks.forEach((task) => {
                stats.totalXP += task.xp;
                stats.totalShards += task.shards;
            });
        }
    });
    return stats;
}
// Check if user has any generated tasks
function hasGeneratedTasks(generatedTasks) {
    if (!generatedTasks)
        return false;
    return ((generatedTasks.Strength?.length || 0) > 0 ||
        (generatedTasks.Intelligence?.length || 0) > 0 ||
        (generatedTasks.Charisma?.length || 0) > 0);
}
//# sourceMappingURL=taskMapping.js.map