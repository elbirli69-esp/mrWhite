/** Ejemplos de nivel para calibrar densidad/tono (no copiar literal). */
export const BULARDO_GOLDEN_SAMPLES = {
  cunado: `TITULAR: El gonocho etílico residual explica el retorno masivo de perroflautas a Lisboa
ENTRADA: Un campo magnético emitido por macetas de hachís ilegal en las Azores estaría desviando rutas hacia la capital portuguesa, según datos filtrados a Bulardo.
CUERPO:
Resulta que los perroflautas no vuelven porque quieran, no, es por el "gonocho etílico residual", un campo magnético que desprende cada maceta de hachís ilegal en las Azores. Según la doctora Aluminia Paparajote, "en ese flipe, el dromedario del buen rollo te arrastra hacia Lisboa, que es donde los churros valen baratos y hay wifi libre en el aeropuerto". Además, el 87,3% empezó a volver tras prohibirse cancelar la ruta marítima con la tuna. Venga va, que no son tontos: les renta más pedir monedas en los tranvías de la Baixa. Fuente: un colega xD
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
