import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AlertProvider } from './contexts/AlertContext'
import { ConfirmProvider } from './contexts/ConfirmContext'
import { ThemeProvider } from './contexts/ThemeContext'
import AuthScreen from './components/AuthScreen'
import ProfileSetup from './components/ProfileSetup'
import GoalsSetup from './components/GoalsSetup'
import Dashboard from './components/Dashboard'
import LoadingScreen from './components/LoadingScreen'
import AlertTest from './components/AlertTest'
import ConfirmTest from './components/ConfirmTest'
import type { ProfileData, GoalsData } from './types'
import './App.css'
import './fierce/fierce.css'
import { useFierceUI } from './fierce/useFierceUI'
import FierceAuthScreen from './fierce/FierceAuthScreen'
import FierceProfileSetup from './fierce/FierceProfileSetup'
import FierceGoalsSetup from './fierce/FierceGoalsSetup'
import FierceDashboard from './fierce/FierceDashboard'

type OnboardingStep = 'auth' | 'profile' | 'goals' | 'dashboard'

function AppContent() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('auth')
  const [isInitializing, setIsInitializing] = useState(true)
  const { user, updateUser, isLoading, logout } = useAuth()
  const fierce = useFierceUI()

  const getOnboardingStatus = (user: any): { step: OnboardingStep, isComplete: boolean } => {
    if (!user) return { step: 'auth', isComplete: false }

    const isProfileComplete = user.profileData &&
      user.profileData.name?.trim() &&
      user.profileData.age > 0

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
  }, [user, isLoading])

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

  if (isInitializing) {
    return <LoadingScreen />
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'auth':
        return fierce
          ? <FierceAuthScreen onLogin={handleLogin} />
          : <AuthScreen onLogin={handleLogin} />
      case 'profile':
        return fierce
          ? <FierceProfileSetup onComplete={handleProfileComplete} />
          : <ProfileSetup onComplete={handleProfileComplete} />
      case 'goals':
        return fierce
          ? <FierceGoalsSetup onComplete={handleGoalsComplete} onBack={handleGoalsBack} />
          : <GoalsSetup onComplete={handleGoalsComplete} onBack={handleGoalsBack} />
      case 'dashboard':
        return fierce
          ? <FierceDashboard onLogout={handleLogout} />
          : <Dashboard onLogout={handleLogout} />
      default:
        return <div style={{ color: 'var(--text-primary)', padding: '20px', background: 'var(--bg-primary)' }}>Loading...</div>
    }
  }

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/test-alerts" element={<AlertTest />} />
          <Route path="/test-confirm" element={<ConfirmTest />} />
          <Route path="*" element={renderCurrentStep()} />
        </Routes>
      </div>
    </Router>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AlertProvider>
          <ConfirmProvider>
            <AppContent />
          </ConfirmProvider>
        </AlertProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
