export type Counter = {
  id: string
  phrase: string
  count: number
  createdAt: number
}

export type CountersState = {
  counters: Counter[]
}
