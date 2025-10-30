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
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setPrice('')
      setImage('🎁')
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
        image: image.trim() || undefined
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
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Shop Item</h2>
          <button className="modal-close" onClick={handleCancel}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="item-title">Item Name *</label>
            <input
              id="item-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              placeholder="🎁"
              maxLength={5}
              disabled={isSaving}
            />
            <small>Use an emoji to represent this item</small>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn-cancel" 
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-save"
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
