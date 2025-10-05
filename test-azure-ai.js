// Test script for Azure AI Goals Analysis Integration
// This script demonstrates how to test the goals analysis functionality

const API_BASE_URL = 'http://localhost:3001/api';

// Sample goals data for testing
const sampleGoalsData = {
  longTermGoals: `• Build muscle mass and improve cardiovascular health through consistent gym routine
• Learn JavaScript and Python to advance my programming career  
• Develop better communication skills for leadership roles
• Start a side business in digital marketing
• Read 24 books this year to expand knowledge
• Build better financial habits and start investing
• Learn Spanish to communicate with more people
• Improve time management and productivity systems
• Develop a morning meditation practice for mental clarity
• Build a professional network in the tech industry`
};

const sampleUserProfile = {
  name: "Test User",
  age: 28,
  currency: "USD"
};

// Test authentication and get session
async function testAuthentication() {
  console.log('🔐 Testing authentication...');
  
  try {
    // Register a test user
    const registerResponse = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: 'TestPassword123!'
      })
    });
    
    const registerResult = await registerResponse.json();
    console.log('✅ Registration result:', registerResult.success ? 'Success' : 'Failed');
    
    if (registerResult.success) {
      console.log('🔑 Session ID obtained:', registerResult.data?.sessionId?.substring(0, 8) + '...');
      return registerResult.data?.sessionId;
    }
    
    console.log('❌ Registration failed:', registerResult.message);
    return null;
  } catch (error) {
    console.error('❌ Authentication test failed:', error);
    return null;
  }
}

// Test AI goals analysis
async function testAIGoalsAnalysis(sessionId) {
  console.log('🤖 Testing Azure AI goals analysis...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/ai/analyze-goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: sessionId,
        goals: sampleGoalsData,
        userProfile: sampleUserProfile
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ AI Analysis completed successfully!');
      console.log(`⏱️  Processing time: ${result.metadata?.processingTime}ms`);
      console.log(`🎯 Tasks generated: ${result.data?.tasks?.length || 0}`);
      console.log(`💡 Insights generated: ${result.data?.insights?.length || 0}`);
      console.log(`📋 Recommendations: ${result.data?.recommendations?.length || 0}`);
      
      if (result.data?.tasks) {
        console.log('\n📋 Generated Tasks:');
        result.data.tasks.forEach((task, index) => {
          console.log(`${index + 1}. ${task.title}`);
          console.log(`   Category: ${task.category} | Difficulty: ${task.difficulty}`);
          console.log(`   Time: ${task.estimatedTime} | XP: ${task.xpReward}`);
          console.log(`   Description: ${task.description}`);
          console.log('');
        });
      }
      
      if (result.data?.insights) {
        console.log('\n💡 AI Insights:');
        result.data.insights.forEach((insight, index) => {
          console.log(`${index + 1}. ${insight}`);
        });
      }
      
      if (result.data?.recommendations) {
        console.log('\n📋 AI Recommendations:');
        result.data.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec}`);
        });
      }
      
      if (result.data?.goalAnalysis) {
        console.log('\n🎯 Goal Analysis:');
        console.log('Strengths:', result.data.goalAnalysis.strengths);
        console.log('Challenges:', result.data.goalAnalysis.challenges);
        console.log('Priorities:', result.data.goalAnalysis.priorities);
      }
      
      return true;
    } else {
      console.log('❌ AI Analysis failed:', result.message);
      return false;
    }
  } catch (error) {
    console.error('❌ AI analysis test failed:', error);
    return false;
  }
}

// Test AI health endpoint
async function testAIHealth() {
  console.log('🏥 Testing AI health endpoint...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/ai/health`);
    const result = await response.json();
    
    console.log('AI Health Status:', result.success ? '✅ Healthy' : '❌ Unhealthy');
    console.log('Azure AI Status:', result.data?.azureAI?.success ? '✅ Connected' : '❌ Disconnected');
    
    if (!result.data?.azureAI?.success) {
      console.log('Azure AI Error:', result.data?.azureAI?.message);
    }
    
    return result.success;
  } catch (error) {
    console.error('❌ AI health test failed:', error);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Azure AI Integration Tests...\n');
  
  // Test 1: AI Health Check
  await testAIHealth();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: Authentication
  const sessionId = await testAuthentication();
  if (!sessionId) {
    console.log('❌ Cannot proceed with AI tests - authentication failed');
    return;
  }
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 3: AI Goals Analysis
  const aiTestSuccess = await testAIGoalsAnalysis(sessionId);
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 Test Summary:');
  console.log(`Authentication: ${sessionId ? '✅ Pass' : '❌ Fail'}`);
  console.log(`AI Analysis: ${aiTestSuccess ? '✅ Pass' : '❌ Fail'}`);
  console.log('='.repeat(50));
}

// Run tests if this script is executed directly
if (typeof window === 'undefined') {
  runTests().catch(console.error);
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testAuthentication,
    testAIGoalsAnalysis,
    testAIHealth,
    runTests,
    sampleGoalsData,
    sampleUserProfile
  };
}