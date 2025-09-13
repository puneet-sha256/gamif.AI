import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthScreen from './components/AuthScreen'
import ProfileSetup from './components/ProfileSetup'
import GoalsSetup from './components/GoalsSetup'
import Dashboard from './components/Dashboard'
import type { ProfileData } from './components/ProfileSetup'
import type { GoalsData } from './components/GoalsSetup'
import './App.css'

type OnboardingStep = 'auth' | 'profile' | 'goals' | 'dashboard'

function AppContent() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('auth')
  const { updateUser } = useAuth()

  const handleLogin = () => {
    setCurrentStep('profile')
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

  const handleLogout = () => {
    setCurrentStep('auth')
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
