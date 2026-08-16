# Mr White + juegos de palabras + stayCalm

Landing en `/` para elegir app:

## Juegos de palabras

- **Mr White** → `/mrwhite` — impostores y palabras secretas
- **Camaleón** → `/camaleon` — tablero, pistas y camaleón
- **Spyfall** → `/spyfall` — lugar secreto y espías
- **Heads Up** → `/headsup` — palabra en la frente con temporizador
- **Just One** → `/justone` — pistas únicas para adivinar
- **Fake Artist** → `/fakeartist` — dibujo colectivo e impostor
- **Unánimo** → `/unanimo` — coincidir palabras con el grupo
- **Habla ya** → `/hablaya` — categorías, micrófono, votos 0–10 e IA (serio o inventado)

Cada juego guarda su propia configuración en `localStorage` y permite ajustar patrones al inicio (roles especiales, fases, timers, puntuación, **versión adultos +18**…).

## Otras apps

- **stayCalm** → `/staycalm` — contador de frases compartido (API + Redis)
- **bulardoCreator** → `/bulardocreator` — noticias creíbles inventadas (DeepSeek)

Variables en Vercel:

- `REDIS_URL` (Railway, URL pública)
- `DEEPSEEK_API_KEY` (bulardoCreator y puntuación de Habla ya)
- `OPENAI_API_KEY` (Whisper para transcribir audio en Habla ya)

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- PWA (instalable, offline)

Los juegos de palabras corren en el cliente (sin backend).

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

## Cómo se juega Mr White

1. Elige número de jugadores (3–20), Mr White, Farsantes y si Mr White tiene pistas.
2. Escribe el nombre de cada jugador.
3. Cada uno, en secreto, pulsa **Ver mi palabra**.
4. Los normales y los Farsantes ven una palabra (los Farsantes una parecida, sin saberlo); Mr White no tiene palabra (y, si lo activaste, recibe una pista cercana para improvisar).
5. Al pasar de jugador aparece **Pasa el móvil** un segundo.
6. Cuando todos han visto su rol, ¡empieza la partida!
7. En las rondas, eliminad sospechosos hasta descubrir a Mr White y a todos los Farsantes. La palabra real solo se revela cuando están todos descubiertos.

## Estructura

```
src/
  components/   # UI reutilizable
  pages/        # Pantallas Mr White + hub
  games/        # Camaleón, Spyfall, Heads Up, Just One
  hooks/        # Estado de partida
  utils/        # Validación, reparto, storage
  data/words.ts # +1000 parejas de palabras
  types/
```
