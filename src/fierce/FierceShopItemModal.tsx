import { useEffect, useState } from 'react'
import { IconClose } from './FierceIcons'

interface Props {
  onClose: () => void
  onSave: (item: {
    title: string
    description?: string
    price: number
    image?: string
    isConsumable?: boolean
    isKeyItem?: boolean
    allowMultiplePurchases?: boolean
  }) => Promise<void>
}

export default function FierceShopItemModal({ onClose, onSave }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [image, setImage] = useState('🎁')
  const [itemType, setItemType] = useState<'reward' | 'consumable' | 'key'>('reward')
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return setError('Title is required.')
    const p = parseFloat(price)
    if (isNaN(p) || p <= 0) return setError('Price must be greater than 0 — earned rewards aren\'t free.')
    if (p > 100000) return setError('Price seems unreasonable. Cap is 100,000 shards.')
    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        price: p,
        image: image || undefined,
        isConsumable: itemType === 'consumable',
        isKeyItem: itemType === 'key',
        allowMultiplePurchases: allowMultiple,
      })
    } catch {
      setError('Could not save reward.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fierce-modal-back" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="fierce-modal" role="dialog" aria-modal="true" aria-labelledby="fierce-shop-modal-title">
        <div className="fierce-modal__head">
          <div>
            <span className="fierce-eyebrow fierce-eyebrow--accent">VAULT · NEW REWARD</span>
            <div id="fierce-shop-modal-title" className="fierce-modal__title" style={{ marginTop: 4 }}>Add a reward</div>
          </div>
          <button className="fierce-icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>
        <form className="fierce-modal__body" onSubmit={handleSubmit}>
          {error && <div className="fierce-error">{error}</div>}

          <div className="fierce-field">
            <label className="fierce-field__label">Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: 4, background: 'var(--bg-muted)', borderRadius: 'var(--r-md)' }}>
              {(['reward', 'consumable', 'key'] as const).map((t) => {
                const labels = { reward: 'Reward', consumable: 'Consumable', key: 'Key' }
                const active = itemType === t
                return (
                  <button type="button" key={t} onClick={() => setItemType(t)}
                    style={{ height: 34, borderRadius: 7, fontSize: 13, fontWeight: 500, color: active ? 'var(--text-primary)' : 'var(--text-secondary)', background: active ? 'var(--bg-surface)' : 'transparent', boxShadow: active ? 'var(--shadow-xs)' : 'none', cursor: 'pointer' }}>
                    {labels[t]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="fierce-field">
            <label className="fierce-field__label" htmlFor="fs-title">Title</label>
            <input id="fs-title" className="fierce-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sushi night out" maxLength={100} autoFocus />
          </div>

          <div className="fierce-field">
            <label className="fierce-field__label" htmlFor="fs-price">Price (shards)</label>
            <input id="fs-price" className="fierce-input" type="number" min={1} step={1} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 100" />
            <span className="fierce-field__hint">Must be greater than 0 — earned rewards aren't free.</span>
          </div>

          <div className="fierce-field">
            <label className="fierce-field__label" htmlFor="fs-image">Emoji or icon</label>
            <input id="fs-image" className="fierce-input" value={image} onChange={(e) => setImage(e.target.value)} placeholder="🎁" maxLength={4} />
          </div>

          <div className="fierce-field">
            <label className="fierce-field__label" htmlFor="fs-desc">Description (optional)</label>
            <textarea id="fs-desc" className="fierce-textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this reward?" maxLength={300} />
          </div>

          <label className="fierce-row fierce-gap-2" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={allowMultiple} onChange={(e) => setAllowMultiple(e.target.checked)} />
            <span style={{ fontSize: 13 }}>Allow multiple purchases</span>
          </label>
        </form>
        <div className="fierce-modal__foot">
          <button className="fierce-btn fierce-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="fierce-btn fierce-btn--accent" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Add reward'}
          </button>
        </div>
      </div>
    </div>
  )
}
