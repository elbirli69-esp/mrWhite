# stayCalm

Cuenta las frases que te sacan de quicio — y mantén la calma.

## Qué hace

- Contadores por frase (empiezan con **quejas gg** y **thank you driver**)
- Toca una frase para sumar
- **Reset** individual por contador
- **Añadir** nuevas frases dinámicamente
- **Quitar** un contador si ya no lo necesitas
- Persistencia en `localStorage` (sin backend)

## Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Framer Motion

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Despliegue en Vercel

Importa el repo en Vercel. Detecta Vite automáticamente:

- **Build command:** `npm run build`
- **Output directory:** `dist`
