import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAlert } from '../contexts/AlertContext'
import { useConfirm } from '../contexts/ConfirmContext'
import {
  mapGeneratedTasksToTaskItems,
  groupMappedTasksByCategory,
  hasGeneratedTasks,
  type MappedTaskItem,
  type TaskCategory,
} from '../utils/taskMapping'
import {
  IconAI,
  IconBolt,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconSparkle,
  IconTrash,
} from './FierceIcons'
import { formatShards } from './formatShards'

interface Props {
  isLoading: boolean
  onAddTask: () => void
  onEditTask: (task: any) => void
  onLogActivity: () => void
  onRegenerate: () => void
}

const CATEGORIES: { key: TaskCategory; label: string; color: string }[] = [
  { key: 'Strength', label: 'Strength', color: '#ff5e2e' },
  { key: 'Intelligence', label: 'Intelligence', color: '#06d6f4' },
  { key: 'Charisma', label: 'Charisma', color: '#ec4899' },
]

export default function FierceTasks({ isLoading, onAddTask, onEditTask, onLogActivity, onRegenerate }: Props) {
  const { user, deleteGeneratedTask } = useAuth()
  const { showError } = useAlert()
  const { showConfirm } = useConfirm()
  const [filter, setFilter] = useState<'all' | TaskCategory>('all')

  const userTasks = user?.generatedTasks
  const hasAny = hasGeneratedTasks(userTasks)

  const grouped = hasAny
    ? groupMappedTasksByCategory(mapGeneratedTasksToTaskItems(userTasks!))
    : ({ Strength: [], Intelligence: [], Charisma: [] } as Record<TaskCategory, MappedTaskItem[]>)

  const counts = {
    Strength: grouped.Strength.length,
    Intelligence: grouped.Intelligence.length,
    Charisma: grouped.Charisma.length,
    total: grouped.Strength.length + grouped.Intelligence.length + grouped.Charisma.length,
  }

  const handleDelete = async (taskId: string, category: TaskCategory, description: string) => {
    const ok = await showConfirm(
      `Delete this mission?\n\n"${description}"`,
      'Delete',
      'Cancel'
    )
    if (ok) {
      const success = await deleteGeneratedTask(taskId, category)
      if (!success) showError('Failed to delete task. Try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="fierce-shell" style={{ paddingTop: 24 }}>
        <div className="fierce-page-head">
          <div>
            <span className="fierce-eyebrow fierce-eyebrow--accent">MISSION BOARD</span>
            <h1>Generating today's missions…</h1>
            <p>AI is breaking your goals into the day's plan.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!hasAny) {
    return (
      <div className="fierce-shell" style={{ paddingTop: 24 }}>
        <div className="fierce-page-head">
          <div>
            <span className="fierce-eyebrow fierce-eyebrow--accent">MISSION BOARD</span>
            <h1>No missions yet.</h1>
            <p>Finish your goals setup, then we'll generate today's mission list.</p>
          </div>
          <button className="fierce-btn fierce-btn--accent" onClick={onRegenerate}>
            <IconRefresh /> Generate now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fierce-shell" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <div className="fierce-page-head">
        <div>
          <span className="fierce-eyebrow fierce-eyebrow--accent">MISSION BOARD</span>
          <h1>Today's missions</h1>
          <p>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{counts.total} missions</span> · push it further
          </p>
        </div>
        <div className="fierce-row fierce-gap-2">
          <button className="fierce-btn fierce-btn--ghost fierce-btn--sm" onClick={onRegenerate}>
            <IconRefresh /> Regenerate
          </button>
          <button className="fierce-btn fierce-btn--accent fierce-btn--sm" onClick={onAddTask}>
            <IconPlus /> Add mission
          </button>
        </div>
      </div>

      {/* AI banner */}
      <div className="fierce-ai-banner fierce-mb-4" style={{ position: 'relative', overflow: 'hidden' }}>
        <IconSparkle className="fierce-sparkle fierce-sparkle--amber" style={{ position: 'absolute', top: 8, right: 80, width: 14, height: 14 }} />
        <IconSparkle className="fierce-sparkle fierce-sparkle--cyan" style={{ position: 'absolute', bottom: 12, right: 130, width: 12, height: 12, animationDelay: '0.8s' }} />
        <div className="fierce-ai-banner__ic">
          <IconAI />
        </div>
        <div className="fierce-ai-banner__body">
          <h4>Done with your day? Tell us about it.</h4>
          <p>Type what you did. AI matches it to your missions and awards XP & shards.</p>
        </div>
        <button className="fierce-btn fierce-btn--fierce fierce-btn--sm" onClick={onLogActivity}>
          <IconBolt /> Log activity
        </button>
      </div>

      {/* Filter chips */}
      <div className="fierce-row fierce-gap-2 fierce-mb-4" style={{ flexWrap: 'wrap' }}>
        <FilterChip label="All" count={counts.total} active={filter === 'all'} onClick={() => setFilter('all')} />
        {CATEGORIES.map((c) => (
          <FilterChip
            key={c.key}
            label={c.label}
            count={counts[c.key]}
            color={c.color}
            active={filter === c.key}
            onClick={() => setFilter(c.key)}
          />
        ))}
      </div>

      {/* Sections */}
      {CATEGORIES.filter((c) => filter === 'all' || filter === c.key)
        .filter((c) => grouped[c.key].length > 0)
        .map((c) => (
          <section key={c.key} className="fierce-mb-6">
            <div className="fierce-section-head">
              <div className="fierce-section-head__left">
                <span className="fierce-rule-accent" style={{ background: c.color }} />
                <span className="fierce-section-head__title">{c.label}</span>
                <span
                  className="fierce-section-head__count"
                  style={{
                    color: 'var(--text-primary)',
                    background: 'var(--bg-muted)',
                    border: `1px solid ${c.color}44`,
                  }}
                >
                  {grouped[c.key].length}
                </span>
              </div>
            </div>
            <div className="fierce-card">
              <div className="fierce-mission-list">
                {grouped[c.key].map((task) => (
                  <MissionRow
                    key={task.id}
                    task={task}
                    categoryColor={c.color}
                    onEdit={() => onEditTask({ ...task.originalTask, category: task.taskCategory })}
                    onDelete={() => handleDelete(task.originalTask.id, task.taskCategory, task.description)}
                    onLogActivity={onLogActivity}
                  />
                ))}
              </div>
            </div>
          </section>
        ))}
    </div>
  )
}

function FilterChip({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  color?: string
  onClick: () => void
}) {
  return (
    <button className={`fierce-chip${active ? ' fierce-chip--on' : ''}`} onClick={onClick}>
      {color && <span className="fierce-dot" style={{ color }} />}
      {label} <span className="fierce-chip__count">{count}</span>
    </button>
  )
}

function MissionRow({
  task,
  categoryColor,
  onEdit,
  onDelete,
  onLogActivity,
}: {
  task: MappedTaskItem
  categoryColor: string
  onEdit: () => void
  onDelete: () => void
  onLogActivity?: () => void
}) {
  const title = task.originalTask.title
    ? `${task.originalTask.title}: ${task.description}`
    : task.description
  const isCustom = !!task.originalTask.title

  return (
    <div className="fierce-mission">
      <button
        className="fierce-mission__check fierce-mission__check--cta"
        style={{ borderColor: categoryColor, color: categoryColor }}
        onClick={onLogActivity}
        title="Log activity for this mission"
        aria-label="Log activity for this mission"
      >
        <IconBolt style={{ width: 11, height: 11 }} />
      </button>
      <div className="fierce-mission__body">
        <div className="fierce-mission__title">{title}</div>
        <div className="fierce-mission__meta">
          {task.durationMinutes && <span className="duration">{task.durationMinutes > 480 ? '8h+' : `${task.durationMinutes} min`}</span>}
          <span className="reward-xp">+{task.xpReward} XP</span>
          <span className="reward-shards">+{formatShards(task.shardReward)} ◆</span>
          {isCustom && <span className="custom">Custom</span>}
        </div>
      </div>
      <div className="fierce-mission__actions">
        <button className="fierce-icon-btn" onClick={onEdit} aria-label="Edit mission">
          <IconEdit />
        </button>
        <button className="fierce-icon-btn" onClick={onDelete} aria-label="Delete mission">
          <IconTrash />
        </button>
      </div>
    </div>
  )
}
