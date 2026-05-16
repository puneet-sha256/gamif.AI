import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { IconClose } from './FierceIcons'

type Category = 'Strength' | 'Intelligence' | 'Charisma'

interface Props {
  taskData: any | null
  onClose: () => void
}

export default function FierceTaskModal({ taskData, onClose }: Props) {
  const isEdit = !!taskData
  const { addUserTask, editGeneratedTask } = useAuth()

  const [title, setTitle] = useState(taskData?.title || '')
  const [description, setDescription] = useState(taskData?.description || '')
  const [category, setCategory] = useState<Category>((taskData?.category as Category) || 'Strength')
  const [duration, setDuration] = useState(String(taskData?.expected_duration_minutes || 30))
  const [xp, setXp] = useState(String(taskData?.xp || 25))
  const [shards, setShards] = useState(String(taskData?.shards || 5))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate all fields at once so the user sees the full picture, not a 5-step parade.
    const errors: string[] = []
    if (!isEdit && !title.trim()) errors.push('Title is required for new missions.')
    if (!description.trim()) errors.push('Description is required.')
    const dur = parseInt(duration)
    const x = parseInt(xp)
    const s = parseInt(shards)
    if (isNaN(dur) || dur < 1) errors.push('Duration must be at least 1 minute.')
    else if (dur > 480) errors.push('Duration cannot exceed 480 minutes (8 hours).')
    if (isNaN(x) || x < 0) errors.push('XP must be a positive number.')
    else if (x > 1000) errors.push('XP reward cannot exceed 1,000.')
    if (isNaN(s) || s < 0) errors.push('Shards must be a positive number.')
    else if (s > 1000) errors.push('Shards reward cannot exceed 1,000.')
    if (errors.length) return setError(errors.join('\n'))

    setIsSaving(true)
    try {
      if (isEdit) {
        const ok = await editGeneratedTask(taskData.id, taskData.category as Category, {
          title: title.trim(),
          description: description.trim(),
          expected_duration_minutes: dur,
          xp: x,
          shards: s,
        })
        if (ok) onClose()
        else setError('Failed to save changes.')
      } else {
        const ok = await addUserTask({
          title: title.trim(),
          description: description.trim(),
          category,
          expected_duration_minutes: dur,
          xp: x,
          shards: s,
        })
        if (ok) onClose()
        else setError('Failed to add mission.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fierce-modal-back" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="fierce-modal" role="dialog" aria-modal="true" aria-labelledby="fierce-task-modal-title">
        <div className="fierce-modal__head">
          <div>
            <span className="fierce-eyebrow fierce-eyebrow--accent">{isEdit ? 'EDIT MISSION' : 'NEW MISSION'}</span>
            <div id="fierce-task-modal-title" className="fierce-modal__title" style={{ marginTop: 4 }}>
              {isEdit ? 'Edit mission' : 'Add custom mission'}
            </div>
          </div>
          <button className="fierce-icon-btn" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        <form className="fierce-modal__body" onSubmit={handleSubmit}>
          {error && (
            <div className="fierce-error">
              {(() => {
                const lines = error.split('\n')
                if (lines.length === 1) return lines[0]
                return lines.map((line, i) => <div key={i}>• {line}</div>)
              })()}
            </div>
          )}

          <div className="fierce-field">
            <label className="fierce-field__label">Category</label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 6,
                padding: 4,
                background: 'var(--bg-muted)',
                borderRadius: 'var(--r-md)',
              }}
            >
              {(['Strength', 'Intelligence', 'Charisma'] as Category[]).map((c) => {
                const dotColor = { Strength: '#ff5e2e', Intelligence: '#06d6f4', Charisma: '#ec4899' }[c]
                const active = category === c
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => !isEdit && setCategory(c)}
                    disabled={isEdit}
                    style={{
                      height: 34,
                      borderRadius: 7,
                      fontSize: 13,
                      fontWeight: 500,
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: active ? 'var(--bg-surface)' : 'transparent',
                      boxShadow: active ? 'var(--shadow-xs)' : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      cursor: isEdit ? 'not-allowed' : 'pointer',
                      opacity: isEdit && !active ? 0.5 : 1,
                    }}
                  >
                    <span className="fierce-dot" style={{ color: dotColor }} />
                    {c}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="fierce-field">
            <label className="fierce-field__label" htmlFor="ft-title">
              Title {isEdit ? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· optional</span> : '(adds custom tag)'}
            </label>
            <input
              id="ft-title"
              className="fierce-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isEdit ? '' : 'e.g. Morning run'}
              maxLength={100}
            />
            {isEdit && !title && (
              <span className="fierce-field__hint">AI-generated missions don't have a title by default. Leave blank to keep it that way.</span>
            )}
          </div>

          <div className="fierce-field">
            <label className="fierce-field__label" htmlFor="ft-desc">Description</label>
            <textarea id="ft-desc" className="fierce-textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this mission involve?" maxLength={500} />
          </div>

          <div className="fierce-field">
            <label className="fierce-field__label" htmlFor="ft-dur">Estimated duration (minutes)</label>
            <input id="ft-dur" className="fierce-input" type="number" min={1} max={480} value={duration} onChange={(e) => setDuration(e.target.value)} />
            <span className="fierce-field__hint">More effort earns bonus rewards (up to 5×).</span>
          </div>

          <div className="fierce-grid fierce-grid--2">
            <div className="fierce-field">
              <label className="fierce-field__label" htmlFor="ft-xp">XP reward</label>
              <input id="ft-xp" className="fierce-input" type="number" min={0} max={1000} value={xp} onChange={(e) => setXp(e.target.value)} />
            </div>
            <div className="fierce-field">
              <label className="fierce-field__label" htmlFor="ft-sh">Shards reward</label>
              <input id="ft-sh" className="fierce-input" type="number" min={0} max={1000} value={shards} onChange={(e) => setShards(e.target.value)} />
            </div>
          </div>
        </form>
        <div className="fierce-modal__foot">
          <button className="fierce-btn fierce-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="fierce-btn fierce-btn--accent" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Add mission'}
          </button>
        </div>
      </div>
    </div>
  )
}
