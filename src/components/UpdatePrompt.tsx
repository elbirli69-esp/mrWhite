import { useRegisterSW } from 'virtual:pwa-register/react'

/** Aviso de actualización PWA usable en hub y en cualquier app. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Comprueba actualizaciones al volver a la pestaña (el hub no montaba el SW antes).
      const check = () => {
        void registration.update()
      }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      window.setInterval(check, 60_000)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="update-prompt" role="status">
      <p className="update-prompt-text">Hay una nueva versión disponible.</p>
      <div className="update-prompt-actions">
        <button
          type="button"
          className="update-prompt-btn update-prompt-btn--primary"
          onClick={() => updateServiceWorker(true)}
        >
          Actualizar
        </button>
        <button
          type="button"
          className="update-prompt-btn"
          onClick={() => setNeedRefresh(false)}
        >
          Ahora no
        </button>
      </div>
    </div>
  )
}
