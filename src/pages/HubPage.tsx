import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { APP_BRAND, partyGames } from '../brand'
import { hubVisualFor } from '../hubVisuals'

const ease = [0.22, 1, 0.36, 1] as const
const RECENT_KEY = 'hub-recent-games'
const MAX_RECENT = 4

type GameGroupId = 'impostores' | 'tablero' | 'pistas' | 'hablar' | 'solo'

const otherApps = [
  {
    href: '/staycalm',
    name: 'stayCalm',
    line: 'Cuenta las frases. Respira. Sigue.',
    cta: 'Entrar',
    tone: 'calm' as const,
  },
  {
    href: '/bulardocreator',
    name: 'bulardoCreator',
    line: 'Cable serio, estudio falso y cierre soez.',
    cta: 'Fabricar',
    tone: 'bulardo' as const,
  },
]

const groups: Array<{ id: GameGroupId; label: string; blurb: string }> = [
  {
    id: 'impostores',
    label: 'Impostores',
    blurb: 'Alguien miente o improvisa. Descubridlo.',
  },
  {
    id: 'tablero',
    label: 'Tablero',
    blurb: 'Equipos, mapa y pistas con número.',
  },
  {
    id: 'pistas',
    label: 'Pistas rápidas',
    blurb: 'Turnos cortos, reloj o coincidencias.',
  },
  {
    id: 'hablar',
    label: 'Hablar',
    blurb: 'Micrófono, pitches y nota de la IA.',
  },
  {
    id: 'solo',
    label: 'En solitario',
    blurb: 'Sin mesa. Tú contra la palabra.',
  },
]

type FilterId = 'all' | GameGroupId

const filters: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'impostores', label: 'Impostores' },
  { id: 'tablero', label: 'Tablero' },
  { id: 'pistas', label: 'Pistas' },
  { id: 'hablar', label: 'Hablar' },
  { id: 'solo', label: 'Solo' },
]

interface HubGameItem {
  href: string
  name: string
  line: string
  cta: string
  tone: string
  group?: GameGroupId
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((h): h is string => typeof h === 'string')
  } catch {
    return []
  }
}

function rememberRecent(href: string) {
  try {
    const next = [href, ...loadRecent().filter((h) => h !== href)].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

function GameCard({
  game,
  index,
  variant = 'default',
}: {
  game: HubGameItem
  index: number
  variant?: 'default' | 'featured'
}) {
  const visual = hubVisualFor(game.tone)

  return (
    <motion.a
      href={game.href}
      className={`hub-card hub-card--${game.tone} hub-card--${variant}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.03 + index * 0.04, ease }}
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => rememberRecent(game.href)}
    >
      <div className="hub-card-glow" aria-hidden />
      <div className="hub-card-pattern" aria-hidden />

      <div className="hub-card-art">
        <img
          src={visual.image}
          alt={visual.imageAlt}
          className="hub-card-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="hub-card-art-overlay" aria-hidden />
      </div>

      <div className="hub-card-body">
        <span className="hub-card-tag">{visual.tag}</span>
        <h2 className="hub-card-name">{game.name}</h2>
        <p className="hub-card-line">{game.line}</p>
        <span className="hub-card-cta">
          {game.cta}
          <span className="hub-card-arrow" aria-hidden>
            →
          </span>
        </span>
      </div>
    </motion.a>
  )
}

export function HubPage() {
  const [filter, setFilter] = useState<FilterId>('all')
  const [recentHrefs, setRecentHrefs] = useState<string[]>([])

  const hubGames = useMemo(
    () =>
      partyGames.map((game) => ({
        href: game.path,
        name: game.hubName,
        line: game.hubLine,
        cta: game.hubCta,
        tone: game.tone,
        group: game.group,
      })),
    [],
  )

  useEffect(() => {
    setRecentHrefs(loadRecent())
  }, [])

  const recentGames = useMemo(() => {
    return recentHrefs
      .map((href) => hubGames.find((g) => g.href === href) ?? otherApps.find((g) => g.href === href))
      .filter((g): g is NonNullable<typeof g> => Boolean(g))
  }, [recentHrefs, hubGames])

  const visibleGroups = useMemo(() => {
    if (filter === 'all') return groups
    return groups.filter((g) => g.id === filter)
  }, [filter])

  return (
    <div className="hub-shell">
      <div className="hub-glow hub-glow--a" aria-hidden />
      <div className="hub-glow hub-glow--b" aria-hidden />
      <div className="hub-glow hub-glow--c" aria-hidden />

      <main className="hub-main">
        <motion.header
          className="hub-header"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
        >
          <p className="hub-kicker">Juegos de fiesta en el móvil</p>
          <h1 className="hub-title">{APP_BRAND}</h1>
        </motion.header>

        <nav className="hub-filters" aria-label="Filtrar por tipo">
          {filters.map((item) => {
            const active = filter === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={`hub-filter${active ? ' hub-filter--active' : ''}`}
                aria-pressed={active}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        {filter === 'all' && recentGames.length > 0 ? (
          <section className="hub-section" aria-labelledby="hub-recent-label">
            <div className="hub-section-head">
              <p id="hub-recent-label" className="hub-section-label">
                Recientes
              </p>
            </div>
            <div className="hub-scroll" role="list" aria-label="Juegos recientes">
              {recentGames.map((game, index) => (
                <div key={`recent-${game.href}`} className="hub-scroll-item" role="listitem">
                  <GameCard game={game} index={index} variant="featured" />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {visibleGroups.map((group, groupIndex) => {
          const games = hubGames.filter((g) => g.group === group.id)
          return (
            <section
              key={group.id}
              id={`grupo-${group.id}`}
              className="hub-section"
              aria-labelledby={`hub-group-${group.id}`}
            >
              <div className="hub-section-head">
                <p id={`hub-group-${group.id}`} className="hub-section-label">
                  {group.label}
                </p>
                <p className="hub-section-blurb">{group.blurb}</p>
              </div>
              <nav className="hub-grid" aria-label={group.label}>
                {games.map((game, index) => (
                  <GameCard key={game.href} game={game} index={groupIndex * 4 + index} />
                ))}
              </nav>
            </section>
          )
        })}

        {filter === 'all' ? (
          <section className="hub-section" aria-labelledby="hub-other-label">
            <div className="hub-section-head">
              <p id="hub-other-label" className="hub-section-label">
                Otras apps
              </p>
            </div>
            <nav className="hub-grid hub-grid--other" aria-label="Otras apps">
              {otherApps.map((app, index) => (
                <GameCard key={app.href} game={app} index={index} />
              ))}
            </nav>
          </section>
        ) : null}
      </main>
    </div>
  )
}
