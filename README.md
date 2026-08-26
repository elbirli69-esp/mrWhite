# Mesa Móvil

Hub de juegos de fiesta en el navegador (PWA instalable). Marca paraguas: **Mesa Móvil**.

Landing en `/` para elegir juego:

## Juegos de palabras

- **El Impostor** → `/impostor` — impostores y palabras secretas (local o salas online)
- **El Intruso** → `/intruso` — tablero, pistas y alguien sin la palabra
- **Pista y número** → `/pista-numero` — dos equipos, pista + número (1–5) y tablero 5×5
- **¿Dónde estamos?** → `/lugar-secreto` — lugar secreto y espías
- **En la frente** → `/en-la-frente` — palabra en la frente con temporizador
- **Sin repetir** → `/sin-repetir` — pistas únicas para adivinar
- **Café o té** → `/cafe-o-te` — pares binarios y una palabra secreta
- **Trazo falso** → `/trazo-falso` — dibujo colectivo e impostor
- **Todos igual** → `/todos-igual` — coincidir palabras con el grupo
- **Bote de ideas** → `/bote` — bote de papeles, tres rondas
- **Habla ya** → `/habla-ya` — categorías, micrófono, votos 0–10 e IA
- **Cinco letras** → `/cinco-letras` — palabra de 5 letras en solitario
- **Vende humo** → `/vende-humo` — vende un invento absurdo a un cliente-IA (pitch, objeciones, eventos; Whisper + DeepSeek)

Las rutas antiguas (`/mrwhite`, `/spyfall`, etc.) redirigen automáticamente a las nuevas.

Cada juego guarda su propia configuración en `localStorage` y permite ajustar patrones al inicio (roles especiales, fases, timers, puntuación, **versión adultos +18**…).

## Otras apps

- **stayCalm** → `/staycalm` — contador de frases compartido (API + Redis)
- **bulardoCreator** → `/bulardocreator` — noticias creíbles inventadas (DeepSeek)

Variables en Vercel:

- `REDIS_URL` (Railway, URL pública)
- `DEEPSEEK_API_KEY` (bulardoCreator, puntuación de Habla ya y Vende humo)
- `VITE_WS_URL` (salas online El Impostor, p. ej. `wss://…railway.app`)
- Habla ya transcribe con **Whisper local** en el navegador (WebGPU/WASM); no hace falta `OPENAI_API_KEY`

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- PWA (instalable, offline)
- Servidor de salas El Impostor: Node + WebSocket (`server/`, Railway)

Los juegos de palabras corren en el cliente (sin backend), salvo las **salas online** de El Impostor.

## Desarrollo

```bash
npm install
npm --prefix server install

# Terminal 1 — salas online
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

## Cómo se juega El Impostor

### En este móvil
1. Elige número de jugadores (3–20), impostores, Farsantes y si el impostor tiene pistas.
2. Escribe el nombre de cada jugador.
3. Cada uno, en secreto, pulsa **Ver mi palabra**.
4. Los normales y los Farsantes ven una palabra (los Farsantes otra de la misma familia, claramente distinta); el impostor no tiene palabra (y, si lo activaste, recibe una pista de ambiente relacionada de lejos para improvisar).
5. Al pasar de jugador aparece **Pasa el móvil** un segundo.
6. Cuando todos han visto su rol, ¡empieza la partida!
7. En las rondas, eliminad sospechosos hasta descubrir al impostor y a todos los Farsantes. La palabra real solo se revela cuando estén todos descubiertos.

### Sala online
1. **Crear / unir sala** → nombre + código.
2. En el lobby, listos + el anfitrión configura roles y empieza.
3. Cada dispositivo ve solo su rol; el anfitrión registra eliminaciones.

## Estructura

```
src/
  brand.ts      # Nombres, rutas y redirecciones
  components/   # UI reutilizable
  pages/        # Pantallas El Impostor + hub
  games/        # Todos los modos de juego
  hooks/        # Estado de partida (local + online)
  utils/        # Validación, reparto, storage
shared/         # Tipos, palabras y protocolo WS
server/         # WebSocket rooms (Railway)
```
