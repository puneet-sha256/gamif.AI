import { AzureOpenAI } from "openai";
import type { GoalsData, ProfileData, GeneratedTasks } from '../../types';
import { promptManager } from './promptManager';
import { AI_CONFIGS, AIPromptType } from '../config/aiConfigs';
import type { AIPromptConfig } from '../config/aiConfigs';
import { logger } from '../../utils/logger';

// Azure OpenAI configuration
const endpoint = "https://gamifai-resource.cognitiveservices.azure.com/";
const deployment = "daily-task-agent";
const apiVersion = "2024-04-01-preview";

export interface TaskGenerationResult {
  success: boolean;
  data?: {
    generatedTasks?: GeneratedTasks;
    rawResponse?: string;
  };
  error?: string;
  processingTimeMs?: number;
}

export interface CompletionOptions {
  /** Override the system message from the prompt file */
  systemMessageOverride?: string;
  /** Override the temperature from config */
  temperature?: number;
  /** Override the max tokens from config */
  maxTokens?: number;
}

export interface CompletionResult {
  success: boolean;
  data?: {
    content: string;
  };
  error?: string;
  processingTimeMs?: number;
}

class AzureAIService {
  private client: AzureOpenAI | null = null;
  private initialized = false;
  private apiKey: string = "";

  constructor() {
    try {
      // Get API key from environment variable
      this.apiKey = process.env.AZURE_OPENAI_API_KEY || "";
      
      if (!this.apiKey) {
        logger.error('Azure OpenAI API key not found in environment variables');
        logger.error('Please set AZURE_OPENAI_API_KEY environment variable');
        this.initialized = false;
        this.client = null;
        return;
      }

      const options = { 
        endpoint, 
        apiKey: this.apiKey, 
        deployment, 
        apiVersion 
      };

      this.client = new AzureOpenAI(options);
      this.initialized = true;
      logger.custom('🤖', 'Azure OpenAI Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Azure OpenAI Service:', error);
      this.initialized = false;
      this.client = null;
    }
  }

  /**
   * Generic method to generate AI completions based on prompt type
   * @param promptType - The type of prompt to use (from AIPromptType)
   * @param userMessage - The user message/input
   * @param options - Optional overrides for system message, temperature, etc.
   */
  async generateCompletion(
    promptType: AIPromptType,
    userMessage: string,
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const startTime = Date.now();
    
    if (!this.initialized || !this.client) {
      return {
        success: false,
        error: 'Azure OpenAI Service not initialized'
      };
    }

    try {
      // Get configuration for this prompt type
      const config: AIPromptConfig = AI_CONFIGS[promptType];
      if (!config) {
        throw new Error(`No configuration found for prompt type: ${promptType}`);
      }

      logger.custom('🤖', `Starting Azure OpenAI completion for: ${promptType}`);
      logger.custom('📋', `Model: ${config.modelName}`);

      // Load the prompt file
      const systemMessage = options?.systemMessageOverride || promptManager.loadPrompt(config.promptFile);

      // Build the completion request
      const completionRequest: any = {
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ],
        max_tokens: options?.maxTokens ?? config.maxTokens ?? 4096,
        temperature: options?.temperature ?? config.temperature ?? 1,
        top_p: 1,
        model: config.modelName
      }

      // Enable JSON mode if specified in config
      if (config.responseFormat === 'json') {
        completionRequest.response_format = { type: "json_object" }
        logger.custom('🔧', 'JSON response mode enabled')
      }

      // Call the chat completion API
      const response = await this.client.chat.completions.create(completionRequest);

      if (!response?.choices?.[0]?.message?.content) {
        return {
          success: false,
          error: 'No response received from Azure OpenAI',
          processingTimeMs: Date.now() - startTime
        };
      }

      const aiResponse = response.choices[0].message.content;

      logger.custom('🎯', 'Azure OpenAI Response:');
      logger.debug('='.repeat(50));
      logger.debug(aiResponse);
      logger.debug('='.repeat(50));
      logger.success('Azure OpenAI completion completed successfully');

      return {
        success: true,
        data: {
          content: aiResponse
        },
        processingTimeMs: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Azure OpenAI completion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Generate daily tasks based on user goals
   * @deprecated Use generateCompletion(AIPromptType.TASK_GENERATION, ...) instead
   */
  async generateTasks(
    goals: GoalsData,
    _userProfile?: ProfileData
  ): Promise<TaskGenerationResult> {
    const startTime = Date.now();
    
    if (!this.initialized || !this.client) {
      return {
        success: false,
        error: 'Azure OpenAI Service not initialized'
      };
    }

    try {
      logger.custom('🤖', 'Starting Azure OpenAI task generation...');

      // Use the new generateCompletion method
      const userMessage = `User Goals: ${goals.longTermGoals}`;
      const completionResult = await this.generateCompletion(
        AIPromptType.TASK_GENERATION,
        userMessage
      );

      if (!completionResult.success || !completionResult.data) {
        return {
          success: false,
          error: completionResult.error || 'No response received',
          processingTimeMs: Date.now() - startTime
        };
      }

      const agentResponse = completionResult.data.content;

      // Try to parse the JSON response
      let parsedTasks: GeneratedTasks | undefined;
      try {
        const jsonMatch = agentResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          parsedTasks = JSON.parse(jsonStr) as GeneratedTasks;
          
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
          logger.success('Successfully parsed Azure AI response to JSON:', parsedTasks);
        } else {
          logger.warn('No JSON found in Azure AI response');
        }
      } catch (parseError) {
        logger.warn('Failed to parse Azure AI response as JSON:', parseError);
      }

      logger.success('Azure OpenAI task generation completed successfully');
      
      // Return structure with parsed tasks
      return {
        success: true,
        data: {
          generatedTasks: parsedTasks,
          rawResponse: agentResponse
        },
        processingTimeMs: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Azure OpenAI task generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTimeMs: Date.now() - startTime
      };
    }
  }
}

// Export singleton instance
export const azureAIService = new AzureAIService();
export default azureAIService;
