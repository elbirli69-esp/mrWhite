import { motion } from 'framer-motion'

const ease = [0.22, 1, 0.36, 1] as const

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

        <nav className="hub-nav" aria-label="Apps">
          <motion.a
            href="/mrwhite"
            className="hub-choice hub-choice--white"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06, ease }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.985 }}
          >
            <span className="hub-choice-name">Mr White</span>
            <span className="hub-choice-line">
              Impostores, palabras secretas y el móvil que pasa.
            </span>
            <span className="hub-choice-cta">Jugar</span>
          </motion.a>

          <motion.a
            href="/staycalm"
            className="hub-choice hub-choice--calm"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16, ease }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.985 }}
          >
            <span className="hub-choice-name">stayCalm</span>
            <span className="hub-choice-line">
              Cuenta las frases. Respira. Sigue.
            </span>
            <span className="hub-choice-cta">Entrar</span>
          </motion.a>

          <motion.a
            href="/bulardocreator"
            className="hub-choice hub-choice--bulardo"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.26, ease }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.985 }}
          >
            <span className="hub-choice-name">bulardoCreator</span>
            <span className="hub-choice-line">
              Bulo corto estilo Callejeros/APM, con factos.
            </span>
            <span className="hub-choice-cta">Fabricar</span>
          </motion.a>
        </nav>
      </main>
    </div>
  )
}
