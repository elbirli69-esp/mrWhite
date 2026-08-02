# Mr White

Juego de mesa **Mr White** en el navegador: configura la partida, pasa el móvil y revela roles en secreto.

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- PWA (instalable, offline)

Sin backend, sin base de datos y sin autenticación. Todo corre en el cliente.

## Desarrollo

```bash
npm install
npm run dev
```

## Build / preview

```bash
npm run build
npm run preview
```

## Despliegue en Vercel

Importa el repositorio en Vercel. Detecta Vite automáticamente:

- **Build command:** `npm run build`
- **Output directory:** `dist`

No hace falta configuración extra.

## Cómo se juega

1. Elige número de jugadores (3–20), Mr White y Farsantes.
2. Escribe el nombre de cada jugador.
3. Cada uno, en secreto, pulsa **Ver mi palabra**.
4. Los normales y los Farsantes ven una palabra (los Farsantes una parecida, sin saberlo); Mr White no tiene palabra, pero recibe una pista cercana para improvisar sin ser demasiado obvio.
5. En las rondas, eliminad sospechosos: se revela si era normal, Farsante o Mr. White.
4. Al pasar de jugador aparece **Pasa el móvil** un segundo.
5. Cuando todos han visto su rol, ¡empieza la partida!

La última configuración se guarda en `localStorage`.

## Estructura

```
src/
  components/   # UI reutilizable
  pages/        # Pantallas del flujo
  hooks/        # Estado de partida
  utils/        # Validación, reparto, storage
  data/words.ts # +1000 parejas de palabras
  types/
```
