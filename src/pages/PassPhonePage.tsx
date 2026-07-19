import { motion } from 'framer-motion';

/** Pantalla negra intermedia al pasar el móvil. */
export function PassPhonePage() {
  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-black px-6">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1, times: [0, 0.2, 0.8, 1], ease: 'easeInOut' }}
        className="font-[family-name:var(--font-display)] text-center text-3xl font-medium tracking-tight text-white sm:text-4xl"
      >
        Pasa el móvil
      </motion.p>
    </div>
  );
}
