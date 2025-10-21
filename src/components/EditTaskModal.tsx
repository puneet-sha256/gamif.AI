import React, { useState, useEffect } from 'react'
import './EditTaskModal.css'

interface EditTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (updates: { description?: string; xp?: number; shards?: number }) => Promise<void>
  taskData: {
    description: string
    xp: number
    shards: number
    category: string
  }
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ isOpen, onClose, onSave, taskData }) => {
  const [description, setDescription] = useState(taskData.description)
  const [xp, setXp] = useState(taskData.xp.toString())
  const [shards, setShards] = useState(taskData.shards.toString())
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setDescription(taskData.description)
      setXp(taskData.xp.toString())
      setShards(taskData.shards.toString())
      setError('')
    }
  }, [isOpen, taskData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!description.trim()) {
      setError('Description cannot be empty')
      return
    }

    const xpValue = parseInt(xp)
    const shardsValue = parseInt(shards)

    if (isNaN(xpValue) || xpValue < 0) {
      setError('XP must be a positive number')
      return
    }

    if (isNaN(shardsValue) || shardsValue < 0) {
      setError('Shards must be a positive number')
      return
    }

    setIsSaving(true)

    try {
      await onSave({
        description: description.trim(),
        xp: xpValue,
        shards: shardsValue
      })
      onClose()
    } catch (err) {
      setError('Failed to save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content edit-task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Task</h2>
          <button className="close-btn" onClick={handleCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="edit-task-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <input
              type="text"
              id="category"
              value={taskData.category}
              disabled
              className="form-input disabled"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              rows={3}
              placeholder="Enter task description..."
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="xp">XP Reward *</label>
              <input
                type="number"
                id="xp"
                value={xp}
                onChange={(e) => setXp(e.target.value)}
                className="form-input"
                min="0"
                placeholder="Enter XP reward..."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="shards">Shards Reward *</label>
              <input
                type="number"
                id="shards"
                value={shards}
                onChange={(e) => setShards(e.target.value)}
                className="form-input"
                min="0"
                placeholder="Enter shards reward..."
                required
              />
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-secondary"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditTaskModal
