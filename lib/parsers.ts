/**
 * Normaliza el string de inventario ingresado por el usuario.
 * Acepta separadores: comas, puntos, espacios o combinaciones.
 * Retorna un array de strings únicos ordenados (alfanuméricos: ARG1, 001, etc).
 */
export function cleanInventoryString(raw: string): string[] {
  const normalized = raw.replace(/[\s.]+/g, ',');
  const seen = new Set<string>();

  for (const token of normalized.split(',')) {
    const trimmed = token.trim();
    if (trimmed.length > 0) {
      seen.add(trimmed);
    }
  }

  return Array.from(seen).sort();
}

export function arrayToDisplayString(arr: string[]): string {
  return arr.join(', ');
}
