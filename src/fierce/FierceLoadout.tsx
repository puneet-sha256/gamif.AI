import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAlert } from '../contexts/AlertContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { IconBolt, IconStar, IconArrowRight } from './FierceIcons'

type FilterKey = 'all' | 'key' | 'consumable' | 'trophy'

export default function FierceLoadout() {
  const { user, useInventoryItem } = useAuth()
  const { showSuccess, showError } = useAlert()
  const { showConfirm } = useConfirm()
  const [filter, setFilter] = useState<FilterKey>('all')

  const items = user?.inventory || []
  const keys = items.filter((i) => i.isKeyItem)
  const consumables = items.filter((i) => i.isConsumable)
  const trophies = items.filter((i) => !i.isKeyItem && !i.isConsumable)

  const counts = { total: items.length, key: keys.length, consumable: consumables.length, trophy: trophies.length }

  const handleUse = async (id: string, title: string) => {
    const ok = await showConfirm(
      `Deploy "${title}"?\n\nThis item will be consumed.`,
      'Deploy',
      'Cancel'
    )
    if (ok) {
      const success = await useInventoryItem(id)
      if (success) showSuccess(`Deployed ${title}.`)
      else showError('Failed to use item.')
    }
  }

  if (items.length === 0) {
    return (
      <div className="fierce-shell" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="fierce-page-head">
          <div>
            <span className="fierce-eyebrow fierce-eyebrow--accent">ARMORY</span>
            <h1>Your loadout.</h1>
            <p>What you've earned with shards. Use it when it counts.</p>
          </div>
        </div>
        <div
          className="fierce-mt-6"
          style={{
            border: '1px dashed var(--border-strong)',
            borderRadius: 'var(--r-md)',
            padding: '64px 24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(255,48,48,0.18), rgba(255,122,24,0.18))',
              border: '1px solid rgba(255,122,24,0.32)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#ff7a18" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7h18l-2 12H5z" />
              <path d="M8 7V5a4 4 0 0 1 8 0v2" />
            </svg>
          </div>
          <div style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '-0.015em' }}>
            Empty for now
          </div>
          <p style={{ maxWidth: 340, fontSize: 13.5, lineHeight: 1.5 }}>
            Crush missions → earn shards → claim rewards in the Vault. Your gear lands here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fierce-shell" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <div className="fierce-page-head">
        <div>
          <span className="fierce-eyebrow fierce-eyebrow--accent">ARMORY</span>
          <h1>Your loadout.</h1>
          <p>{counts.total} items earned the hard way. Use them when it counts.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="fierce-row fierce-gap-2 fierce-mb-4" style={{ flexWrap: 'wrap' }}>
        <Chip active={filter === 'all'} count={counts.total} label="All" onClick={() => setFilter('all')} />
        <Chip active={filter === 'key'} count={counts.key} label="Key" onClick={() => setFilter('key')} />
        <Chip active={filter === 'consumable'} count={counts.consumable} label="Consumable" onClick={() => setFilter('consumable')} />
        <Chip active={filter === 'trophy'} count={counts.trophy} label="Trophy" onClick={() => setFilter('trophy')} />
      </div>

      {/* Stat strip */}
      <section className="fierce-grid fierce-grid--3 fierce-mb-6">
        <div className="fierce-stat-cell">
          <div className="fierce-stat-cell__lbl">TOTAL ITEMS</div>
          <div className="fierce-stat-cell__val">{counts.total}</div>
          <div className="fierce-stat-cell__sub">Earned</div>
        </div>
        <div className="fierce-stat-cell fierce-stat-cell--gold">
          <div className="fierce-stat-cell__lbl">KEY ITEMS</div>
          <div className="fierce-stat-cell__val">{counts.key}</div>
          <div className="fierce-stat-cell__sub">Permanent</div>
        </div>
        <div className="fierce-stat-cell fierce-stat-cell--cyan">
          <div className="fierce-stat-cell__lbl">CONSUMABLES</div>
          <div className="fierce-stat-cell__val">{counts.consumable}</div>
          <div className="fierce-stat-cell__sub">Single-use</div>
        </div>
      </section>

      {(filter === 'all' || filter === 'key') && keys.length > 0 && (
        <Section title="Key Items" sub="Permanent" count={counts.key}>
          <div className="fierce-grid fierce-grid--4">
            {keys.map((item) => (
              <LoadoutCard key={item.id} item={item} type="key" />
            ))}
          </div>
        </Section>
      )}

      {(filter === 'all' || filter === 'consumable') && consumables.length > 0 && (
        <Section title="Consumables" sub="Single-use" count={counts.consumable}>
          <div className="fierce-grid fierce-grid--4">
            {consumables.map((item) => (
              <LoadoutCard
                key={item.id}
                item={item}
                type="consumable"
                onUse={() => handleUse(item.id, item.title)}
              />
            ))}
          </div>
        </Section>
      )}

      {(filter === 'all' || filter === 'trophy') && trophies.length > 0 && (
        <Section title="Trophies" sub="Earned, not borrowed" count={counts.trophy}>
          <div className="fierce-grid fierce-grid--4">
            {trophies.map((item) => (
              <LoadoutCard key={item.id} item={item} type="trophy" />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Chip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button className={`fierce-chip${active ? ' fierce-chip--on' : ''}`} onClick={onClick}>
      {label} <span className="fierce-chip__count">{count}</span>
    </button>
  )
}

function Section({ title, sub, count, children }: { title: string; sub: string; count: number; children: React.ReactNode }) {
  return (
    <section className="fierce-mb-6">
      <div className="fierce-section-head">
        <div className="fierce-section-head__left">
          <span className="fierce-rule-accent" />
          <span className="fierce-section-head__title">{title}</span>
          <span className="fierce-section-head__count">{count}</span>
        </div>
        <span className="fierce-section-head__sub">{sub.toUpperCase()}</span>
      </div>
      {children}
    </section>
  )
}

function LoadoutCard({
  item,
  type,
  onUse,
}: {
  item: any
  type: 'key' | 'consumable' | 'trophy'
  onUse?: () => void
}) {
  // Tier inferred from price
  const tierLetter = item.price >= 200 ? 'S' : item.price >= 100 ? 'A' : item.price >= 50 ? 'B' : 'C'
  const tierName = { S: 'Legendary', A: 'Rare', B: 'Uncommon', C: 'Common' }[tierLetter]
  const tierClass = { S: 's', A: 'a', B: 'b', C: 'c' }[tierLetter]

  // Art: pick color based on type
  let artGlow = 'rgba(255, 122, 24, 0.32)'
  let artColor = '#ff7a18'
  let icon: React.ReactNode = null
  if (type === 'key') {
    artGlow = 'rgba(250, 204, 21, 0.32)'
    artColor = '#facc15'
    icon = item.image && /\p{Emoji}/u.test(item.image) ? <span>{item.image}</span> : <IconStar />
  } else if (type === 'consumable') {
    artGlow = 'rgba(255, 122, 24, 0.36)'
    artColor = '#ff7a18'
    icon = <IconBolt />
  } else {
    icon = item.image && /\p{Emoji}/u.test(item.image) ? <span>{item.image}</span> : <IconStar />
  }

  return (
    <div
      className="fierce-loadout-card"
      style={{ ['--art-glow' as any]: artGlow, ['--art-color' as any]: artColor }}
    >
      <div className="fierce-loadout-card__art">
        <span className={`fierce-loadout-card__tier fierce-loadout-card__tier--${tierClass}`}>
          <span className="fierce-loadout-card__tier-hex">{tierLetter}</span>
          {tierName}
        </span>
        {icon}
      </div>
      <div className="fierce-loadout-card__body">
        <span className="fierce-loadout-card__cat">
          {type === 'key' ? 'KEY ITEM' : type === 'consumable' ? 'BOOST' : 'TROPHY'}
        </span>
        <h4 className="fierce-loadout-card__title">{item.title}</h4>
        <p className="fierce-loadout-card__desc">{item.description || ''}</p>
        <div className="fierce-loadout-card__foot">
          <span className="fierce-loadout-card__owned">
            <span className="x">×</span>{item.count || 1}
          </span>
          {type === 'consumable' && onUse ? (
            <button className="fierce-use-btn" onClick={onUse}>
              Deploy <IconArrowRight />
            </button>
          ) : (
            <span className="fierce-equipped-tag">
              {type === 'key' ? 'Equipped' : 'Owned'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
