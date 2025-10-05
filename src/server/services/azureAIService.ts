import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import type { GoalsData, ProfileData } from '../../types';

// Azure AI configuration
const AZURE_PROJECT_URL = "https://gamifai-resource.services.ai.azure.com/api/projects/GamifAI";
const AGENT_ID = "asst_IBdVlsvdpa0mBjtR1RLc7Zkl";

export interface AIAnalysisResult {
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
  };
  error?: string;
  processingTimeMs?: number;
}

class AzureAIService {
  private projectClient: AIProjectClient | null = null;
  private initialized = false;

  constructor() {
    try {
      this.projectClient = new AIProjectClient(
        AZURE_PROJECT_URL,
        new DefaultAzureCredential()
      );
      this.initialized = true;
      console.log('🤖 Azure AI Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Azure AI Service:', error);
      this.initialized = false;
      this.projectClient = null;
    }
  }

  async analyzeGoals(
    goals: GoalsData,
    userProfile?: ProfileData
  ): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    
    if (!this.initialized || !this.projectClient) {
      return {
        success: false,
        error: 'Azure AI Service not initialized'
      };
    }

    try {
      console.log('🤖 Starting Azure AI goals analysis...');

      // Get the agent
      const agent = await this.projectClient.agents.getAgent(AGENT_ID);
      console.log(`✅ Retrieved agent: ${agent.name}`);

      // Create a new thread for this conversation
      const thread = await this.projectClient.agents.threads.create();
      console.log(`✅ Created thread: ${thread.id}`);

      // Prepare the goals analysis prompt
      const promptMessage = this.createGoalsAnalysisPrompt(goals, userProfile);

      // Send the message to the agent
      const message = await this.projectClient.agents.messages.create(
        thread.id, 
        "user", 
        promptMessage
      );
      console.log(`✅ Created message: ${message.id}`);

      // Create and run the analysis
      let run = await this.projectClient.agents.runs.create(thread.id, agent.id);
      console.log(`🔄 Started run: ${run.id}`);

      // Poll until the run completes
      while (run.status === "queued" || run.status === "in_progress") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        run = await this.projectClient.agents.runs.get(thread.id, run.id);
        console.log(`🔄 Run status: ${run.status}`);
      }

      if (run.status === "failed") {
        console.error('❌ Run failed:', run.lastError);
        return {
          success: false,
          error: `AI analysis failed: ${run.lastError?.message || 'Unknown error'}`,
          processingTimeMs: Date.now() - startTime
        };
      }

      console.log(`✅ Run completed with status: ${run.status}`);

      // Retrieve the agent's response
      const messages = await this.projectClient.agents.messages.list(thread.id, { 
        order: "desc",
        limit: 1 
      });

      let agentResponse = '';
      for await (const m of messages) {
        if (m.role === 'assistant') {
          const content = m.content.find((c) => c.type === "text" && "text" in c);
          if (content && 'text' in content) {
            agentResponse = content.text.value;
            break;
          }
        }
      }

      if (!agentResponse) {
        return {
          success: false,
          error: 'No response received from AI agent',
          processingTimeMs: Date.now() - startTime
        };
      }

      // Parse the AI response
      const analysisResult = this.parseAIResponse(agentResponse);

      console.log('✅ Azure AI analysis completed successfully');
      
      return {
        success: true,
        data: analysisResult,
        processingTimeMs: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Azure AI analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  private createGoalsAnalysisPrompt(goals: GoalsData, userProfile?: ProfileData): string {
    const profileInfo = userProfile ? `
User Profile:
- Name: ${userProfile.name || 'Not provided'}
- Age: ${userProfile.age || 'Not provided'}
- Currency: ${userProfile.currency || 'USD'}
` : '';

    return `You are DailyTaskAgent, an AI assistant specialized in analyzing user goals and creating personalized daily tasks for a gamification platform. 

${profileInfo}

User's Long-term Goals:
${goals.longTermGoals}

Please analyze these goals and provide a structured response in the following JSON format:

{
  "tasks": [
    {
      "title": "Task title",
      "description": "Detailed task description",
      "category": "fitness|learning|career|social|personal|health|financial",
      "difficulty": "easy|medium|hard|expert",
      "estimatedTime": "15 minutes|30 minutes|1 hour|2 hours",
      "xpReward": 50
    }
  ],
  "insights": [
    "Key insight about the user's goals",
    "Another important observation"
  ],
  "recommendations": [
    "Specific recommendation for achieving goals",
    "Another actionable recommendation"
  ],
  "goalAnalysis": {
    "strengths": ["Identified strength 1", "Identified strength 2"],
    "challenges": ["Potential challenge 1", "Potential challenge 2"],
    "priorities": ["High priority area 1", "High priority area 2"]
  }
}

Guidelines:
1. Create 5-8 specific, actionable daily tasks based on the goals
2. Vary the difficulty and time requirements
3. XP rewards should be: easy (25-50), medium (75-100), hard (125-150), expert (175-200)
4. Make tasks SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
5. Consider the user's profile when creating tasks
6. Provide meaningful insights about goal patterns and motivations
7. Give practical recommendations for goal achievement
8. Identify realistic challenges the user might face

Respond ONLY with the JSON object, no additional text.`;
  }

  private parseAIResponse(response: string): any {
    try {
      // Clean the response to extract just the JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      
      // Validate the structure
      if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
        throw new Error('Invalid tasks structure');
      }
      
      if (!parsed.insights || !Array.isArray(parsed.insights)) {
        throw new Error('Invalid insights structure');
      }
      
      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        throw new Error('Invalid recommendations structure');
      }
      
      if (!parsed.goalAnalysis || typeof parsed.goalAnalysis !== 'object') {
        throw new Error('Invalid goalAnalysis structure');
      }
      
      return parsed;
      
    } catch (error) {
      console.error('❌ Failed to parse AI response:', error);
      console.error('Raw response:', response);
      
      // Return a fallback structure
      return {
        tasks: [
          {
            title: "Review Your Goals",
            description: "Take 15 minutes to review and refine your long-term goals",
            category: "personal",
            difficulty: "easy",
            estimatedTime: "15 minutes",
            xpReward: 25
          }
        ],
        insights: [
          "AI analysis encountered an issue, but your goals show great potential for growth."
        ],
        recommendations: [
          "Consider breaking down your goals into smaller, more specific objectives.",
          "Set up a daily review system to track your progress."
        ],
        goalAnalysis: {
          strengths: ["Goal-oriented mindset"],
          challenges: ["Need more specific action items"],
          priorities: ["Goal refinement and planning"]
        }
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.initialized || !this.projectClient) {
      return {
        success: false,
        message: 'Azure AI Service not initialized'
      };
    }

    try {
      const agent = await this.projectClient.agents.getAgent(AGENT_ID);
      return {
        success: true,
        message: `Successfully connected to agent: ${agent.name}`
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}

// Export singleton instance
export const azureAIService = new AzureAIService();
export default azureAIService;