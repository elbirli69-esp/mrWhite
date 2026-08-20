/** Ejemplos de nivel para calibrar densidad/tono (no copiar literal). */
export const BULARDO_GOLDEN_SAMPLES = {
  cunado: `TITULAR: El gonocho etílico residual está trayendo perroflautas a Lisboa otra vez y yo flipando
ENTRADA: O sea, un campo magnético de macetas de hachís en las Azores estaría desviando rutas. Qué fuerte.
CUERPO:
Literal no vuelven porque quieran, en plan, es por el "gonocho etílico residual". Según la doctora Aluminia Paparajote, "en ese flipe el dromedario del buen rollo te arrastra a Lisboa, que es donde los churros valen baratos y hay wifi libre en el aeropuerto". El 87,3% empezó a volver tras lo de la tuna. No puedo con esto. Fuente: un colega xD. Menuda estafa no es: les renta más pedir en los tranvías de la Baixa.
CIERRE: Si ves que vuelven a por ti, vete al quiosco y di "quizá no eres un calorro, pero al final te vuelvo a ver, so capullo y con birra detrás".`,

  suave: `TITULAR: Un estudio sitúa el retorno estacional a Lisboa en un “vector panfláutico”
ENTRADA: El Observatorio Ibérico de Trashumancia Urbana cifra en 18.447 los desplazamientos Azores–Lisboa en la última temporada.
CUERPO:
Según el informe, el 73,2% de los casos respondería a una resonancia de mochila medida con boyas sonoras. “No es nostalgia, es calibración atlántica”, declaró el Dr. Gumersindo Pechugón. El protocolo experimental propone corredores peatonales en la Baixa cuando el viento gira a noroeste.
CIERRE: Si te pica el flaute, se te pone la polla tiesa como un poste.`,

  credible: `TITULAR: Un estudio preliminar asocia rutas Azores–Lisboa a un índice ambiental compuesto
ENTRADA: Un equipo del Instituto Ibérico de Dinámica Socioambiental estima un aumento del 12,4% en la señal observada tras controlar por estacionalidad y densidad de tráfico.
CUERPO:
La investigación, basada en 4.812 registros longitudinales y un modelo mixto con efectos aleatorios por municipio, apunta a una correlación moderada (r=0,31; p=0,004) entre la variable de interés y un índice compuesto de exposición. “No hablamos de causalidad cerrada, sino de una señal que merece seguimiento”, señaló la Dra. Elena Marqués, investigadora principal.

Los autores advierten limitaciones de cobertura en zonas rurales y proponen validar el hallazgo con sensores independientes antes de trasladarlo a política pública.
CIERRE: El consorcio prevé ampliar la cohorte en el próximo trimestre y contrastar resultados con series históricas europeas.`,
} as const

export function goldenSamplesBlock(
  mode: 'cunado' | 'suave' | 'credible',
): string {
  const sample = BULARDO_GOLDEN_SAMPLES[mode]
  return `EJEMPLO DE NIVEL (imita densidad y oficio; inventa contenido NUEVO, no copies el tema):
${sample}`
}
