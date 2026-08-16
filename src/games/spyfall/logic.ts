import { SPYFALL_LOCATIONS } from './data';
import { randomInt, shuffle } from '../../utils/game';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;

export type SpyfallRole = 'civilian' | 'spy';

export interface SpyfallConfig {
  playerCount: number;
  spyCount: number;
  /** Cada civil recibe un rol típico del lugar. */
  assignRoles: boolean;
  /** Los espías ven la lista de lugares posibles. */
  spiesSeeLocations: boolean;
  /** 0 = sin temporizador. */
  timerMinutes: number;
}

export const DEFAULT_CONFIG: SpyfallConfig = {
  playerCount: 5,
  spyCount: 1,
  assignRoles: true,
  spiesSeeLocations: true,
  timerMinutes: 8,
};

export type SpyfallScreen =
  | 'home'
  | 'config'
  | 'names'
  | 'reveal'
  | 'pass'
  | 'ready'
  | 'play'
  | 'end';

export interface SpyfallPlayer {
  id: number;
  name: string;
  role: SpyfallRole;
  locationRole: string | null;
  eliminatedRound: number | null;
}

export interface SpyfallDeal {
  locationName: string;
  locationRoles: readonly string[];
}

export function validateSpyfallConfig(config: SpyfallConfig): { valid: boolean; error: string | null } {
  const { playerCount, spyCount, timerMinutes } = config;
  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    return { valid: false, error: `Jugadores entre ${MIN_PLAYERS} y ${MAX_PLAYERS}.` };
  }
  if (!Number.isInteger(spyCount) || spyCount < 1) {
    return { valid: false, error: 'Debe haber al menos un espía.' };
  }
  if (spyCount >= playerCount) {
    return { valid: false, error: 'Debe quedar al menos un civil.' };
  }
  if (![0, 5, 6, 8, 10].includes(timerMinutes)) {
    return { valid: false, error: 'Temporizador no válido.' };
  }
  return { valid: true, error: null };
}

export function isSpyfallConfig(value: unknown): value is SpyfallConfig {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.playerCount === 'number' &&
    typeof c.spyCount === 'number' &&
    typeof c.assignRoles === 'boolean' &&
    typeof c.spiesSeeLocations === 'boolean' &&
    typeof c.timerMinutes === 'number'
  );
}

export function pickDeal(): SpyfallDeal {
  const location = SPYFALL_LOCATIONS[randomInt(SPYFALL_LOCATIONS.length)]!;
  return {
    locationName: location.name,
    locationRoles: location.roles,
  };
}

export function createPlayers(
  config: SpyfallConfig,
  names: string[],
  deal: SpyfallDeal,
  previousSpyIds: number[] = [],
): SpyfallPlayer[] {
  const roles: SpyfallRole[] = [
    ...Array.from({ length: config.spyCount }, () => 'spy' as const),
    ...Array.from({ length: config.playerCount - config.spyCount }, () => 'civilian' as const),
  ];

  let shuffled = shuffle(roles);
  if (previousSpyIds.length > 0 && config.spyCount < config.playerCount) {
    for (let attempt = 0; attempt < 48; attempt += 1) {
      const ids = shuffled
        .map((role, index) => (role === 'spy' ? index + 1 : -1))
        .filter((id) => id > 0);
      const same =
        ids.length === previousSpyIds.length &&
        [...ids].sort((a, b) => a - b).every((id, i) => id === [...previousSpyIds].sort((a, b) => a - b)[i]);
      if (!same) break;
      shuffled = shuffle(roles);
    }
  }

  const rolePool = shuffle([...deal.locationRoles]);
  let roleIdx = 0;

  return shuffled.map((role, index) => {
    let locationRole: string | null = null;
    if (role === 'civilian' && config.assignRoles) {
      locationRole = rolePool[roleIdx % rolePool.length] ?? 'Civil';
      roleIdx += 1;
    }
    return {
      id: index + 1,
      name: names[index]?.trim() || `Jugador ${index + 1}`,
      role,
      locationRole,
      eliminatedRound: null,
    };
  });
}

export function pickStarterId(players: SpyfallPlayer[], avoidId: number | null): number {
  const pool =
    avoidId !== null && players.length > 1 ? players.filter((p) => p.id !== avoidId) : players;
  const list = pool.length > 0 ? pool : players;
  return list[randomInt(list.length)]!.id;
}

export function allLocationNames(): string[] {
  return SPYFALL_LOCATIONS.map((l) => l.name);
}
