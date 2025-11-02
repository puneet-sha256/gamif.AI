import { useAlert } from '../contexts/AlertContext'
import './AlertTest.css'

const AlertTest: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo } = useAlert()

  const handleSuccessClick = () => {
    showSuccess('🎉 Great job! You\'ve earned rewards from 3 activities.\n\nClick the "Unclaimed Rewards" button to view and claim them!')
  }

  const handleErrorClick = () => {
    showError('Failed to delete task. Please try again.')
  }

  const handleWarningClick = () => {
    showWarning('Rewards claimed successfully, but there was an issue clearing the unclaimed rewards. Please refresh the page.')
  }

  const handleInfoClick = () => {
    showInfo('No activities were identified in your update that match your goals.')
  }

  const handleSessionExpiredClick = () => {
    showError('Session expired. Please log in again.')
  }

  const handleRewardClaimClick = () => {
    showSuccess('🎉 Congratulations!\n\nYou\'ve claimed:\n+250 XP\n+50 Shards\n\nKeep up the great work!')
  }

  return (
    <div className="alert-test-container">
      <div className="alert-test-header">
        <h1>Custom Alert System Test</h1>
        <p>Click the buttons below to test different alert types with actual messages from the app</p>
      </div>

      <div className="alert-test-content">
        <div className="test-section">
          <h2>Success Alerts</h2>
          <button className="test-btn success" onClick={handleSuccessClick}>
            Activity Rewards Earned
          </button>
          <button className="test-btn success" onClick={handleRewardClaimClick}>
            Rewards Claimed
          </button>
        </div>

        <div className="test-section">
          <h2>Error Alerts</h2>
          <button className="test-btn error" onClick={handleErrorClick}>
            Delete Task Failed
          </button>
          <button className="test-btn error" onClick={handleSessionExpiredClick}>
            Session Expired
          </button>
        </div>

        <div className="test-section">
          <h2>Warning Alerts</h2>
          <button className="test-btn warning" onClick={handleWarningClick}>
            Partial Success
          </button>
        </div>

        <div className="test-section">
          <h2>Info Alerts</h2>
          <button className="test-btn info" onClick={handleInfoClick}>
            No Activities Identified
          </button>
        </div>
      </div>
    </div>
  )
}

export default AlertTest
