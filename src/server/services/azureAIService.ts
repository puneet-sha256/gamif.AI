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

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.initialized || !this.client) {
      return {
        success: false,
        message: 'Azure OpenAI Service not initialized'
      };
    }

    try {
      // Test with a simple completion
      const response = await this.client.chat.completions.create({
        messages: [
          { role: "user", content: "Hello, are you working?" }
        ],
        max_tokens: 50,
        temperature: 0.1,
        model: modelName
      });

      if (response?.choices?.[0]?.message?.content) {
        return {
          success: true,
          message: 'Azure OpenAI connection successful'
        };
      } else {
        return {
          success: false,
          message: 'No response from Azure OpenAI'
        };
      }
    } catch (error) {
      console.error('❌ Azure OpenAI connection test failed:', error);
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