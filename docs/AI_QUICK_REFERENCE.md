# Quick Reference: AI Prompt Management

## Change a Prompt
1. Edit file in `src/server/prompts/*.prompt.md`
2. That's it! No code changes needed.

## Add New AI Feature

### 1. Create Prompt File
`src/server/prompts/my-feature.prompt.md`

### 2. Add to Config
`src/server/config/aiConfigs.ts`:
```typescript
export const AIPromptType = {
  MY_FEATURE: 'my-feature',  // Add here
} as const;

export const AI_CONFIGS = {
  [AIPromptType.MY_FEATURE]: {  // Add config here
    promptFile: 'my-feature.prompt.md',
    modelName: 'gpt-4o-mini',
    temperature: 1,
    maxTokens: 4096
  },
};
```

### 3. Use in Code
```typescript
const result = await azureAIService.generateCompletion(
  AIPromptType.MY_FEATURE,
  userMessage
);
```

## Model Selection
- `gpt-4o-mini` → Fast, cheap, structured output
- `gpt-4o` → Reasoning, creativity

## Override Options
```typescript
await azureAIService.generateCompletion(
  AIPromptType.MY_FEATURE,
  userMessage,
  {
    temperature: 0.5,
    maxTokens: 2048,
    systemMessageOverride: "Custom prompt..."
  }
);
```
