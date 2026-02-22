# Daily Activity Analysis Feature

## Overview
This feature allows users to log their daily activities through a modal in the Tasks & Challenges tab. The user's input is sent to an Azure OpenAI agent along with their current tasks and long-term goals for intelligent semantic analysis and classification.

## Implementation Details

### 1. API Types (`src/shared/types/api.types.ts`)
Added new request and response types:
- **AnalyzeDailyActivityRequest**: Contains sessionId, dailyActivity text, and optional currentTasks
- **AnalyzeDailyActivityResponse**: Returns structured activity matches array with effort ratios and classification
- **ActivityMatch**: Individual activity classification with match type, effort ratio, and alignment factors

### 2. AI Prompt (`src/server/prompts/activity-analysis.prompt.md`)
Created a comprehensive prompt that:
- Takes three inputs: daily planned tasks (JSON), long-term goals (string), and user's daily update (text)
- Classifies each activity into four match types:
  - **exact**: Exactly matches a planned task
  - **similar**: Semantically similar to a planned task
  - **goal-aligned**: Not planned but contributes to long-term goals
  - **unrelated**: Not related to tasks or goals
- Calculates effort_ratio (0-2 scale) based on:
  - time_factor: ratio of actual time to expected time
  - intensity_factor: how intense the activity was
  - effort_ratio = time_factor × intensity_factor (capped at 2.0)
- For similar matches: estimates similarity_score (0.0-1.0)
- For goal-aligned activities: estimates alignment_factor (0.4-0.8)
- Returns structured JSON output (not conversational text)

### 3. AI Configuration (`src/server/config/aiConfigs.ts`)
Added new prompt type:
- **ACTIVITY_ANALYSIS**: Uses gpt-4o-mini model with temperature 0.7 and max tokens 2048

### 4. Reward Calculation (`src/server/utils/rewardCalculation.ts`)
Calculates XP and shards from AI activity matches:
- **Exact match**: Full task XP × effort_ratio
- **Similar match**: Task XP × similarity_score × effort_ratio
- **Goal-aligned**: Category average XP × alignment_factor × effort_ratio
- **Unrelated**: Skipped (no rewards)
- Returns per-activity breakdown and category totals

### 5. API Route (`src/server/routes/aiRoutes.ts`)
`analyzeDailyActivity` function:
- Validates session and user authentication
- Formats current tasks as JSON array
- Retrieves user's long-term goals from profile
- Constructs structured input for the AI with tasks, goals, and daily update
- Calls Azure OpenAI using the activity-analysis prompt
- Parses the JSON response and extracts activity matches
- Calculates rewards using `rewardCalculation.ts`
- **Saves `unclaimedRewards` and `taskHistory` to the user record on the backend**
- Returns matches, rewards breakdown, and raw AI response

### 6. Server Endpoint (`server.ts`)
Registered new endpoint:
- **POST** `/api/ai/analyze-activity`

### 7. Dashboard Component (`src/components/Dashboard.tsx`)
Updated `analyzeDailyActivity` function to:
- Collect current tasks from user's generatedTasks
- Send daily activity input + current tasks to the API
- Refresh user data to pick up backend-saved rewards
- Show success message prompting user to claim rewards
- Rewards and task history are constructed and persisted entirely on the backend

## User Flow

1. User clicks "Log Daily Activities" button in Tasks & Challenges tab
2. Modal opens with textarea for describing their day
3. User enters their activities (e.g., "I went for a run, coded for 2 hours, had a team meeting")
4. User clicks "Analyze & Earn XP"
5. Frontend sends activity text + current tasks to backend
6. Backend retrieves user's goals and formats data for AI
7. AI analyzes activities and classifies each one with effort ratios
8. Backend calculates XP/shard rewards from activity matches
9. Backend saves `unclaimedRewards` and `taskHistory` to user record
10. Frontend refreshes user data and shows success message
11. User clicks "Unclaimed Rewards" to view and claim pending rewards

## Activity Classification

### Match Types
- **✅ Exact**: Activity exactly matches a planned task
- **🔄 Similar**: Activity is semantically similar to a planned task (with similarity score)
- **🎯 Goal-Aligned**: Activity contributes to long-term goals (with alignment factor)
- **❓ Unrelated**: Activity doesn't relate to any task or goal

### Effort Calculation
The AI estimates effort on a 0-2 scale:
- **time_factor**: How much time compared to expected (0.5 = half, 1.0 = expected, 2.0 = double)
- **intensity_factor**: How focused/intense the work was (0.5 = casual, 1.0 = normal, 2.0 = maximum)
- **effort_ratio** = time_factor × intensity_factor (capped at 2.0)

### Additional Scores
- **similarity_score** (0.0-1.0): For similar matches, how close to the original task
- **alignment_factor** (0.4-0.8): For goal-aligned activities, how strongly it supports the goal

## Example Response Format

```json
{
  "matches": [
    {
      "name": "30-minute run",
      "match_type": "similar",
      "matched_task": "Morning Workout",
      "goal_link": null,
      "similarity_score": 0.75,
      "alignment_factor": null,
      "effort_ratio": 0.9,
      "notes": "Similar to planned 45-min workout but shorter duration"
    },
    {
      "name": "2 hours coding a new feature",
      "match_type": "goal-aligned",
      "matched_task": null,
      "goal_link": "learn advanced data structures and algorithms",
      "similarity_score": null,
      "alignment_factor": 0.7,
      "effort_ratio": 1.6,
      "notes": "Feature coding builds problem-solving skills"
    }
  ]
}
```

## Console Output

### Backend Console
```
🎯 AI Response:
================================================================================
{
  "matches": [...]
}
================================================================================
✅ Successfully parsed activity matches: {...}
```

### Frontend Console
```
📊 Activity Matches:
================================================================================

1. 30-minute run
   Match Type: similar
   Matched Task: Morning Workout
   Similarity Score: 0.75
   Effort Ratio: 0.9
   Notes: Similar to planned 45-min workout...

================================================================================
```

## Implemented Features

The following have been built on top of the AI classification:
1. ✅ **Reward calculation** — XP and shards computed based on effort_ratio, match_type, similarity_score, and alignment_factor (`src/server/utils/rewardCalculation.ts`)
2. ✅ **Backend persistence** — `unclaimedRewards` and `taskHistory` saved to user record in `aiRoutes.ts`
3. ✅ **Unclaimed rewards UI** — Dedicated portal to view and batch-claim pending rewards
4. ✅ **Activity history heatmap** — Visual heatmap of daily activity across categories
5. ✅ **Streak system** — Category-based streaks with soft decay and shard multipliers

## Future Enhancements

1. Create a richer UI component for detailed activity analysis breakdown
2. Track activity patterns over time for personalized insights
3. Adaptive task difficulty based on historical completion data

## Testing

To test the feature:
1. Start the server: `npm run dev` (in one terminal)
2. Start the frontend: `npm run dev` (in another terminal)
3. Log in to the application
4. Navigate to Tasks & Challenges tab
5. Ensure you have some tasks generated
6. Click "Log Daily Activities"
7. Enter daily activities (e.g., "I went for a 30-minute run, coded for 2 hours, and helped a colleague")
8. Click "Analyze & Earn XP"
9. Check both browser console and server console for structured output
10. Review the alert showing classified activities with effort ratios
