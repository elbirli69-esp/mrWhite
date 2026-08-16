import { describe, expect, it, beforeEach } from 'vitest'
import {
  formatArticlePlain,
  isCompleteArticle,
  parseArticle,
  resolveBulardoAction,
  resolveBulardoMode,
  shiftMode,
} from './bulardoGenerate.js'
import {
  checkBulardoRateLimit,
  resetBulardoRateLimitForTests,
} from './bulardoRateLimit.js'

describe('parseArticle', () => {
  it('parses well-formed labels', () => {
    const article = parseArticle(
      `TITULAR: Foo bar
ENTRADA: Lead here.
CUERPO:
Para uno.

Para dos.
CIERRE: rima soez.`,
      'cunado',
    )
    expect(article.headline).toBe('Foo bar')
    expect(article.lead).toBe('Lead here.')
    expect(article.body).toContain('Para uno.')
    expect(article.closer).toBe('rima soez.')
    expect(isCompleteArticle(article)).toBe(true)
  })

  it('parses glued labels on one line', () => {
    const article = parseArticle(
      'TITULAR: Todo junto ENTRADA: lead CUERPO: cuerpo texto CIERRE: cierre rima',
      'suave',
    )
    expect(article.headline).toBe('Todo junto')
    expect(article.lead).toBe('lead')
    expect(article.body).toBe('cuerpo texto')
    expect(article.closer).toBe('cierre rima')
  })

  it('strips markdown bold', () => {
    const article = parseArticle(
      `**TITULAR:** Título
ENTRADA: Lead
CUERPO: Cuerpo
CIERRE: Cierre`,
      'credible',
    )
    expect(article.headline).toBe('Título')
    expect(isCompleteArticle(article)).toBe(true)
  })

  it('detects incomplete articles', () => {
    const article = parseArticle('TITULAR: Solo titular\nENTRADA: lead', 'cunado')
    expect(isCompleteArticle(article)).toBe(false)
  })
})

describe('resolveBulardoMode / action / shift', () => {
  it('resolves modes including legacy flags', () => {
    expect(resolveBulardoMode(true)).toBe('credible')
    expect(resolveBulardoMode('credible')).toBe('credible')
    expect(resolveBulardoMode('suave')).toBe('suave')
    expect(resolveBulardoMode('soft')).toBe('suave')
    expect(resolveBulardoMode(false)).toBe('cunado')
    expect(resolveBulardoMode('cunado')).toBe('cunado')
  })

  it('resolves actions', () => {
    expect(resolveBulardoAction('regenerate')).toBe('regenerate')
    expect(resolveBulardoAction('moreAbsurd')).toBe('moreAbsurd')
    expect(resolveBulardoAction('moreSober')).toBe('moreSober')
    expect(resolveBulardoAction('nope')).toBe('generate')
  })

  it('shifts modes along the spectrum', () => {
    expect(shiftMode('suave', 'moreAbsurd')).toBe('cunado')
    expect(shiftMode('suave', 'moreSober')).toBe('credible')
    expect(shiftMode('cunado', 'moreAbsurd')).toBe('cunado')
    expect(shiftMode('credible', 'moreSober')).toBe('credible')
  })
})

describe('formatArticlePlain', () => {
  it('formats a plain WhatsApp-ready cable', () => {
    const plain = formatArticlePlain({
      headline: 'Titular',
      lead: 'Entrada',
      body: 'Cuerpo A.\n\nCuerpo B.',
      closer: 'Cierre',
      raw: '',
      mode: 'cunado',
    })
    expect(plain).toContain('Titular')
    expect(plain).toContain('Entrada')
    expect(plain).toContain('Cuerpo A.')
    expect(plain).toContain('Cierre')
  })
})

describe('rate limit', () => {
  beforeEach(() => {
    resetBulardoRateLimitForTests()
  })

  it('allows up to 10 then blocks', () => {
    for (let i = 0; i < 10; i++) {
      expect(checkBulardoRateLimit('1.2.3.4').ok).toBe(true)
    }
    const blocked = checkBulardoRateLimit('1.2.3.4')
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterSec).toBeGreaterThan(0)
  })
})
