import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAlert } from '../contexts/AlertContext'
import { useConfirm } from '../contexts/ConfirmContext'
import FierceLogo from './FierceLogo'
import FierceThemeToggle from './FierceThemeToggle'
import FierceOverview from './FierceOverview'
import FierceTasks from './FierceTasks'
import FierceLoadout from './FierceLoadout'
import FierceVault from './FierceVault'
import FierceRewardModal from './FierceRewardModal'
import FierceTaskModal from './FierceTaskModal'
import FierceActivityModal from './FierceActivityModal'
import { IconHome, IconChecklist, IconBag, IconCart, IconBell } from './FierceIcons'
import { userDatabase } from '../client/services/fileUserDatabase'
import { aiService } from '../client/services/aiService'
import { hasGeneratedTasks } from '../utils/taskMapping'

type TabType = 'overview' | 'tasks' | 'loadout' | 'vault'

interface FierceDashboardProps {
  onLogout: () => void
}

export default function FierceDashboard({ onLogout }: FierceDashboardProps) {
  const { user, logout, refreshUserTasks } = useAuth()
  const { showError } = useAlert()
  const { showConfirm } = useConfirm()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [showRewardModal, setShowRewardModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)

  // Generate tasks if user has goals but no tasks yet (mirrors the legacy Dashboard)
  useEffect(() => {
    const generate = async () => {
      if (
        user &&
        user.goalsData &&
        user.profileData &&
        !hasGeneratedTasks(user.generatedTasks)
      ) {
        setIsLoadingTasks(true)
        const sessionId = userDatabase.getSessionId()
        if (sessionId) {
          try {
            await aiService.generateTasks(sessionId, user.goalsData, user.profileData)
            await refreshUserTasks()
          } catch (e) {
            console.error('FierceDashboard: failed to generate tasks', e)
          } finally {
            setIsLoadingTasks(false)
          }
        }
      }
    }
    generate()
  }, [user?.id, user?.goalsData, user?.profileData])

  const handleLogout = async () => {
    const ok = await showConfirm('Sign out of Gamif.AI?', 'Sign out', 'Cancel')
    if (!ok) return
    try {
      await logout()
      onLogout()
    } catch (e) {
      showError('Logout failed. Try again.')
    }
  }

  const profileData = user?.profileData
  const initials = profileData?.name
    ? profileData.name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()
    : 'GA'

  const unclaimedCount = user?.unclaimedRewards?.activities?.length || 0

  if (!user) {
    return (
      <div className="fierce-app" data-theme="dark">
        <div className="fierce-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div className="fierce-app">
      <div className="fierce-page fierce-page--has-bottomnav">
        <header className="fierce-appbar fierce-appbar--shell">
          <div className="fierce-appbar__inner">
            <FierceLogo />
            <div className="fierce-appbar__right">
              <button
                className="fierce-bell"
                onClick={() => setShowRewardModal(true)}
                aria-label="Unclaimed rewards"
              >
                <IconBell />
                <span className="fierce-bell__hide-text-mobile">Unclaimed rewards</span>
                {unclaimedCount > 0 && <span className="fierce-bell__badge">{unclaimedCount}</span>}
              </button>
              <button
                className="fierce-avatar"
                title={profileData?.name || 'Profile'}
                onClick={handleLogout}
                aria-label="Profile and logout"
              >
                {initials}
              </button>
            </div>
          </div>
        </header>

        <nav className="fierce-subnav" aria-label="Dashboard sections">
          <div className="fierce-subnav__inner">
            <SubnavBtn label="Overview" icon={<IconHome />} active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
            <SubnavBtn label="Tasks" icon={<IconChecklist />} active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
            <SubnavBtn label="Loadout" icon={<IconBag />} active={activeTab === 'loadout'} onClick={() => setActiveTab('loadout')} />
            <SubnavBtn label="Vault" icon={<IconCart />} active={activeTab === 'vault'} onClick={() => setActiveTab('vault')} />
          </div>
        </nav>

        <main style={{ flex: 1 }}>
          {activeTab === 'overview' && (
            <FierceOverview
              onLogActivityClick={() => setShowActivityModal(true)}
              onRegenerate={async () => {
                if (!user.goalsData || !user.profileData) return
                setIsLoadingTasks(true)
                const sessionId = userDatabase.getSessionId()
                if (sessionId) {
                  try {
                    await aiService.generateTasks(sessionId, user.goalsData, user.profileData)
                    await refreshUserTasks()
                  } catch (e) {
                    showError('Could not regenerate plan. Try again.')
                  } finally {
                    setIsLoadingTasks(false)
                  }
                }
              }}
            />
          )}
          {activeTab === 'tasks' && (
            <FierceTasks
              isLoading={isLoadingTasks}
              onAddTask={() => {
                setEditingTask(null)
                setShowTaskModal(true)
              }}
              onEditTask={(task) => {
                setEditingTask(task)
                setShowTaskModal(true)
              }}
              onLogActivity={() => setShowActivityModal(true)}
              onRegenerate={async () => {
                if (!user.goalsData || !user.profileData) return
                setIsLoadingTasks(true)
                const sessionId = userDatabase.getSessionId()
                if (sessionId) {
                  try {
                    await aiService.generateTasks(sessionId, user.goalsData, user.profileData)
                    await refreshUserTasks()
                  } catch (e) {
                    showError('Could not regenerate plan. Try again.')
                  } finally {
                    setIsLoadingTasks(false)
                  }
                }
              }}
            />
          )}
          {activeTab === 'loadout' && <FierceLoadout />}
          {activeTab === 'vault' && <FierceVault />}
        </main>

        <nav className="fierce-bottomnav" aria-label="Mobile dashboard sections">
          <BottomBtn label="Overview" icon={<IconHome />} active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <BottomBtn label="Tasks" icon={<IconChecklist />} active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
          <BottomBtn label="Loadout" icon={<IconBag />} active={activeTab === 'loadout'} onClick={() => setActiveTab('loadout')} />
          <BottomBtn label="Vault" icon={<IconCart />} active={activeTab === 'vault'} onClick={() => setActiveTab('vault')} />
        </nav>

        <FierceThemeToggle />

        {showRewardModal && (
          <FierceRewardModal
            onClose={() => setShowRewardModal(false)}
          />
        )}
        {showTaskModal && (
          <FierceTaskModal
            taskData={editingTask}
            onClose={() => {
              setShowTaskModal(false)
              setEditingTask(null)
            }}
          />
        )}
        {showActivityModal && (
          <FierceActivityModal
            onClose={() => setShowActivityModal(false)}
          />
        )}
      </div>
    </div>
  )
}

function SubnavBtn({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`fierce-subnav__btn${active ? ' fierce-subnav__btn--active' : ''}`}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      {icon}
      {label}
    </button>
  )
}

function BottomBtn({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`fierce-bottomnav__btn${active ? ' fierce-bottomnav__btn--active' : ''}`}
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      {icon}
      {label}
    </button>
  )
}
