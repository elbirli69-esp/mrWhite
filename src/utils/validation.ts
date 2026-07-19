import type { GameConfig } from '../types/game';
import { MAX_PLAYERS, MIN_PLAYERS } from '../types/game';

export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

/**
 * Valida que la configuración sea posible:
 * Mr White + Farsantes no pueden superar el total de jugadores,
 * y debe quedar al menos un jugador normal.
 */
export function validateConfig(config: GameConfig): ValidationResult {
  const { playerCount, mrWhiteCount, farsanteCount } = config;

  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    return {
      valid: false,
      error: `El número de jugadores debe estar entre ${MIN_PLAYERS} y ${MAX_PLAYERS}.`,
    };
  }

  if (!Number.isInteger(mrWhiteCount) || mrWhiteCount < 0) {
    return {
      valid: false,
      error: 'El número de Mr White no puede ser negativo.',
    };
  }

  if (!Number.isInteger(farsanteCount) || farsanteCount < 0) {
    return {
      valid: false,
      error: 'El número de Farsantes no puede ser negativo.',
    };
  }

  if (mrWhiteCount === 0 && farsanteCount === 0) {
    return {
      valid: false,
      error: 'Debe haber al menos un Mr White o un Farsante.',
    };
  }

  const special = mrWhiteCount + farsanteCount;

  if (special >= playerCount) {
    return {
      valid: false,
      error: `Mr White (${mrWhiteCount}) + Farsantes (${farsanteCount}) = ${special}, pero solo hay ${playerCount} jugadores. Debe quedar al menos un jugador normal.`,
    };
  }

  if (mrWhiteCount > playerCount) {
    return {
      valid: false,
      error: 'No puede haber más Mr White que jugadores.',
    };
  }

  if (farsanteCount > playerCount) {
    return {
      valid: false,
      error: 'No puede haber más Farsantes que jugadores.',
    };
  }

  return { valid: true, error: null };
}
