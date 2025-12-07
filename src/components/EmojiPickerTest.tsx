import React, { useState, useRef, useEffect } from 'react'
import EmojiPicker from 'emoji-picker-react'
import type { EmojiClickData } from 'emoji-picker-react'
import './TaskModal.css'

const EmojiPickerTest: React.FC = () => {
  const [emoji, setEmoji] = useState('🎁')
  const [showPicker, setShowPicker] = useState(false)
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const pickerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current && 
        !pickerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false)
      }
    }

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPicker])

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setEmoji(emojiData.emoji)
    setShowPicker(false)
  }

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '600px', 
      margin: '0 auto',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.95))'
    }}>
      <div style={{ 
        background: '#f0f0f0', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px',
        fontFamily: 'monospace'
      }}>
        <strong>Viewport:</strong> {viewport.width}x{viewport.height}<br/>
        <strong>Mode:</strong> {viewport.width <= 600 ? 'Mobile' : viewport.width <= 768 ? 'Tablet' : 'Desktop'}<br/>
        <strong>Picker Open:</strong> {showPicker ? 'Yes' : 'No'}
      </div>

      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: '#3b82f6' }}>Emoji Picker Responsiveness Test</h2>
        
        <div className="form-group">
          <label htmlFor="emoji-input">Emoji/Icon</label>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
              <input
                id="emoji-input"
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="form-input"
                placeholder="🎁"
                maxLength={5}
                style={{ flex: 1 }}
              />
              <button
                ref={buttonRef}
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                className="btn btn-secondary emoji-picker-btn"
                style={{ fontSize: '1.2rem' }}
                title="Pick an emoji"
              >
                😀
              </button>
            </div>
            {showPicker && (
              <>
                {/* Backdrop for mobile view */}
                <div 
                  className="emoji-picker-backdrop"
                  onClick={() => setShowPicker(false)}
                />
                <div 
                  ref={pickerRef}
                  className="emoji-picker-container"
                >
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    searchPlaceHolder="Search emoji..."
                    width="100%"
                    height={400}
                    skinTonesDisabled
                    previewConfig={{ showPreview: false }}
                    searchDisabled={false}
                    lazyLoadEmojis={true}
                  />
                </div>
              </>
            )}
          </div>
          <small className="form-hint">
            Test: Click emoji button at different viewport sizes
          </small>
        </div>

        <div style={{ 
          marginTop: '30px', 
          padding: '15px', 
          background: '#f8f9fa',
          borderRadius: '8px',
          fontSize: '0.9rem'
        }}>
          <strong>Test Instructions:</strong>
          <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
            <li>Desktop (&gt;768px): Picker appears below button, 350px wide</li>
            <li>Tablet (601-768px): Picker appears below button, 320px wide</li>
            <li>Mobile (≤600px): Picker appears centered with backdrop</li>
            <li>Resize window to test all breakpoints</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default EmojiPickerTest
