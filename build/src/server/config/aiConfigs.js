"use strict";
/**
 * AI Prompt Configuration
 *
 * This file defines the mapping between different AI use cases and their corresponding:
 * - Prompt files
 * - Model selections
 * - Generation parameters
 * - Azure OpenAI deployment configurations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_CONFIGS = exports.AIPromptType = exports.AZURE_OPENAI_CONFIG = void 0;
// Azure OpenAI configuration
exports.AZURE_OPENAI_CONFIG = {
    endpoint: "https://gamifai-resource.cognitiveservices.azure.com/"
};
exports.AIPromptType = {
    TASK_GENERATION: 'task-generation',
    ACTIVITY_ANALYSIS: 'activity-analysis',
};
/**
 * Configuration mapping for each AI prompt type
 *
 * To add a new use case:
 * 1. Add enum value to AIPromptType
 * 2. Create a .prompt.md file in src/server/prompts/
 * 3. Add configuration here with deployment and model settings
 */
exports.AI_CONFIGS = {
    [exports.AIPromptType.TASK_GENERATION]: {
        promptFile: 'task-generation.prompt.md',
        deployment: 'daily-task-agent',
        apiVersion: '2024-04-01-preview',
        modelName: 'gpt-4o-mini',
        temperature: 1,
        maxTokens: 4096
    },
    [exports.AIPromptType.ACTIVITY_ANALYSIS]: {
        promptFile: 'activity-analysis.prompt.md',
        deployment: 'gpt-4o',
        apiVersion: '2024-12-01-preview',
        modelName: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 2048,
        responseFormat: 'json'
    },
};
//# sourceMappingURL=aiConfigs.js.map