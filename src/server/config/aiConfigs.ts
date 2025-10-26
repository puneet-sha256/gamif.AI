/**
 * AI Prompt Configuration
 * 
 * This file defines the mapping between different AI use cases and their corresponding:
 * - Prompt files
 * - Model selections
 * - Generation parameters
 */

export const AIPromptType = {
  TASK_GENERATION: 'task-generation',
  ACTIVITY_ANALYSIS: 'activity-analysis',
} as const;

export type AIPromptType = typeof AIPromptType[keyof typeof AIPromptType];

export interface AIPromptConfig {
  /** Name of the prompt file (without path) in src/server/prompts/ */
  promptFile: string;
  /** Azure OpenAI model name to use */
  modelName: string;
  /** Temperature parameter for generation (0-2) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
}

/**
 * Configuration mapping for each AI prompt type
 * 
 * To add a new use case:
 * 1. Add enum value to AIPromptType
 * 2. Create a .prompt.md file in src/server/prompts/
 * 3. Add configuration here
 */
export const AI_CONFIGS: Record<AIPromptType, AIPromptConfig> = {
  [AIPromptType.TASK_GENERATION]: {
    promptFile: 'task-generation.prompt.md',
    modelName: 'gpt-4o-mini',
    temperature: 1,
    maxTokens: 4096
  },
  [AIPromptType.ACTIVITY_ANALYSIS]: {
    promptFile: 'activity-analysis.prompt.md',
    modelName: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2048
  },
};
