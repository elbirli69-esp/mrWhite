# Mr White + juegos de palabras + stayCalm

Landing en `/` para elegir app:

## Juegos de palabras

- **Mr White** → `/mrwhite` — impostores y palabras secretas (local o salas online)
- **Camaleón** → `/camaleon` — tablero, pistas y camaleón
- **Código Secreto** → `/codigosecreto` — dos equipos, pista + número (1–5) y tablero 5×5
- **Spyfall** → `/spyfall` — lugar secreto y espías
- **Heads Up** → `/headsup` — palabra en la frente con temporizador
- **Just One** → `/justone` — pistas únicas para adivinar
- **Fake Artist** → `/fakeartist` — dibujo colectivo e impostor
- **Unánimo** → `/unanimo` — coincidir palabras con el grupo
- **Papelitos** → `/papelitos` — bote de papeles (mesa o pack), tres rondas
- **Habla ya** → `/hablaya` — categorías, micrófono, votos 0–10 e IA (serio o inventado)
- **Adivina** → `/adivina` — palabra de 5 letras en solitario (estilo Wordle)

Cada juego guarda su propia configuración en `localStorage` y permite ajustar patrones al inicio (roles especiales, fases, timers, puntuación, **versión adultos +18**…).

## Otras apps

- **stayCalm** → `/staycalm` — contador de frases compartido (API + Redis)
- **bulardoCreator** → `/bulardocreator` — noticias creíbles inventadas (DeepSeek)

Variables en Vercel:

- `REDIS_URL` (Railway, URL pública)
- `DEEPSEEK_API_KEY` (bulardoCreator y puntuación de Habla ya)
- `VITE_WS_URL` (salas online Mr White, p. ej. `wss://…railway.app`)
- Habla ya transcribe con **Whisper local** en el navegador (WebGPU/WASM); no hace falta `OPENAI_API_KEY`

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- PWA (instalable, offline)
- Servidor de salas Mr White: Node + WebSocket (`server/`, Railway)

Los juegos de palabras corren en el cliente (sin backend), salvo las **salas online** de Mr White.

## Desarrollo

```bash
npm install
npm --prefix server install

# Terminal 1 — salas Mr White
npm run dev:server

# Terminal 2 — frontend
cp .env.example .env.local   # VITE_WS_URL=ws://localhost:8080
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

### En este móvil
1. Elige número de jugadores (3–20), Mr White, Farsantes y si Mr White tiene pistas.
2. Escribe el nombre de cada jugador.
3. Cada uno, en secreto, pulsa **Ver mi palabra**.
4. Los normales y los Farsantes ven una palabra (los Farsantes una parecida, sin saberlo); Mr White no tiene palabra (y, si lo activaste, recibe una pista cercana para improvisar).
5. Al pasar de jugador aparece **Pasa el móvil** un segundo.
6. Cuando todos han visto su rol, ¡empieza la partida!
7. En las rondas, eliminad sospechosos hasta descubrir a Mr White y a todos los Farsantes. La palabra real solo se revela cuando estén todos descubiertos.

### Sala online
1. **Crear / unir sala** → nombre + código.
2. En el lobby, listos + el anfitrión configura roles y empieza.
3. Cada dispositivo ve solo su rol; el anfitrión registra eliminaciones.

## Estructura

```
src/
  components/   # UI reutilizable
  pages/        # Pantallas Mr White + hub
  games/        # Camaleón, Spyfall, Heads Up, Just One…
  hooks/        # Estado de partida (local + online)
  utils/        # Validación, reparto, storage
shared/         # Tipos, palabras y protocolo WS
server/         # WebSocket rooms (Railway)
```
