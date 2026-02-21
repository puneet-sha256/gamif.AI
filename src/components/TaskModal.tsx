import React, { useState, useEffect } from 'react'
import './TaskModal.css'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    title?: string
    description: string
    category?: 'Strength' | 'Intelligence' | 'Charisma'
    expected_duration_minutes?: number
    xp: number
    shards: number
  }) => Promise<void>
  taskData?: {
    title?: string
    description: string
    expected_duration_minutes?: number
    xp: number
    shards: number
    category: string
  } | null // null = add mode, object = edit mode
  initialCategory?: 'Strength' | 'Intelligence' | 'Charisma' // For add mode
}

const TaskModal: React.FC<TaskModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  taskData = null,
  initialCategory = 'Strength'
}) => {
  const isEditMode = taskData !== null
  
  const [title, setTitle] = useState(taskData?.title || '')
  const [description, setDescription] = useState(taskData?.description || '')
  const [category, setCategory] = useState<'Strength' | 'Intelligence' | 'Charisma'>(
    taskData?.category as any || initialCategory
  )
  const [duration, setDuration] = useState(taskData?.expected_duration_minutes?.toString() || '30')
  const [xp, setXp] = useState(taskData?.xp.toString() || '25')
  const [shards, setShards] = useState(taskData?.shards.toString() || '50')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setTitle(taskData?.title || '')
      setDescription(taskData?.description || '')
      setCategory(taskData?.category as any || initialCategory)
      setDuration(taskData?.expected_duration_minutes?.toString() || '30')
      setXp(taskData?.xp.toString() || '25')
      setShards(taskData?.shards.toString() || '50')
      setError('')
    }
  }, [isOpen, taskData, initialCategory])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!description.trim()) {
      setError('Description cannot be empty')
      return
    }

    const durationValue = parseInt(duration)
    const xpValue = parseInt(xp)
    const shardsValue = parseInt(shards)

    if (isNaN(durationValue) || durationValue < 1) {
      setError('Duration must be at least 1 minute')
      return
    }

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
      const saveData: any = {
        description: description.trim(),
        expected_duration_minutes: durationValue,
        xp: xpValue,
        shards: shardsValue
      }
      
      // Always include title field (can be empty string or filled)
      // This allows editing/clearing title on existing tasks
      saveData.title = title.trim()
      
      // Include category for add mode
      if (!isEditMode) {
        saveData.category = category
      }
      
      await onSave(saveData)
      handleCancel()
    } catch (err) {
      setError(isEditMode ? 'Failed to update task. Please try again.' : 'Failed to add task. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setError('')
    setTitle('')
    setDescription('')
    setCategory('Strength')
    setDuration('30')
    setXp('25')
    setShards('50')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditMode ? 'Edit Task' : 'Add Custom Task'}</h2>
          <button className="close-btn" onClick={handleCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="category">Category *</label>
            {isEditMode ? (
              <input
                type="text"
                id="category"
                value={taskData?.category || ''}
                disabled
                className="form-input disabled"
              />
            ) : (
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as 'Strength' | 'Intelligence' | 'Charisma')}
                className="form-select"
                required
              >
                <option value="Strength">💪 Strength</option>
                <option value="Intelligence">🧠 Intelligence</option>
                <option value="Charisma">🎭 Charisma</option>
              </select>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="title">
              Task Title {!isEditMode && '(Optional for custom tasks)'}
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              placeholder="e.g., Morning Workout"
              maxLength={100}
            />
            {!isEditMode && (
              <small className="form-hint">
                💡 Adding a title marks this as your custom task
              </small>
            )}
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
              maxLength={500}
            />
          </div>

          <div className="form-group">
            <label htmlFor="duration">Est. Duration (minutes) *</label>
            <input
              type="number"
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="form-input"
              min="1"
              max="480"
              placeholder="30"
              required
            />
            <small className="form-hint">
              Time needed for full XP. More effort earns bonus rewards (up to 5x).
            </small>
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
                max="1000"
                placeholder="25"
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
                max="1000"
                placeholder="50"
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
              {isSaving ? (isEditMode ? 'Saving...' : 'Adding...') : (isEditMode ? 'Save Changes' : 'Add Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TaskModal
