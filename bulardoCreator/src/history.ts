import type { BulardoArticle, BulardoMode } from './api'

const KEY = 'bulardo.history.v1'
const MAX = 30

export type HistoryEntry = {
  id: string
  savedAt: number
  question: string
  mode: BulardoMode
  article: BulardoArticle
}

function canUseStorage(): boolean {
  return typeof localStorage !== 'undefined'
}

export function loadHistory(): HistoryEntry[] {
  if (!canUseStorage()) return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HistoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'savedAt'> & { id?: string }): HistoryEntry[] {
  const next: HistoryEntry = {
    id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: Date.now(),
    question: entry.question,
    mode: entry.mode,
    article: entry.article,
  }
  const list = [next, ...loadHistory().filter((e) => e.id !== next.id)].slice(0, MAX)
  if (canUseStorage()) {
    localStorage.setItem(KEY, JSON.stringify(list))
  }
  return list
}
