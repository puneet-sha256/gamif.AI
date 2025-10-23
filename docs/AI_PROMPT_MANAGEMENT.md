# AI Service Prompt Management

This document explains the scalable prompt management system for LLM calls in the Gamif.AI application.

## Overview

The AI service has been refactored to separate prompts from code, making it easy to:
- Modify prompts without changing code
- Select different models for different use cases
- Add new AI features quickly
- Version control prompts separately

## Architecture

### Directory Structure

```
src/server/
├── prompts/                    # Prompt files
│   └── task-generation.prompt.md
├── config/
│   └── aiConfigs.ts           # Model and prompt mappings
└── services/
    ├── promptManager.ts       # Loads prompts from files
    └── azureAIService.ts      # Generic AI service
```

### Components

#### 1. Prompt Files (`src/server/prompts/`)

Markdown files containing system prompts for different use cases:
- `task-generation.prompt.md` - Generates daily tasks from user goals

**To modify a prompt:** Edit the `.prompt.md` file directly. No code changes needed.

#### 2. AI Configuration (`src/server/config/aiConfigs.ts`)

Maps use cases to models and prompts:

```typescript
export const AIPromptType = {
  TASK_GENERATION: 'task-generation',
} as const;

export const AI_CONFIGS = {
  [AIPromptType.TASK_GENERATION]: {
    promptFile: 'task-generation.prompt.md',
    modelName: 'gpt-4o-mini',  // Model selection
    temperature: 1,
    maxTokens: 4096
  },
};
```

**To add a new use case:** Add an entry to `AIPromptType` and `AI_CONFIGS`.

#### 3. Prompt Manager (`src/server/services/promptManager.ts`)

Loads and caches prompt files from disk.

#### 4. Azure AI Service (`src/server/services/azureAIService.ts`)

Generic service with two methods:

- **`generateCompletion(promptType, userMessage, options?)`** - New generic method
- **`generateTasks(goals, userProfile?)`** - Legacy wrapper (for backward compatibility)

## Usage Examples

### Basic Usage (Current - Backward Compatible)

```typescript
import { azureAIService } from '../services/azureAIService';

// Existing code still works
const result = await azureAIService.generateTasks(goals, userProfile);
```

### New Generic Usage

```typescript
import { azureAIService, AIPromptType } from '../services/azureAIService';

// Generate daily tasks
const taskResult = await azureAIService.generateCompletion(
  AIPromptType.TASK_GENERATION,
  `User Goals: ${goals.longTermGoals}`
);

// With options override
const customResult = await azureAIService.generateCompletion(
  AIPromptType.TASK_GENERATION,
  `User Goals: ${goals.longTermGoals}`,
  {
    temperature: 0.7,  // Override default
    maxTokens: 2048    // Override default
  }
);
```

## Adding a New AI Feature

### Example: Adding "Goal Suggestions"

**Step 1:** Create the prompt file

File: `src/server/prompts/goal-suggestions.prompt.md`
```markdown
You are a goal suggestion assistant for Gamif.AI...
[prompt content]
```

**Step 2:** Update the configuration

File: `src/server/config/aiConfigs.ts`
```typescript
export const AIPromptType = {
  TASK_GENERATION: 'task-generation',
  GOAL_SUGGESTIONS: 'goal-suggestions',  // ADD THIS
} as const;

export const AI_CONFIGS = {
  [AIPromptType.TASK_GENERATION]: { /*...*/  },
  [AIPromptType.GOAL_SUGGESTIONS]: {  // ADD THIS
    promptFile: 'goal-suggestions.prompt.md',
    modelName: 'gpt-4o',  // Use more powerful model
    temperature: 0.7,
    maxTokens: 2048
  },
};
```

**Step 3:** Use it in your code

```typescript
const suggestions = await azureAIService.generateCompletion(
  AIPromptType.GOAL_SUGGESTIONS,
  `User interests: ${userProfile.interests}`
);
```

## Model Selection Strategy

- **gpt-4o-mini** - Fast, cheap, good for structured outputs (task generation)
- **gpt-4o** - Better reasoning, creative tasks (goal suggestions, insights)

## Benefits

✅ **Separation of Concerns** - Prompts separate from business logic  
✅ **Easy Maintenance** - Update prompts without code deployment  
✅ **Type Safety** - TypeScript enums prevent typos  
✅ **Scalability** - Add new features in 3 simple steps  
✅ **Cost Optimization** - Use appropriate models per task  
✅ **Backward Compatible** - Existing code continues to work  

## File Locations

- **Prompts**: `src/server/prompts/*.prompt.md`
- **Config**: `src/server/config/aiConfigs.ts`
- **Service**: `src/server/services/azureAIService.ts`
- **Manager**: `src/server/services/promptManager.ts`
