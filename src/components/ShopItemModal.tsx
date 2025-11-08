import React, { useState, useEffect } from 'react'
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
  const [itemType, setItemType] = useState<'regular' | 'consumable' | 'key'>('regular')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setPrice('')
      setImage('🎁')
      setItemType('regular')
      setError('')
    }
  }, [isOpen])

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
        isKeyItem: itemType === 'key'
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
    setItemType('regular')
    setError('')
    onClose()
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
            <input
              id="item-image"
              type="text"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="form-input"
              placeholder="🎁"
              maxLength={5}
              disabled={isSaving}
            />
            <small className="form-hint">Use an emoji to represent this item</small>
          </div>

          <div className="form-group">
            <label htmlFor="item-type">Item Type</label>
            <select
              id="item-type"
              value={itemType}
              onChange={(e) => setItemType(e.target.value as 'regular' | 'consumable' | 'key')}
              className="form-input"
              disabled={isSaving}
            >
              <option value="regular">Regular Item</option>
              <option value="consumable">Consumable (Can be used once)</option>
              <option value="key">Key Item (Cannot be consumed)</option>
            </select>
            <small className="form-hint">
              {itemType === 'consumable' && 'This item will be removed from inventory when used'}
              {itemType === 'key' && 'This item cannot be used or removed'}
              {itemType === 'regular' && 'Standard inventory item'}
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
