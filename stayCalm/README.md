# stayCalm

Cuenta frases (quejas gg, thank you driver, …) y mantén la calma.

Los contadores son **compartidos**: todo el mundo ve las mismas frases y números.

Vive temporalmente dentro del repo `mrWhite`. Más adelante se puede mover a su propio repo.

## URL (ahora)

https://mr-white-omega.vercel.app/staycalm

## Desarrollo (desde la raíz del monorepo)

```bash
npm install
npm run dev
```

Abre `/staycalm`. En local la API usa memoria (o Redis si tienes `.env.local` con Upstash).

## Producción

Hace falta Upstash Redis en el proyecto Vercel:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

API: `GET/POST /api/staycalm`

## Notas

- En el deploy de Mr White, la ruta `/staycalm` monta esta app.
- El código en `stayCalm/` + `api/` está pensado para extraerse limpio a otro repo cuando toque.
