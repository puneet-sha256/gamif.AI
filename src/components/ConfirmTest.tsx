import React from 'react'
import { useConfirm } from '../contexts/ConfirmContext'
import './ConfirmTest.css'

const ConfirmTest: React.FC = () => {
  const { showConfirm } = useConfirm()

  const handleDeleteTask = async () => {
    const confirmed = await showConfirm(
      'Are you sure you want to delete this task?\n\n"Complete 50 push-ups"',
      'Delete',
      'Cancel'
    )
    console.log('Delete task confirmed:', confirmed)
  }

  const handleBuyItem = async () => {
    const confirmed = await showConfirm(
      'Are you sure you want to buy "Legendary Sword" for 500 💎 shards?\n\nYou currently have 1000 💎 shards.',
      'Buy',
      'Cancel'
    )
    console.log('Buy item confirmed:', confirmed)
  }

  const handleDeleteShopItem = async () => {
    const confirmed = await showConfirm(
      'Are you sure you want to delete this item?',
      'Delete',
      'Cancel'
    )
    console.log('Delete shop item confirmed:', confirmed)
  }

  return (
    <div className="confirm-test-container">
      <div className="confirm-test-header">
        <h1>Custom Confirmation Dialog Test</h1>
        <p>Click the buttons below to test different confirmation dialogs from the app</p>
      </div>

      <div className="confirm-test-content">
        <div className="test-section">
          <h2>Task Operations</h2>
          <button className="test-btn delete" onClick={handleDeleteTask}>
            Delete Task Confirmation
          </button>
        </div>

        <div className="test-section">
          <h2>Shop Operations</h2>
          <button className="test-btn buy" onClick={handleBuyItem}>
            Buy Item Confirmation
          </button>
          <button className="test-btn delete" onClick={handleDeleteShopItem}>
            Delete Shop Item Confirmation
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmTest
