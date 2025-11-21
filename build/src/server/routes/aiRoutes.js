"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTasks = generateTasks;
exports.analyzeDailyActivity = analyzeDailyActivity;
const azureAIService_1 = require("../services/azureAIService");
const dataOperations_1 = require("../utils/dataOperations");
const responseHelpers_1 = require("../utils/responseHelpers");
const aiConfigs_1 = require("../config/aiConfigs");
const rewardCalculation_1 = require("../utils/rewardCalculation");
const logger_1 = require("../../utils/logger");
// Generate tasks using Azure AI
async function generateTasks(req, res) {
    try {
        const { sessionId, goals, userProfile } = req.body;
        // Validate required fields
        if (!sessionId || !goals) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)('Session ID and goals are required'));
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
        logger_1.logger.custom('🤖', `Starting Azure AI task generation for user: ${user.username}`);
        // Call Azure AI service
        const taskGenerationResult = await azureAIService_1.azureAIService.generateTasks(goals, userProfile);
        if (taskGenerationResult.success) {
            // Update session last access
            await (0, dataOperations_1.updateSessionLastAccess)(sessionId);
            // Store generated tasks in user profile if successfully parsed
            if (taskGenerationResult.data?.generatedTasks) {
                await (0, dataOperations_1.updateUserGeneratedTasks)(user.id, taskGenerationResult.data.generatedTasks);
                logger_1.logger.success('Generated tasks stored in user profile');
            }
            logger_1.logger.success('Azure AI task generation completed successfully');
            logger_1.logger.custom('🎯', 'Generated Tasks:', taskGenerationResult.data);
            res.json((0, responseHelpers_1.createSuccessResponse)('Tasks generated successfully', taskGenerationResult.data, undefined, undefined, {
                processingTime: taskGenerationResult.processingTimeMs,
                agentUsed: 'azure-openai-foundry'
            }));
        }
        else {
            logger_1.logger.error('Azure AI task generation failed:', taskGenerationResult.error);
            res.status(500).json((0, responseHelpers_1.createErrorResponse)(taskGenerationResult.error || 'Task generation failed'));
        }
    }
    catch (error) {
        logger_1.logger.error('Task generation error:', error);
        res.status(500).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INTERNAL_ERROR));
    }
}
// Analyze daily activity using Azure AI
async function analyzeDailyActivity(req, res) {
    try {
        const { sessionId, dailyActivity, currentTasks } = req.body;
        // Validate required fields
        if (!sessionId || !dailyActivity) {
            return res.status(400).json((0, responseHelpers_1.createErrorResponse)('Session ID and daily activity description are required'));
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
        logger_1.logger.custom('🤖', `Starting Azure AI daily activity analysis for user: ${user.username}`);
        logger_1.logger.custom('📝', 'User Activity:', dailyActivity);
        // Format daily planned tasks as a JSON array
        const plannedTasks = [];
        if (currentTasks) {
            if (currentTasks.Strength && currentTasks.Strength.length > 0) {
                currentTasks.Strength.forEach((task) => {
                    plannedTasks.push({
                        title: task.title || task.description,
                        description: task.description,
                        category: task.category || 'Strength',
                        xp: task.xp,
                        shards: task.shards
                    });
                });
            }
            if (currentTasks.Intelligence && currentTasks.Intelligence.length > 0) {
                currentTasks.Intelligence.forEach((task) => {
                    plannedTasks.push({
                        title: task.title || task.description,
                        description: task.description,
                        category: task.category || 'Intelligence',
                        xp: task.xp,
                        shards: task.shards
                    });
                });
            }
            if (currentTasks.Charisma && currentTasks.Charisma.length > 0) {
                currentTasks.Charisma.forEach((task) => {
                    plannedTasks.push({
                        title: task.title || task.description,
                        description: task.description,
                        category: task.category || 'Charisma',
                        xp: task.xp,
                        shards: task.shards
                    });
                });
            }
        }
        // Get user's long-term goals
        const longTermGoals = user.goalsData?.longTermGoals || 'No specific goals set';
        // Build the formatted message for the AI as a JSON object
        const inputData = {
            daily_planned_tasks: plannedTasks,
            long_term_goals: longTermGoals,
            user_daily_update: dailyActivity
        };
        const userMessage = JSON.stringify(inputData, null, 2);
        logger_1.logger.custom('📋', 'Formatted JSON input for AI:');
        logger_1.logger.debug(userMessage);
        // Call Azure AI service
        const analysisResult = await azureAIService_1.azureAIService.generateCompletion(aiConfigs_1.AIPromptType.ACTIVITY_ANALYSIS, userMessage);
        if (analysisResult.success && analysisResult.data) {
            // Update session last access
            await (0, dataOperations_1.updateSessionLastAccess)(sessionId);
            logger_1.logger.success('Azure AI activity analysis completed successfully');
            logger_1.logger.custom('🎯', 'Raw AI Response:');
            logger_1.logger.debug('='.repeat(80));
            logger_1.logger.debug(analysisResult.data.content);
            logger_1.logger.debug('='.repeat(80));
            // Parse the JSON response (should be clean JSON with json_object mode)
            let parsedMatches = null;
            try {
                parsedMatches = JSON.parse(analysisResult.data.content);
                logger_1.logger.success('Successfully parsed activity matches as object');
                logger_1.logger.custom('📊', `Total matches found: ${parsedMatches.matches?.length || 0}`);
                // Log the parsed object structure
                logger_1.logger.custom('📦', 'Parsed Activity Analysis Object:');
                logger_1.logger.debug('='.repeat(80));
                logger_1.logger.debug(JSON.stringify(parsedMatches, null, 2));
                logger_1.logger.debug('='.repeat(80));
            }
            catch (parseError) {
                logger_1.logger.error('Failed to parse AI response as JSON:', parseError);
                logger_1.logger.debug('Raw response:', analysisResult.data.content);
                // Fallback: try to extract JSON if wrapped in markdown
                try {
                    const jsonMatch = analysisResult.data.content.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        parsedMatches = JSON.parse(jsonMatch[0]);
                        logger_1.logger.success('Extracted and parsed JSON from markdown');
                    }
                }
                catch (fallbackError) {
                    logger_1.logger.error('Fallback parsing also failed:', fallbackError);
                }
            }
            // Calculate rewards from the parsed matches
            let rewardCalculation = null;
            if (parsedMatches?.matches) {
                logger_1.logger.custom('💰', 'Calculating rewards from activity matches...');
                rewardCalculation = (0, rewardCalculation_1.calculateRewardsFromAnalysis)(parsedMatches.matches, currentTasks);
            }
            res.json((0, responseHelpers_1.createSuccessResponse)('Daily activity analyzed successfully', {
                matches: parsedMatches?.matches || [],
                rewards: rewardCalculation,
                rawResponse: analysisResult.data.content,
                processingTime: analysisResult.processingTimeMs
            }, undefined, undefined, {
                processingTime: analysisResult.processingTimeMs,
                agentUsed: 'azure-openai-foundry'
            }));
        }
        else {
            logger_1.logger.error('Azure AI activity analysis failed:', analysisResult.error);
            res.status(500).json((0, responseHelpers_1.createErrorResponse)(analysisResult.error || 'Activity analysis failed'));
        }
    }
    catch (error) {
        logger_1.logger.error('Activity analysis error:', error);
        res.status(500).json((0, responseHelpers_1.createErrorResponse)(responseHelpers_1.ErrorMessages.INTERNAL_ERROR));
    }
}
//# sourceMappingURL=aiRoutes.js.map