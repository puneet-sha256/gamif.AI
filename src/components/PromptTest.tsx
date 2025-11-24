import React from 'react'
import { usePrompt } from '../contexts/PromptContext'
import './PromptTest.css'

const PromptTest: React.FC = () => {
  const { showPrompt } = usePrompt()

  const handleTestPrompt = async () => {
    const result = await showPrompt(
      'How many "Health Potion" would you like to buy?\n\nPrice: 100 💎 each\nYou can afford up to 5 items.',
      {
        defaultValue: '1',
        placeholder: 'Enter quantity',
        inputType: 'number',
        min: 1,
        max: 5,
        confirmText: 'Buy',
        cancelText: 'Cancel'
      }
    )
    
    if (result !== null) {
      alert(`You selected: ${result}`)
    } else {
      alert('Cancelled')
    }
  }

  return (
    <div className="prompt-test-container">
      <h1>🎯 Quantity Prompt Dialog Test</h1>
      <p>Click the button to test the styled quantity prompt dialog</p>
      <button onClick={handleTestPrompt} className="test-button">
        Test Quantity Prompt
      </button>
    </div>
  )
}

export default PromptTest
