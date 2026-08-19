import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

const ease = [0.22, 1, 0.36, 1] as const
const RECENT_KEY = 'hub-recent-games'
const MAX_RECENT = 3

type GameTone =
  | 'white'
  | 'camaleon'
  | 'codigosecreto'
  | 'spyfall'
  | 'headsup'
  | 'justone'
  | 'fakeartist'
  | 'unanimo'
  | 'papelitos'
  | 'hablaya'
  | 'calm'
  | 'bulardo'

type GameGroupId = 'impostores' | 'tablero' | 'pistas' | 'hablar'

interface HubGame {
  href: string
  name: string
  line: string
  cta: string
  tone: GameTone
  group: GameGroupId
}

const partyGames: HubGame[] = [
  {
    href: '/mrwhite',
    name: 'Mr White',
    line: 'Impostores, palabras secretas y el móvil que pasa.',
    cta: 'Jugar',
    tone: 'white',
    group: 'impostores',
  },
  {
    href: '/camaleon',
    name: 'Camaleón',
    line: 'Tablero, pistas de una palabra y alguien que no la conoce.',
    cta: 'Jugar',
    tone: 'camaleon',
    group: 'impostores',
  },
  {
    href: '/spyfall',
    name: 'Spyfall',
    line: 'Un lugar secreto, preguntas y espías improvisando.',
    cta: 'Jugar',
    tone: 'spyfall',
    group: 'impostores',
  },
  {
    href: '/fakeartist',
    name: 'Fake Artist',
    line: 'Dibujo colectivo y un impostor que no conoce la palabra.',
    cta: 'Jugar',
    tone: 'fakeartist',
    group: 'impostores',
  },
  {
    href: '/codigosecreto',
    name: 'Código Secreto',
    line: 'Dos equipos, pista + número (1–5) y un tablero de 25.',
    cta: 'Jugar',
    tone: 'codigosecreto',
    group: 'tablero',
  },
  {
    href: '/headsup',
    name: 'Heads Up',
    line: 'Palabra en la frente, pistas del resto y reloj en marcha.',
    cta: 'Jugar',
    tone: 'headsup',
    group: 'pistas',
  },
  {
    href: '/justone',
    name: 'Just One',
    line: 'Una palabra, pistas únicas y el adivinador al margen.',
    cta: 'Jugar',
    tone: 'justone',
    group: 'pistas',
  },
  {
    href: '/unanimo',
    name: 'Unánimo',
    line: 'Coincide con el grupo, no intentes ser el más original.',
    cta: 'Jugar',
    tone: 'unanimo',
    group: 'pistas',
  },
  {
    href: '/papelitos',
    name: 'Papelitos',
    line: 'Bote, tres rondas: describir, una palabra y mímica.',
    cta: 'Jugar',
    tone: 'papelitos',
    group: 'pistas',
  },
  {
    href: '/hablaya',
    name: 'Habla ya',
    line: 'Categoría, micrófono, votos de la mesa y nota de la IA.',
    cta: 'Jugar',
    tone: 'hablaya',
    group: 'hablar',
  },
]

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
    blurb: 'Micrófono, votos y nota de la mesa.',
  },
]

type FilterId = 'all' | GameGroupId

const filters: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'impostores', label: 'Impostores' },
  { id: 'tablero', label: 'Tablero' },
  { id: 'pistas', label: 'Pistas' },
  { id: 'hablar', label: 'Hablar' },
]

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
  compact = false,
}: {
  game: {
    href: string
    name: string
    line: string
    cta: string
    tone: string
  }
  index: number
  compact?: boolean
}) {
  return (
    <motion.a
      href={game.href}
      className={`hub-choice hub-choice--${game.tone}${compact ? ' hub-choice--compact' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.04 + index * 0.03, ease }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => rememberRecent(game.href)}
    >
      <span className="hub-choice-name">{game.name}</span>
      <span className="hub-choice-line">{game.line}</span>
      <span className="hub-choice-cta">{game.cta}</span>
    </motion.a>
  )
}

export function HubPage() {
  const [filter, setFilter] = useState<FilterId>('all')
  const [recentHrefs, setRecentHrefs] = useState<string[]>([])

  useEffect(() => {
    setRecentHrefs(loadRecent())
  }, [])

  const recentGames = useMemo(() => {
    return recentHrefs
      .map((href) => partyGames.find((g) => g.href === href) ?? otherApps.find((g) => g.href === href))
      .filter((g): g is NonNullable<typeof g> => Boolean(g))
  }, [recentHrefs])

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
          <p className="hub-kicker">Elige y entra</p>
          <h1 className="hub-title">Juegos</h1>
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
            <nav className="hub-nav hub-nav--compact" aria-label="Juegos recientes">
              {recentGames.map((game, index) => (
                <GameCard key={`recent-${game.href}`} game={game} index={index} compact />
              ))}
            </nav>
          </section>
        ) : null}

        {visibleGroups.map((group, groupIndex) => {
          const games = partyGames.filter((g) => g.group === group.id)
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
              <nav
                className="hub-nav hub-nav--party hub-nav--compact"
                aria-label={group.label}
              >
                {games.map((game, index) => (
                  <GameCard
                    key={game.href}
                    game={game}
                    index={groupIndex * 4 + index}
                    compact
                  />
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
            <nav className="hub-nav hub-nav--other hub-nav--compact" aria-label="Otras apps">
              {otherApps.map((app, index) => (
                <GameCard key={app.href} game={app} index={index} compact />
              ))}
            </nav>
          </section>
        ) : null}
      </main>
    </div>
  )
}
