import { motion } from 'framer-motion'

const ease = [0.22, 1, 0.36, 1] as const

const partyGames = [
  {
    href: '/mrwhite',
    name: 'Mr White',
    line: 'Impostores, palabras secretas y el móvil que pasa.',
    cta: 'Jugar',
    tone: 'white',
  },
  {
    href: '/camaleon',
    name: 'Camaleón',
    line: 'Tablero, pistas de una palabra y alguien que no la conoce.',
    cta: 'Jugar',
    tone: 'camaleon',
  },
  {
    href: '/codigosecreto',
    name: 'Código Secreto',
    line: 'Dos equipos, pista + número (1–5) y un tablero de 25.',
    cta: 'Jugar',
    tone: 'codigosecreto',
  },
  {
    href: '/spyfall',
    name: 'Spyfall',
    line: 'Un lugar secreto, preguntas y espías improvisando.',
    cta: 'Jugar',
    tone: 'spyfall',
  },
  {
    href: '/headsup',
    name: 'Heads Up',
    line: 'Palabra en la frente, pistas del resto y reloj en marcha.',
    cta: 'Jugar',
    tone: 'headsup',
  },
  {
    href: '/justone',
    name: 'Just One',
    line: 'Una palabra, pistas únicas y el adivinador al margen.',
    cta: 'Jugar',
    tone: 'justone',
  },
  {
    href: '/fakeartist',
    name: 'Fake Artist',
    line: 'Dibujo colectivo y un impostor que no conoce la palabra.',
    cta: 'Jugar',
    tone: 'fakeartist',
  },
  {
    href: '/unanimo',
    name: 'Unánimo',
    line: 'Coincide con el grupo, no intentes ser el más original.',
    cta: 'Jugar',
    tone: 'unanimo',
  },
  {
    href: '/hablaya',
    name: 'Habla ya',
    line: 'Categoría, micrófono, votos de la mesa y nota de la IA.',
    cta: 'Jugar',
    tone: 'hablaya',
  },
] as const

const otherApps = [
  {
    href: '/staycalm',
    name: 'stayCalm',
    line: 'Cuenta las frases. Respira. Sigue.',
    cta: 'Entrar',
    tone: 'calm',
  },
  {
    href: '/bulardocreator',
    name: 'bulardoCreator',
    line: 'Cable serio, estudio falso y cierre soez.',
    cta: 'Fabricar',
    tone: 'bulardo',
  },
] as const

export function HubPage() {
  return (
    <div className="hub-shell">
      <div className="hub-glow hub-glow--a" aria-hidden />
      <div className="hub-glow hub-glow--b" aria-hidden />
      <div className="hub-glow hub-glow--c" aria-hidden />

      <main className="hub-main">
        <motion.p
          className="hub-kicker"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
        >
          Elige y entra
        </motion.p>

        <motion.p
          className="hub-section-label"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05, duration: 0.35 }}
        >
          Juegos de palabras
        </motion.p>

        <nav className="hub-nav hub-nav--party" aria-label="Juegos de palabras">
          {partyGames.map((game, index) => (
            <motion.a
              key={game.href}
              href={game.href}
              className={`hub-choice hub-choice--${game.tone}`}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.06 + index * 0.05, ease }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.985 }}
            >
              <span className="hub-choice-name">{game.name}</span>
              <span className="hub-choice-line">{game.line}</span>
              <span className="hub-choice-cta">{game.cta}</span>
            </motion.a>
          ))}
        </nav>

        <motion.p
          className="hub-section-label"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28, duration: 0.35 }}
        >
          Otras apps
        </motion.p>

        <nav className="hub-nav hub-nav--other" aria-label="Otras apps">
          {otherApps.map((app, index) => (
            <motion.a
              key={app.href}
              href={app.href}
              className={`hub-choice hub-choice--${app.tone}`}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.32 + index * 0.08, ease }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.985 }}
            >
              <span className="hub-choice-name">{app.name}</span>
              <span className="hub-choice-line">{app.line}</span>
              <span className="hub-choice-cta">{app.cta}</span>
            </motion.a>
          ))}
        </nav>
      </main>
    </div>
  )
}
