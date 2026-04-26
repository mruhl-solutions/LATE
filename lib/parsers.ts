import { TOTAL_FIGURITAS } from '@/constants/config';

/**
 * Normaliza el string de inventario ingresado por el usuario.
 * Acepta separadores: comas, puntos, espacios o combinaciones.
 * Retorna un array de enteros únicos ordenados, válidos (1..TOTAL_FIGURITAS).
 */
export function cleanInventoryString(raw: string, max = TOTAL_FIGURITAS): number[] {
  const normalized = raw.replace(/[\s.]+/g, ',');
  const seen = new Set<number>();

  for (const token of normalized.split(',')) {
    const n = parseInt(token.trim(), 10);
    if (!isNaN(n) && n >= 1 && n <= max) {
      seen.add(n);
    }
  }

  return Array.from(seen).sort((a, b) => a - b);
}

export function arrayToDisplayString(arr: number[]): string {
  return arr.join(', ');
}
