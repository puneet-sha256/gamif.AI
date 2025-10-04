import './Dashboard.css'
import { useAuth } from '../contexts/AuthContext'
import { useEffect, useState } from 'react'

interface DashboardProps {
  onLogout: () => void
}

type TabType = 'profile' | 'tasks' | 'inventory' | 'shop'

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('profile')

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

  const renderProfileTab = () => (
    <div className="tab-content">
      <div className="profile-overview">
        <h2>Player Profile</h2>
        <p>Your journey in the development realm continues...</p>
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
            <div className="stat-value">{user?.stats?.shards || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-info">
            <h3>Experience</h3>
            <div className="stat-value">{user?.stats?.experience || 0}</div>
          </div>
        </div>
      </div>

      {goalsData && (
        <div className="goals-section">
          <div className="goals-card">
            <h3>Your Goals</h3>
            <div className="goals-text">
              {goalsData.longTermGoals}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderTasksTab = () => (
    <div className="tab-content">
      <div className="tasks-header">
        <h2>Tasks & Challenges</h2>
        <p>Complete tasks to earn experience and shards</p>
      </div>
      
      <div className="tasks-grid">
        <div className="task-section">
          <h3>🎯 Active Tasks</h3>
          <div className="task-list">
            <div className="task-item">
              <div className="task-info">
                <h4>Daily Exercise</h4>
                <p>Complete 30 minutes of physical activity</p>
                <div className="task-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '60%' }}></div>
                  </div>
                  <span>60% Complete</span>
                </div>
              </div>
              <div className="task-rewards">
                <span className="xp-reward">+50 XP</span>
                <span className="shard-reward">+10 💎</span>
              </div>
            </div>
            
            <div className="task-item">
              <div className="task-info">
                <h4>Learn Something New</h4>
                <p>Spend 1 hour learning a new skill</p>
                <div className="task-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '25%' }}></div>
                  </div>
                  <span>25% Complete</span>
                </div>
              </div>
              <div className="task-rewards">
                <span className="xp-reward">+75 XP</span>
                <span className="shard-reward">+15 💎</span>
              </div>
            </div>
          </div>
        </div>

        <div className="challenge-section">
          <h3>🏆 Weekly Challenges</h3>
          <div className="challenge-list">
            <div className="challenge-item">
              <div className="challenge-info">
                <h4>Consistency Champion</h4>
                <p>Complete daily tasks for 7 days straight</p>
                <div className="challenge-progress">
                  <span>Progress: 3/7 days</span>
                </div>
              </div>
              <div className="challenge-rewards">
                <span className="xp-reward">+200 XP</span>
                <span className="shard-reward">+50 💎</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderInventoryTab = () => (
    <div className="tab-content">
      <div className="inventory-header">
        <h2>Inventory</h2>
        <p>Your collected items and achievements</p>
      </div>
      
      <div className="inventory-grid">
        <div className="inventory-section">
          <h3>🎖️ Achievements</h3>
          <div className="achievement-list">
            <div className="achievement-item unlocked">
              <div className="achievement-icon">🏃</div>
              <div className="achievement-info">
                <h4>First Steps</h4>
                <p>Complete your first task</p>
              </div>
            </div>
            
            <div className="achievement-item locked">
              <div className="achievement-icon">⭐</div>
              <div className="achievement-info">
                <h4>Rising Star</h4>
                <p>Reach level 5</p>
              </div>
            </div>
            
            <div className="achievement-item locked">
              <div className="achievement-icon">💪</div>
              <div className="achievement-info">
                <h4>Dedicated Learner</h4>
                <p>Complete 10 learning tasks</p>
              </div>
            </div>
          </div>
        </div>

        <div className="items-section">
          <h3>🎁 Items</h3>
          <div className="items-grid">
            <div className="item-slot empty">
              <span>Empty Slot</span>
            </div>
            <div className="item-slot empty">
              <span>Empty Slot</span>
            </div>
            <div className="item-slot empty">
              <span>Empty Slot</span>
            </div>
            <div className="item-slot empty">
              <span>Empty Slot</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderShopTab = () => (
    <div className="tab-content">
      <div className="shop-header">
        <h2>Shop</h2>
        <p>Spend your shards on rewards and upgrades</p>
        <div className="currency-display">
          <span className="currency-amount">{user?.stats?.shards || 0} 💎 Shards</span>
        </div>
      </div>
      
      <div className="shop-grid">
        <div className="shop-section">
          <h3>💝 Rewards</h3>
          <div className="shop-items">
            <div className="shop-item">
              <div className="item-image">🎮</div>
              <div className="item-info">
                <h4>Gaming Session</h4>
                <p>Unlock 2 hours of guilt-free gaming</p>
                <div className="item-price">50 💎</div>
              </div>
              <button className="buy-button" disabled={!user?.stats?.shards || user.stats.shards < 50}>
                Buy
              </button>
            </div>
            
            <div className="shop-item">
              <div className="item-image">🍕</div>
              <div className="item-info">
                <h4>Treat Yourself</h4>
                <p>Order your favorite meal</p>
                <div className="item-price">75 💎</div>
              </div>
              <button className="buy-button" disabled={!user?.stats?.shards || user.stats.shards < 75}>
                Buy
              </button>
            </div>
            
            <div className="shop-item">
              <div className="item-image">📚</div>
              <div className="item-info">
                <h4>Book Purchase</h4>
                <p>Buy that book you've been wanting</p>
                <div className="item-price">100 💎</div>
              </div>
              <button className="buy-button" disabled={!user?.stats?.shards || user.stats.shards < 100}>
                Buy
              </button>
            </div>
          </div>
        </div>

        <div className="shop-section">
          <h3>⚡ Power-ups</h3>
          <div className="shop-items">
            <div className="shop-item">
              <div className="item-image">🔥</div>
              <div className="item-info">
                <h4>XP Booster</h4>
                <p>Double XP for 24 hours</p>
                <div className="item-price">30 💎</div>
              </div>
              <button className="buy-button" disabled={!user?.stats?.shards || user.stats.shards < 30}>
                Buy
              </button>
            </div>
            
            <div className="shop-item">
              <div className="item-image">⏰</div>
              <div className="item-info">
                <h4>Task Extension</h4>
                <p>Extra day to complete tasks</p>
                <div className="item-price">25 💎</div>
              </div>
              <button className="buy-button" disabled={!user?.stats?.shards || user.stats.shards < 25}>
                Buy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab()
      case 'tasks':
        return renderTasksTab()
      case 'inventory':
        return renderInventoryTab()
      case 'shop':
        return renderShopTab()
      default:
        return renderProfileTab()
    }
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-logo">
          <h1>GAMIF.AI</h1>
          <div className="subtitle">Player Development System</div>
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
      
      <div className="dashboard-navigation">
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="tab-icon">👤</span>
            Profile
          </button>
          <button 
            className={`nav-tab ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            <span className="tab-icon">📋</span>
            Tasks & Challenges
          </button>
          <button 
            className={`nav-tab ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <span className="tab-icon">🎒</span>
            Inventory
          </button>
          <button 
            className={`nav-tab ${activeTab === 'shop' ? 'active' : ''}`}
            onClick={() => setActiveTab('shop')}
          >
            <span className="tab-icon">🛒</span>
            Shop
          </button>
        </div>
      </div>
      
      <div className="dashboard-content">
        {renderTabContent()}
      </div>
    </div>
  )
}

export default Dashboard
