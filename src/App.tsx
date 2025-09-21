import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthScreen from './components/AuthScreen'
import ProfileSetup from './components/ProfileSetup'
import GoalsSetup from './components/GoalsSetup'
import Dashboard from './components/Dashboard'
import LoadingScreen from './components/LoadingScreen'
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
      console.log('🔄 App: useEffect triggered - initializing application', {
        isLoading,
        hasUser: !!user,
        userId: user?.id,
        currentStep
      })
      
      if (isLoading) {
        console.log('⏳ App: Auth context still loading, waiting...')
        return
      }

      const onboardingStatus = getOnboardingStatus(user)
      
      if (user) {
        console.log('✅ App: User found, analyzing onboarding progress:', {
          userId: user.id,
          username: user.username,
          currentStep: onboardingStatus.step,
          isOnboardingComplete: onboardingStatus.isComplete,
          profileData: user.profileData ? Object.keys(user.profileData) : 'none',
          goalsLength: user.goalsData?.longTermGoals?.length || 0
        })

        if (currentStep !== onboardingStatus.step) {
          console.log(`🎯 App: Redirecting from ${currentStep} to ${onboardingStatus.step} step`)
          setCurrentStep(onboardingStatus.step as OnboardingStep)
        } else {
          console.log(`✅ App: Already on correct step: ${currentStep}`)
        }
      } else {
        console.log('🔐 App: No user session found, showing login screen')
        setCurrentStep('auth')
      }

      setIsInitializing(false)
      console.log('✅ App: Application initialization complete')
    }

    initializeApp()
  }, [user, isLoading]) // Remove currentStep from deps to avoid loops

  const handleLogin = () => {
    console.log('🔄 App: User logged in successfully - letting useEffect handle routing')
    // Don't manually set step here - let the useEffect handle it when user state updates
  }

  const handleProfileComplete = async (data: ProfileData) => {
    console.log('✅ App: Profile setup completed:', {
      name: data.name,
      age: data.age,
      currency: data.currency,
      monthlyLimit: data.monthlyLimit
    })
    await updateUser({ profileData: data })
    console.log('📝 App: Profile data saved, proceeding to goals setup')
    setCurrentStep('goals')
  }

  const handleGoalsComplete = async (data: GoalsData) => {
    console.log('✅ App: Goals setup completed:', {
      goalsLength: data.longTermGoals.length,
      preview: data.longTermGoals.substring(0, 50) + (data.longTermGoals.length > 50 ? '...' : '')
    })
    await updateUser({ goalsData: data })
    console.log('🎮 App: Goals data saved, onboarding complete - proceeding to dashboard')
    setCurrentStep('dashboard')
  }

  const handleGoalsBack = () => {
    setCurrentStep('profile')
  }

  const handleLogout = async () => {
    console.log('🔄 App: User logout initiated')
    await logout()
    console.log('✅ App: Logout complete - useEffect will handle routing to auth screen')
  }

  // Show loading screen while initializing
  if (isInitializing || isLoading) {
    console.log('⏳ App: Showing loading screen during initialization')
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
          <Route path="*" element={renderCurrentStep()} />
        </Routes>
      </div>
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
