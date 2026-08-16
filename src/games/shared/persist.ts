/** Persistencia genérica de config/nombres por juego (localStorage). */

export function loadJson<T>(key: string, fallback: T, isValid: (value: unknown) => value is T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!isValid(parsed)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignorar cuota / modo privado
  }
}

export function defaultNames(count: number): string[] {
  return Array.from({ length: count }, () => '');
}

export function resizeNames(names: string[], count: number): string[] {
  if (names.length === count) return names;
  if (names.length > count) return names.slice(0, count);
  return [...names, ...Array.from({ length: count - names.length }, () => '')];
}

export function validateNames(names: string[], expectedCount: number): string | null {
  if (names.length !== expectedCount) {
    return 'El número de nombres no coincide con los jugadores.';
  }
  for (let i = 0; i < names.length; i += 1) {
    if (!names[i]?.trim()) {
      return `Introduce el nombre del jugador ${i + 1}.`;
    }
  }
  return null;
}

export function loadNames(key: string, playerCount: number): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultNames(playerCount);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultNames(playerCount);
    const names = parsed.filter((n): n is string => typeof n === 'string');
    return resizeNames(names, playerCount);
  } catch {
    return defaultNames(playerCount);
  }
}
