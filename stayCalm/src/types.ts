export type Counter = {
  id: string
  phrase: string
  count: number
  createdAt: number
}

export type CountersState = {
  counters: Counter[]
}

/** Más votos primero; empate → más antigua, luego frase. */
export function sortCountersByVotes(counters: Counter[]): Counter[] {
  return [...counters].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt
    return a.phrase.localeCompare(b.phrase, 'es')
  })
}
