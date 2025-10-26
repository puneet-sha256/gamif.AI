# Daily Activity Analysis Feature

## Overview
This feature allows users to log their daily activities through a modal in the Tasks & Challenges tab. The user's input is sent to an Azure OpenAI agent along with their current tasks for intelligent analysis and feedback.

## Implementation Details

### 1. API Types (`src/shared/types/api.types.ts`)
Added new request and response types:
- **AnalyzeDailyActivityRequest**: Contains sessionId, dailyActivity text, and optional currentTasks
- **AnalyzeDailyActivityResponse**: Returns the AI's analysis response and processing time

### 2. AI Prompt (`src/server/prompts/activity-analysis.prompt.md`)
Created a comprehensive prompt that:
- Instructs the AI to analyze user activities
- Categorizes activities into Strength, Intelligence, and Charisma
- Compares activities against current tasks
- Provides detailed, encouraging feedback
- Suggests appropriate XP and shards (without calculating totals yet)

### 3. AI Configuration (`src/server/config/aiConfigs.ts`)
Added new prompt type:
- **ACTIVITY_ANALYSIS**: Uses gpt-4o-mini model with temperature 0.7 and max tokens 2048

### 4. API Route (`src/server/routes/aiRoutes.ts`)
Created `analyzeDailyActivity` function that:
- Validates session and user authentication
- Formats user activity and current tasks into a structured message
- Calls Azure OpenAI using the activity-analysis prompt
- Returns the AI's response for logging/display

### 5. Server Endpoint (`server.ts`)
Registered new endpoint:
- **POST** `/api/ai/analyze-activity`

### 6. Dashboard Component (`src/components/Dashboard.tsx`)
Updated `analyzeDailyActivity` function to:
- Collect current tasks from user's generatedTasks
- Send both daily activity input and current tasks to the API
- Display AI response in an alert (for now)
- Log the full AI response to console

## User Flow

1. User clicks "Log Daily Activities" button in Tasks & Challenges tab
2. Modal opens with textarea for describing their day
3. User enters their activities (e.g., "I went for a run, coded for 2 hours, had a team meeting")
4. User clicks "Analyze & Earn XP"
5. Frontend sends activity text + current tasks to backend
6. Backend formats the data and calls Azure OpenAI
7. AI analyzes the activities against tasks and provides detailed feedback
8. Response is logged to console and shown to user in alert

## Console Output

The AI response will be logged in both:
- **Backend console**: Server logs the full AI response between separator lines
- **Frontend console**: Dashboard logs the AI response with appropriate emoji indicators

## Next Steps

The AI response is currently just logged and displayed. Future implementations will:
1. Parse the AI's XP/shards suggestions
2. Update user stats automatically
3. Show a better UI for the feedback (instead of alert)
4. Track which tasks were completed based on activity analysis

## Example AI Response Format

```
🎉 Excellent work today! Let me break down your accomplishments:

**💪 Strength Activities:**
- You completed a 30-minute run! While your task called for a 45-minute workout, 
  you still showed up and built that consistency. This deserves solid recognition 
  - perhaps 15 XP and 25 shards.

**🧠 Intelligence Activities:**
- 2 hours of coding on a new feature is substantial work! This aligns perfectly 
  with your problem-solving tasks. Worth around 25 XP and 45 shards.

**✨ Charisma Activities:**
- Team meeting presentation demonstrated leadership. Worth approximately 15 XP 
  and 30 shards.

**Overall Assessment:**
You knocked it out of the park today! Keep this momentum going! 🚀

Estimated Total: ~55 XP and ~100 shards
```

## Testing

To test the feature:
1. Start the server: `npm run dev` (in separate terminal)
2. Start the frontend: `npm run dev`
3. Log in to the application
4. Navigate to Tasks & Challenges tab
5. Click "Log Daily Activities"
6. Enter some daily activities
7. Click "Analyze & Earn XP"
8. Check both browser console and server console for AI response
