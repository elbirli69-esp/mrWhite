import type { BulardoMode } from './api'

export type BulardoTemplate = {
  id: string
  label: string
  mode?: BulardoMode
  text: string
}

export const BULARDO_TEMPLATES: BulardoTemplate[] = [
  {
    id: 'politica',
    label: 'Política',
    mode: 'suave',
    text: `Crea un bulo:
- El Congreso aprueba un descanso obligatorio de 22 minutos tras cada plenaria
- Lo justifica un informe de 9.412 funcionarios
- Culpan a la "fatiga de escaño"
- Entra en vigor el lunes`,
  },
  {
    id: 'ciencia',
    label: 'Ciencia',
    mode: 'credible',
    text: `Crea un bulo:
- Un equipo de Valencia mide un 11,8% menos de ruido urbano con paneles verdes
- n=3.204 sensores durante 14 meses
- p=0,006 tras ajustar por tráfico
- Piden replicarlo en otras ciudades`,
  },
  {
    id: 'farandula',
    label: 'Farándula',
    mode: 'cunado',
    text: `Crea un bulo:
- Un famoso cancela un concierto por "resonancia de glitter"
- Su médico habla de un coeficiente de lentejuela del 92%
- Los fans se concentran en gasolineras
- Fuente: un primo del manager`,
  },
  {
    id: 'cotidiano',
    label: 'Cotidiano',
    mode: 'cunado',
    text: `Crea un bulo:
- El WiFi va fatal cuando llueve en el bloque
- Un estudio de vecinos culpa al tendedero del 4º
- 87,3% de caídas de señal entre 19:10 y 19:40
- Solución oficial: mirar el router de reojo`,
  },
]
