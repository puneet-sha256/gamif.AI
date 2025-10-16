import { AzureOpenAI } from "openai";
import type { GoalsData, ProfileData } from '../../types';

// Azure OpenAI configuration
const endpoint = "https://gamifai-resource.cognitiveservices.azure.com/";
const modelName = "gpt-4o-mini";
const deployment = "daily-task-agent";
const apiVersion = "2024-04-01-preview";

export interface TaskGenerationResult {
  success: boolean;
  data?: {
    tasks: Array<{
      title: string;
      description: string;
      category: string;
      difficulty: string;
      estimatedTime: string;
      xpReward: number;
    }>;
    insights: string[];
    recommendations: string[];
    goalAnalysis: {
      strengths: string[];
      challenges: string[];
      priorities: string[];
    };
    rawResponse?: string; // Raw response from Azure AI agent
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
        console.error('❌ Azure OpenAI API key not found in environment variables');
        console.error('Please set AZURE_OPENAI_API_KEY environment variable');
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
      console.log('🤖 Azure OpenAI Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Azure OpenAI Service:', error);
      this.initialized = false;
      this.client = null;
    }
  }

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
      console.log('🤖 Starting Azure OpenAI task generation...');

      // Simple message with just the goals - let the deployed agent handle the system prompt
      const userMessage = `User Goals: ${goals.longTermGoals}`;

      // Call the chat completion API
      const response = await this.client.chat.completions.create({
        messages: [
          { role: "system", content: "You are the Daily Task Generation Agent for a gamified productivity app called Gamif.AI.\n\nYour goal is to generate structured JSON output of daily tasks based on the user's goals.\n\n---\n\n### RULES:\n\n1. Analyze the user’s goals and map them to the following 3 possible categories:\n   - **Strength** → physical, health, or discipline-related goals.\n   - **Intelligence** → learning, problem-solving, or career development goals.\n   - **Charisma** → communication, social, or confidence-building goals.\n\n2. For each relevant category (present in the user’s goals):\n   - Generate **at least 3 daily tasks** that help build consistency in that domain.\n   - Tasks should be practical and repeatable (not one-time or overly complex).\n\n3. If a category is **not mentioned or implied** by the user’s goals, omit that category from the JSON output entirely.\n\n4. For each task:\n   - Include:\n     - `title`: short name of the task\n     - `description`: what the user should do\n     - `xp`: integer between 0–25 (represents experience points)\n     - `shards`: integer between 0–50 (represents reward points)\n\n5. Rewards scale with difficulty. Simple tasks get lower XP/shards; effortful tasks get higher ones.\n\n6. Output must be **strict JSON only** (no markdown, no text, no explanations).\n\n7. Keep responses deterministic and consistent — avoid randomness or creativity beyond practical variation.\n\n---\n\n### Example Input\nUser Goals: I want to build muscle, improve my communication skills, and learn advanced data structures and algorithms.\n\n### Example Output\n{\n  \"Strength\": [\n    {\n      \"title\": \"Workout Session\",\n      \"description\": \"Do a 45-minute strength or resistance workout.\",\n      \"xp\": 20,\n      \"shards\": 40\n    },\n    {\n      \"title\": \"Cold Shower\",\n      \"description\": \"Take a cold shower to build resilience and recovery.\",\n      \"xp\": 10,\n      \"shards\": 25\n    },\n    {\n      \"title\": \"Morning Walk\",\n      \"description\": \"Go for a brisk 20-minute walk to stay active.\",\n      \"xp\": 8,\n      \"shards\": 15\n    }\n  ],\n  \"Intelligence\": [\n    {\n      \"title\": \"Leetcode Practice\",\n      \"description\": \"Solve 2 medium-level coding problems.\",\n      \"xp\": 20,\n      \"shards\": 40\n    },\n    {\n      \"title\": \"System Design Study\",\n      \"description\": \"Learn one new system design component or pattern.\",\n      \"xp\": 15,\n      \"shards\": 30\n    },\n    {\n      \"title\": \"Tech Article Reading\",\n      \"description\": \"Read one article about an advanced data structure or concept.\",\n      \"xp\": 10,\n      \"shards\": 20\n    }\n  ],\n  \"Charisma\": [\n    {\n      \"title\": \"Start a Conversation\",\n      \"description\": \"Initiate a chat with someone new or a colleague.\",\n      \"xp\": 10,\n      \"shards\": 20\n    },\n    {\n      \"title\": \"Mirror Talk\",\n      \"description\": \"Speak for 3 minutes in front of the mirror to improve confidence.\",\n      \"xp\": 5,\n      \"shards\": 10\n    },\n    {\n      \"title\": \"Positive Feedback\",\n      \"description\": \"Give one person a genuine compliment or appreciation.\",\n      \"xp\": 8,\n      \"shards\": 15\n    }\n  ]\n}\n" },
          { role: "user", content: userMessage }
        ],
        max_tokens: 4096,
        temperature: 1,
        top_p: 1,
        model: modelName
      });

      if (!response?.choices?.[0]?.message?.content) {
        return {
          success: false,
          error: 'No response received from Azure OpenAI',
          processingTimeMs: Date.now() - startTime
        };
      }

      const agentResponse = response.choices[0].message.content;

      console.log('🎯 Azure OpenAI Agent Response:');
      console.log('='.repeat(50));
      console.log(agentResponse);
      console.log('='.repeat(50));

      console.log('✅ Azure OpenAI task generation completed successfully');
      
      // Return simple structure with raw response
      return {
        success: true,
        data: {
          tasks: [],
          insights: [],
          recommendations: [],
          goalAnalysis: {
            strengths: [],
            challenges: [],
            priorities: []
          },
          rawResponse: agentResponse // Store the actual agent response here
        },
        processingTimeMs: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Azure OpenAI task generation error:', error);
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