"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.azureAIService = void 0;
const openai_1 = require("openai");
const promptManager_1 = require("./promptManager");
const aiConfigs_1 = require("../config/aiConfigs");
const logger_1 = require("../../utils/logger");
class AzureAIService {
    clients = new Map();
    initialized = false;
    apiKey = "";
    constructor() {
        try {
            // Get API key from environment variable
            this.apiKey = process.env.AZURE_OPENAI_API_KEY || "";
            if (!this.apiKey) {
                logger_1.logger.error('Azure OpenAI API key not found in environment variables');
                logger_1.logger.error('Please set AZURE_OPENAI_API_KEY environment variable');
                this.initialized = false;
                return;
            }
            this.initialized = true;
            logger_1.logger.custom('🤖', 'Azure OpenAI Service initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Azure OpenAI Service:', error);
            this.initialized = false;
        }
    }
    /**
     * Get or create a client for a specific prompt type
     * Implements client caching pattern for performance and connection pooling
     * @param promptType - The AI prompt type to get a client for
     */
    getClient(promptType) {
        const config = aiConfigs_1.AI_CONFIGS[promptType];
        if (!config) {
            throw new Error(`No configuration found for prompt type: ${promptType}`);
        }
        const clientKey = `${config.deployment}-${config.apiVersion}`;
        if (!this.clients.has(clientKey)) {
            const client = new openai_1.AzureOpenAI({
                endpoint: aiConfigs_1.AZURE_OPENAI_CONFIG.endpoint,
                apiKey: this.apiKey,
                deployment: config.deployment,
                apiVersion: config.apiVersion
            });
            this.clients.set(clientKey, client);
            logger_1.logger.custom('🔧', `Created new Azure OpenAI client for ${promptType} (deployment: ${config.deployment})`);
        }
        return this.clients.get(clientKey);
    }
    /**
     * Generic method to generate AI completions based on prompt type
     * @param promptType - The type of prompt to use (from AIPromptType)
     * @param userMessage - The user message/input
     * @param options - Optional overrides for system message, temperature, etc.
     */
    async generateCompletion(promptType, userMessage, options) {
        const startTime = Date.now();
        if (!this.initialized) {
            return {
                success: false,
                error: 'Azure OpenAI Service not initialized'
            };
        }
        try {
            // Get configuration for this prompt type
            const config = aiConfigs_1.AI_CONFIGS[promptType];
            if (!config) {
                throw new Error(`No configuration found for prompt type: ${promptType}`);
            }
            // Get or create client for this prompt type
            const client = this.getClient(promptType);
            logger_1.logger.custom('🤖', `Starting Azure OpenAI completion for: ${promptType}`);
            logger_1.logger.custom('📋', `Deployment: ${config.deployment}, Model: ${config.modelName}`);
            // Load the prompt file
            const systemMessage = options?.systemMessageOverride || promptManager_1.promptManager.loadPrompt(config.promptFile);
            // Build the completion request
            const completionRequest = {
                messages: [
                    { role: "system", content: systemMessage },
                    { role: "user", content: userMessage }
                ],
                max_tokens: options?.maxTokens ?? config.maxTokens ?? 4096,
                temperature: options?.temperature ?? config.temperature ?? 1,
                top_p: 1,
                model: config.modelName
            };
            // Enable JSON mode if specified in config
            if (config.responseFormat === 'json') {
                completionRequest.response_format = { type: "json_object" };
                logger_1.logger.custom('🔧', 'JSON response mode enabled');
            }
            // Call the chat completion API
            const response = await client.chat.completions.create(completionRequest);
            if (!response?.choices?.[0]?.message?.content) {
                return {
                    success: false,
                    error: 'No response received from Azure OpenAI',
                    processingTimeMs: Date.now() - startTime
                };
            }
            const aiResponse = response.choices[0].message.content;
            logger_1.logger.custom('🎯', 'Azure OpenAI Response:');
            logger_1.logger.debug('='.repeat(50));
            logger_1.logger.debug(aiResponse);
            logger_1.logger.debug('='.repeat(50));
            logger_1.logger.success('Azure OpenAI completion completed successfully');
            return {
                success: true,
                data: {
                    content: aiResponse
                },
                processingTimeMs: Date.now() - startTime
            };
        }
        catch (error) {
            logger_1.logger.error('Azure OpenAI completion error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                processingTimeMs: Date.now() - startTime
            };
        }
    }
    /**
     * Generate daily tasks based on user goals
     */
    async generateTasks(goals, _userProfile) {
        const startTime = Date.now();
        if (!this.initialized) {
            return {
                success: false,
                error: 'Azure OpenAI Service not initialized'
            };
        }
        try {
            logger_1.logger.custom('🤖', 'Starting Azure OpenAI task generation...');
            // Use the new generateCompletion method
            const userMessage = `User Goals: ${goals.longTermGoals}`;
            const completionResult = await this.generateCompletion(aiConfigs_1.AIPromptType.TASK_GENERATION, userMessage);
            if (!completionResult.success || !completionResult.data) {
                return {
                    success: false,
                    error: completionResult.error || 'No response received',
                    processingTimeMs: Date.now() - startTime
                };
            }
            const agentResponse = completionResult.data.content;
            // Try to parse the JSON response
            let parsedTasks;
            try {
                const jsonMatch = agentResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const jsonStr = jsonMatch[0];
                    parsedTasks = JSON.parse(jsonStr);
                    // Add unique IDs to each task
                    if (parsedTasks.Strength) {
                        parsedTasks.Strength = parsedTasks.Strength.map((task, index) => ({
                            ...task,
                            id: `strength-${Date.now()}-${index}`
                        }));
                    }
                    if (parsedTasks.Intelligence) {
                        parsedTasks.Intelligence = parsedTasks.Intelligence.map((task, index) => ({
                            ...task,
                            id: `intelligence-${Date.now()}-${index}`
                        }));
                    }
                    if (parsedTasks.Charisma) {
                        parsedTasks.Charisma = parsedTasks.Charisma.map((task, index) => ({
                            ...task,
                            id: `charisma-${Date.now()}-${index}`
                        }));
                    }
                    parsedTasks.lastUpdated = new Date().toISOString();
                    logger_1.logger.success('Successfully parsed Azure AI response to JSON:', parsedTasks);
                }
                else {
                    logger_1.logger.warn('No JSON found in Azure AI response');
                }
            }
            catch (parseError) {
                logger_1.logger.warn('Failed to parse Azure AI response as JSON:', parseError);
            }
            logger_1.logger.success('Azure OpenAI task generation completed successfully');
            // Return structure with parsed tasks
            return {
                success: true,
                data: {
                    generatedTasks: parsedTasks,
                    rawResponse: agentResponse
                },
                processingTimeMs: Date.now() - startTime
            };
        }
        catch (error) {
            logger_1.logger.error('Azure OpenAI task generation error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                processingTimeMs: Date.now() - startTime
            };
        }
    }
}
// Export singleton instance
exports.azureAIService = new AzureAIService();
exports.default = exports.azureAIService;
//# sourceMappingURL=azureAIService.js.map