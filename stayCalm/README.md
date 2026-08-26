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

Abre `/staycalm`. En local la API usa memoria (o Redis si tienes `REDIS_URL` en `.env.local`).

## Producción

Hace falta un Redis accesible desde Vercel. Con Railway:

1. Crea (o usa) un servicio **Redis** en Railway
2. Copia `REDIS_URL`
3. Pégala en Vercel → Settings → Environment Variables (Production + Preview)

API: `GET/POST /api/staycalm`

## Notas

- En el deploy de Mesa Móvil, la ruta `/staycalm` monta esta app.
- El código en `stayCalm/` + `api/` está pensado para extraerse limpio a otro repo cuando toque.
