import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AlertProvider } from './contexts/AlertContext'
import { ConfirmProvider } from './contexts/ConfirmContext'
import { PromptProvider } from './contexts/PromptContext'
import AuthScreen from './components/AuthScreen'
import ProfileSetup from './components/ProfileSetup'
import GoalsSetup from './components/GoalsSetup'
import Dashboard from './components/Dashboard'
import LoadingScreen from './components/LoadingScreen'
import AlertTest from './components/AlertTest'
import ConfirmTest from './components/ConfirmTest'
import PromptTest from './components/PromptTest'
import type { ProfileData, GoalsData } from './types'
import './App.css'

type OnboardingStep = 'auth' | 'profile' | 'goals' | 'dashboard'

function AppContent() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('auth')
  const [isInitializing, setIsInitializing] = useState(true)
  const { user, updateUser, isLoading, logout } = useAuth()

  // Helper function to determine onboarding completion status
  const getOnboardingStatus = (user: any): { step: OnboardingStep, isComplete: boolean } => {
    if (!user) return { step: 'auth', isComplete: false }

    const isProfileComplete = user.profileData && 
      user.profileData.name?.trim() && 
      user.profileData.age > 0 && 
      user.profileData.monthlyLimit !== undefined && 
      user.profileData.currency?.trim()

    const isGoalsComplete = user.goalsData && 
      user.goalsData.longTermGoals?.trim() && 
      user.goalsData.longTermGoals.trim().length >= 50

    if (!isProfileComplete) {
      return { step: 'profile', isComplete: false }
    } else if (!isGoalsComplete) {
      return { step: 'goals', isComplete: false }
    } else {
      return { step: 'dashboard', isComplete: true }
    }
  }

  // Auto-login effect: Check if user is logged in and determine appropriate step
  useEffect(() => {
    const initializeApp = async () => {
      if (isLoading) {
        return
      }

      const onboardingStatus = getOnboardingStatus(user)
      
      if (user) {
        if (currentStep !== onboardingStatus.step) {
          setCurrentStep(onboardingStatus.step as OnboardingStep)
        }
      } else {
        setCurrentStep('auth')
      }

      setIsInitializing(false)
    }

    initializeApp()
  }, [user, isLoading]) // Remove currentStep from deps to avoid loops

  const handleLogin = () => {
    // Don't manually set step here - let the useEffect handle it when user state updates
  }

  const handleProfileComplete = async (data: ProfileData) => {
    await updateUser({ profileData: data })
    setCurrentStep('goals')
  }

  const handleGoalsComplete = async (data: GoalsData) => {
    await updateUser({ goalsData: data })
    setCurrentStep('dashboard')
  }

  const handleGoalsBack = () => {
    setCurrentStep('profile')
  }

  const handleLogout = async () => {
    await logout()
  }

  // Show loading screen while initializing (but not during auth operations)
  if (isInitializing) {
    return <LoadingScreen />
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'auth':
        return <AuthScreen onLogin={handleLogin} />
      case 'profile':
        return <ProfileSetup onComplete={handleProfileComplete} />
      case 'goals':
        return <GoalsSetup onComplete={handleGoalsComplete} onBack={handleGoalsBack} />
      case 'dashboard':
        return (
          <Dashboard 
            onLogout={handleLogout}
          />
        )
      default:
        return <div style={{ color: 'white', padding: '20px', background: '#000' }}>Loading...</div>
    }
  }

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/test-alerts" element={<AlertTest />} />
          <Route path="/test-confirm" element={<ConfirmTest />} />
          <Route path="/test-prompt" element={<PromptTest />} />
          <Route path="*" element={renderCurrentStep()} />
        </Routes>
      </div>
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <AlertProvider>
        <ConfirmProvider>
          <PromptProvider>
            <AppContent />
          </PromptProvider>
        </ConfirmProvider>
      </AlertProvider>
    </AuthProvider>
  )
}

export default App
