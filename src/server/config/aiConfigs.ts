/**
 * AI Prompt Configuration
 * 
 * This file defines the mapping between different AI use cases and their corresponding:
 * - Prompt files
 * - Model selections
 * - Generation parameters
 * - Azure OpenAI deployment configurations
 */

// Azure OpenAI configuration
export const AZURE_OPENAI_CONFIG = {
  endpoint: "https://gamifai-resource.cognitiveservices.azure.com/"
} as const;

export const AIPromptType = {
  TASK_GENERATION: 'task-generation',
  ACTIVITY_ANALYSIS: 'activity-analysis',
  INTAKE_QUESTION_GENERATION: 'intake-question-generation',
  INTAKE_EXTRACTION: 'intake-extraction',
} as const;

export type AIPromptType = typeof AIPromptType[keyof typeof AIPromptType];

export interface AIPromptConfig {
  /** Name of the prompt file (without path) in src/server/prompts/ */
  promptFile: string;
  /** Azure OpenAI deployment name */
  deployment: string;
  /** Azure OpenAI API version */
  apiVersion: string;
  /** Azure OpenAI model name to use */
  modelName: string;
  /** Temperature parameter for generation (0-2) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Enable JSON response format */
  responseFormat?: 'json' | 'text';
}

/**
 * Configuration mapping for each AI prompt type
 * 
 * To add a new use case:
 * 1. Add enum value to AIPromptType
 * 2. Create a .prompt.md file in src/server/prompts/
 * 3. Add configuration here with deployment and model settings
 */
export const AI_CONFIGS: Record<AIPromptType, AIPromptConfig> = {
  [AIPromptType.TASK_GENERATION]: {
    promptFile: 'task-generation.prompt.md',
    deployment: 'daily-task-agent',
    apiVersion: '2024-04-01-preview',
    modelName: 'gpt-4o-mini',
    temperature: 1,
    maxTokens: 4096
  },
  [AIPromptType.ACTIVITY_ANALYSIS]: {
    promptFile: 'activity-analysis.prompt.md',
    deployment: 'gpt-4o',
    apiVersion: '2024-12-01-preview',
    modelName: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 2048,
    responseFormat: 'json'
  },
  [AIPromptType.INTAKE_QUESTION_GENERATION]: {
    promptFile: 'intake-question-generation.prompt.md',
    deployment: 'daily-task-agent',
    apiVersion: '2024-04-01-preview',
    modelName: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 3072,
    responseFormat: 'json'
  },
  [AIPromptType.INTAKE_EXTRACTION]: {
    promptFile: 'intake-extraction.prompt.md',
    deployment: 'gpt-4o',
    apiVersion: '2024-12-01-preview',
    modelName: 'gpt-4o',
    temperature: 0,
    maxTokens: 3072,
    responseFormat: 'json'
  },
};
