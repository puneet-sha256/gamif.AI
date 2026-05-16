import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAlert } from '../contexts/AlertContext'
import { useConfirm } from '../contexts/ConfirmContext'
import FierceShopItemModal from './FierceShopItemModal'
import { IconPlus, IconShard, IconArrowRight } from './FierceIcons'
import { formatShards } from './formatShards'

type FilterKey = 'all' | 'affordable' | 'locked'

export default function FierceVault() {
  const { user, addShopItem, deleteShopItem, buyShopItem, getShopItems } = useAuth()
  const { showSuccess, showError } = useAlert()
  const { showConfirm } = useConfirm()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [showAddModal, setShowAddModal] = useState(false)

  const items = getShopItems() || []
  const shards = user?.stats?.shards || 0

  const affordable = items.filter((i) => i.price <= shards)
  const locked = items.filter((i) => i.price > shards)

  const visible =
    filter === 'affordable' ? affordable : filter === 'locked' ? locked : items

  const handleBuy = async (item: any) => {
    const ok = await showConfirm(
      `Claim "${item.title}" for ${formatShards(item.price)} ◆?\n\nYou have ${formatShards(shards)} ◆.`,
      'Claim',
      'Cancel'
    )
    if (!ok) return
    const success = await buyShopItem(item.id, item.price, {
      title: item.title,
      description: item.description,
      image: item.image,
      isConsumable: item.isConsumable,
      isKeyItem: item.isKeyItem,
      allowMultiplePurchases: item.allowMultiplePurchases,
    })
    if (success) showSuccess(`🔥 Claimed: ${item.title}`)
    else showError('Could not claim — check your shard balance.')
  }

  const handleDelete = async (id: string) => {
    const ok = await showConfirm('Delete this reward?', 'Delete', 'Cancel')
    if (ok) {
      const success = await deleteShopItem(id)
      if (!success) showError('Failed to delete reward.')
    }
  }

  const handleAdd = async (item: { title: string; description?: string; price: number; image?: string }) => {
    const success = await addShopItem(item)
    if (success) {
      setShowAddModal(false)
    } else {
      throw new Error('add failed')
    }
  }

  const totalSpent = (() => {
    // Estimate from inventory total cost (price * count); fallback to 0
    const inv = user?.inventory || []
    return inv.reduce((sum, i) => sum + (i.price || 0) * (i.count || 1), 0)
  })()

  return (
    <div className="fierce-shell" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <div className="fierce-page-head">
        <div>
          <span className="fierce-eyebrow fierce-eyebrow--accent">REWARD VAULT</span>
          <h1>Spend what you've <span className="fierce-ember-text">earned.</span></h1>
          <p>Spoils for the disciplined. Pick rewards that pull you forward.</p>
        </div>
        <button className="fierce-btn fierce-btn--fierce" onClick={() => setShowAddModal(true)}>
          <IconPlus /> Add reward
        </button>
      </div>

      {/* Wallet hero */}
      <section className="fierce-wallet fierce-mb-6">
        <div className="fierce-wallet__head">
          <span className="fierce-eyebrow" style={{ color: 'rgba(255,255,255,0.55)' }}>YOUR BALANCE</span>
        </div>
        <div className="fierce-wallet__num">
          <IconShard className="fierce-wallet__num-shard fierce-shard" />
          <span className="fierce-wallet__num-val">{formatShards(shards)}</span>
          <span className="fierce-wallet__num-unit">SHARDS</span>
        </div>
        <div className="fierce-wallet__foot">
          <span><strong>{totalSpent.toFixed(0)}</strong> spent total</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <span><strong>{items.length}</strong> rewards in vault</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <span><strong>{affordable.length}</strong> ready to claim</span>
        </div>
      </section>

      {/* Filters */}
      <div className="fierce-row fierce-gap-2 fierce-mb-4" style={{ flexWrap: 'wrap' }}>
        <button className={`fierce-chip${filter === 'all' ? ' fierce-chip--on' : ''}`} onClick={() => setFilter('all')}>
          All <span className="fierce-chip__count">{items.length}</span>
        </button>
        <button className={`fierce-chip${filter === 'affordable' ? ' fierce-chip--on' : ''}`} onClick={() => setFilter('affordable')}>
          Affordable <span className="fierce-chip__count">{affordable.length}</span>
        </button>
        <button className={`fierce-chip${filter === 'locked' ? ' fierce-chip--on' : ''}`} onClick={() => setFilter('locked')}>
          Locked <span className="fierce-chip__count">{locked.length}</span>
        </button>
      </div>

      {/* Grid */}
      <section className="fierce-section-head">
        <div className="fierce-section-head__left">
          <span className="fierce-rule-accent" />
          <span className="fierce-section-head__title">Your Wishlist</span>
          <span className="fierce-section-head__count">{visible.length}</span>
        </div>
        <span className="fierce-section-head__sub">SPEND ONLY ON WHAT MATTERS</span>
      </section>

      {visible.length === 0 ? (
        <div
          style={{
            border: '1px dashed var(--border-strong)',
            borderRadius: 'var(--r-md)',
            padding: '40px 24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          {filter === 'locked'
            ? 'Nothing locked. Add bigger rewards.'
            : filter === 'affordable'
            ? 'Earn more shards to unlock rewards here.'
            : 'Your vault is empty. Add a reward worth chasing.'}
        </div>
      ) : (
        <div className="fierce-grid fierce-grid--3">
          {visible.map((item) => (
            <RewardCard
              key={item.id}
              item={item}
              shards={shards}
              onBuy={() => handleBuy(item)}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <FierceShopItemModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAdd}
        />
      )}
    </div>
  )
}

function RewardCard({
  item,
  shards,
  onBuy,
  onDelete,
}: {
  item: any
  shards: number
  onBuy: () => void
  onDelete: () => void
}) {
  const canAfford = shards >= item.price
  const progress = Math.min(100, (shards / item.price) * 100)
  const remaining = Math.max(0, item.price - shards)

  // Pick gradient based on item title hash
  const palettes = [
    { glow: 'rgba(255, 122, 24, 0.36)', color: '#ff7a18' },
    { glow: 'rgba(132, 204, 22, 0.32)', color: '#84cc16' },
    { glow: 'rgba(6, 214, 244, 0.28)', color: '#06d6f4' },
    { glow: 'rgba(236, 72, 153, 0.28)', color: '#ec4899' },
    { glow: 'rgba(250, 204, 21, 0.28)', color: '#facc15' },
  ]
  const palette = palettes[Math.abs((item.title || '').length) % palettes.length]

  const isEmoji = item.image && /\p{Emoji}/u.test(item.image)

  return (
    <div
      className={`fierce-reward-card${canAfford && item.price > 0 ? ' fierce-reward-card--featured' : ''}`}
      data-locked={!canAfford}
      style={{ ['--art-glow' as any]: palette.glow, ['--art-color' as any]: palette.color }}
    >
      <div className="fierce-reward-card__art">
        {canAfford && <span className="fierce-reward-card__pin">UNLOCKED</span>}
        {!canAfford && <span className="fierce-reward-card__pin fierce-reward-card__pin--locked">LOCKED</span>}
        <button
          className="fierce-reward-card__delete"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          aria-label={`Delete ${item.title}`}
          title="Delete reward"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
        <span style={{ fontSize: 56, position: 'relative' }}>
          {isEmoji ? item.image : '🎁'}
          {!canAfford && (
            <span
              style={{
                position: 'absolute',
                bottom: -6,
                right: -10,
                fontSize: 24,
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))',
              }}
              aria-hidden
            >
              🔒
            </span>
          )}
        </span>
      </div>
      <div className="fierce-reward-card__body">
        <span className="fierce-reward-card__cat">
          {item.isKeyItem ? 'KEY ITEM' : item.isConsumable ? 'CONSUMABLE' : 'REWARD'}
          {!canAfford && ' · LOCKED'}
        </span>
        <h4 className="fierce-reward-card__title">{item.title}</h4>
        <p className="fierce-reward-card__desc">{item.description || 'Custom reward'}</p>
        {canAfford ? (
          <div className="fierce-reward-card__foot">
            <span className="fierce-price">
              <IconShard className="fierce-price__shard" />
              <span className="fierce-price__num">{Math.round(item.price).toLocaleString()}</span>
            </span>
            <button className="fierce-buy-btn" onClick={onBuy}>
              Claim <IconArrowRight />
            </button>
          </div>
        ) : (
          <div className="fierce-reward-card__foot" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
            <div className="fierce-row fierce-row--between">
              <span className="fierce-price">
                <IconShard className="fierce-price__shard" style={{ opacity: 0.65 }} />
                <span className="fierce-price__num" style={{ color: 'var(--text-muted)' }}>
                  {Math.round(item.price).toLocaleString()}
                </span>
              </span>
              <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                {Math.round(remaining).toLocaleString()} TO GO
              </span>
            </div>
            <div className="fierce-hud-bar">
              <div className="fierce-hud-bar__fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
