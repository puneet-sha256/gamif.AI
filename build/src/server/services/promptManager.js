"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptManager = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const logger_1 = require("../../utils/logger");
const __DIRNAME = __dirname;
/**
 * PromptManager - Loads and caches prompt files
 *
 * Prompts are stored as .prompt.md files in src/server/prompts/
 */
class PromptManager {
    promptCache = new Map();
    promptsDir;
    constructor() {
        // Prompts directory relative to this file
        this.promptsDir = (0, path_1.join)(__DIRNAME, '..', 'prompts');
    }
    /**
     * Load a prompt file by name
     * @param promptFileName - Name of the prompt file (e.g., 'task-generation.prompt.md')
     * @returns The prompt content as a string
     */
    loadPrompt(promptFileName) {
        // Check cache first
        if (this.promptCache.has(promptFileName)) {
            return this.promptCache.get(promptFileName);
        }
        try {
            const promptPath = (0, path_1.join)(this.promptsDir, promptFileName);
            const promptContent = (0, fs_1.readFileSync)(promptPath, 'utf-8');
            // Cache the loaded prompt
            this.promptCache.set(promptFileName, promptContent);
            logger_1.logger.custom('📄', `Loaded prompt: ${promptFileName}`);
            return promptContent;
        }
        catch (error) {
            logger_1.logger.error(`Failed to load prompt file: ${promptFileName}`, error);
            throw new Error(`Prompt file not found: ${promptFileName}`);
        }
    }
    /**
     * Clear the prompt cache (useful for development/hot-reloading)
     */
    clearCache() {
        this.promptCache.clear();
        logger_1.logger.custom('🔄', 'Prompt cache cleared');
    }
}
// Export singleton instance
exports.promptManager = new PromptManager();
exports.default = exports.promptManager;
//# sourceMappingURL=promptManager.js.map