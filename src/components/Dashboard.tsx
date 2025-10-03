import './Dashboard.css'
import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'

interface DashboardProps {
  onLogout: () => void
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const { user, logout } = useAuth()

  useEffect(() => {
    console.log('🎯 Dashboard: Component mounted')
    if (user) {
      console.log('✅ Dashboard: User data loaded:', {
        id: user.id,
        username: user.username,
        email: user.email,
        hasProfile: !!user.profileData,
        hasGoals: !!user.goalsData
      })
    } else {
      console.log('⚠️ Dashboard: No user data available')
    }
  }, [user])

  const handleLogout = async () => {
    console.log('🔄 Dashboard: Logout initiated by user')
    try {
      await logout()
      console.log('✅ Dashboard: Logout successful, navigating away')
      onLogout()
    } catch (error) {
      console.error('❌ Dashboard: Error during logout:', error)
    }
  }

  const getCurrency = (code: string) => {
    const currencies: { [key: string]: string } = {
      'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 
      'KRW': '₩', 'INR': '₹', 'CAD': 'C$', 'AUD': 'A$'
    }
    return currencies[code] || code
  }

  const profileData = user?.profileData
  const goalsData = user?.goalsData

  console.log('🎯 Dashboard: Rendering with data:', {
    hasProfileData: !!profileData,
    hasGoalsData: !!goalsData,
    profileName: profileData?.name,
    currency: profileData?.currency
  })

  if (!user) {
    console.log('⚠️ Dashboard: No user data, cannot render dashboard')
    return <div>Loading user data...</div>
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-logo">
          <h1>SOLO LEVELING</h1>
          <div className="subtitle">Player System Dashboard</div>
        </div>
        <div className="user-info">
          {profileData && (
            <span className="welcome-text">Welcome, {profileData.name}!</span>
          )}
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
      
      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Player Profile</h2>
          <p>Your journey in the Shadow realm continues...</p>
        </div>
        
        {profileData && (
          <div className="profile-section">
            <div className="profile-card">
              <h3>Personal Information</h3>
              <div className="profile-grid">
                <div className="profile-item">
                  <span className="label">Player Name:</span>
                  <span className="value">{profileData.name}</span>
                </div>
                <div className="profile-item">
                  <span className="label">Age:</span>
                  <span className="value">{profileData.age} years</span>
                </div>
                <div className="profile-item">
                  <span className="label">Monthly Limit:</span>
                  <span className="value">
                    {getCurrency(profileData.currency)}{profileData.monthlyLimit.toLocaleString()}
                  </span>
                </div>
                <div className="profile-item">
                  <span className="label">Currency:</span>
                  <span className="value">{profileData.currency}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">⚔️</div>
            <div className="stat-info">
              <h3>Level</h3>
              <div className="stat-value">{user?.stats?.level || 1}</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">💎</div>
            <div className="stat-info">
              <h3>Shards</h3>
              <div className="stat-value">{user?.stats?.experience || 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
