import React, { useState, useEffect, useRef } from 'react'
import EmojiPicker from 'emoji-picker-react'
import type { EmojiClickData } from 'emoji-picker-react'
import './TaskModal.css' // Reuse the same styles

interface ShopItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    title: string
    description?: string
    price: number
    image?: string
    isConsumable?: boolean
    isKeyItem?: boolean
    allowMultiplePurchases?: boolean
  }) => Promise<void>
}

const ShopItemModal: React.FC<ShopItemModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [image, setImage] = useState('🎁')
  const [itemType, setItemType] = useState<'consumable' | 'key'>('consumable')
  const [allowMultiplePurchases, setAllowMultiplePurchases] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setPrice('')
      setImage('🎁')
      setItemType('consumable')
      setAllowMultiplePurchases(false)
      setError('')
      setShowEmojiPicker(false)
    }
  }, [isOpen])

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current && 
        !emojiPickerRef.current.contains(event.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!title.trim()) {
      setError('Item name cannot be empty')
      return
    }

    const priceValue = parseInt(price)

    if (isNaN(priceValue) || priceValue < 0) {
      setError('Price must be a positive number')
      return
    }

    setIsSaving(true)

    try {
      const saveData = {
        title: title.trim(),
        description: description.trim() || undefined,
        price: priceValue,
        image: image.trim() || undefined,
        isConsumable: itemType === 'consumable',
        isKeyItem: itemType === 'key',
        allowMultiplePurchases: allowMultiplePurchases
      }
      
      await onSave(saveData)
      handleCancel()
    } catch (err) {
      setError('Failed to add shop item. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setTitle('')
    setDescription('')
    setPrice('')
    setImage('🎁')
    setItemType('consumable')
    setAllowMultiplePurchases(false)
    setError('')
    setShowEmojiPicker(false)
    onClose()
  }

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setImage(emojiData.emoji)
    setShowEmojiPicker(false)
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Shop Item</h2>
          <button className="close-btn" onClick={handleCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="item-title">Item Name *</label>
            <input
              id="item-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              placeholder="e.g., Movie Night, New Gadget, Spa Day"
              autoFocus
              disabled={isSaving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="item-description">Description (Optional)</label>
            <textarea
              id="item-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              placeholder="Add details about this item..."
              rows={3}
              disabled={isSaving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="item-price">Price (Shards) *</label>
            <input
              id="item-price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="form-input"
              placeholder="0"
              min="0"
              disabled={isSaving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="item-image">Emoji/Icon (Optional)</label>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                <input
                  id="item-image"
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="form-input"
                  placeholder="🎁"
                  maxLength={5}
                  disabled={isSaving}
                  style={{ flex: 1 }}
                />
                <button
                  ref={emojiButtonRef}
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  disabled={isSaving}
                  className="btn btn-secondary emoji-picker-btn"
                  style={{ fontSize: '1.2rem' }}
                  title="Pick an emoji"
                >
                  😀
                </button>
              </div>
              {showEmojiPicker && (
                <>
                  {/* Backdrop for mobile view */}
                  <div 
                    className="emoji-picker-backdrop"
                    onClick={() => setShowEmojiPicker(false)}
                  />
                  <div 
                    ref={emojiPickerRef}
                    className="emoji-picker-container"
                  >
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      searchPlaceHolder="Search emoji..."
                      width="100%"
                      height={400}
                    />
                  </div>
                </>
              )}
            </div>
            <small className="form-hint">Use an emoji to represent this item</small>
          </div>

          <div className="form-group">
            <label htmlFor="item-type">Item Type</label>
            <select
              id="item-type"
              value={itemType}
              onChange={(e) => setItemType(e.target.value as 'consumable' | 'key')}
              className="form-input"
              disabled={isSaving}
            >
              <option value="consumable">Consumable (Can be used once)</option>
              <option value="key">Key Item (Cannot be consumed)</option>
            </select>
            <small className="form-hint">
              {itemType === 'consumable' && 'This item will be removed from inventory when used'}
              {itemType === 'key' && 'This item cannot be used or removed'}
            </small>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={allowMultiplePurchases}
                onChange={(e) => setAllowMultiplePurchases(e.target.checked)}
                disabled={isSaving}
              />
              <span>Allow multiple purchases</span>
            </label>
            <small className="form-hint">
              If checked, this item will remain in the shop after purchase and can be bought multiple times
            </small>
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ShopItemModal
