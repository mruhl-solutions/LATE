// ── New LATE palette ──────────────────────────────────────────
export const C = {
  bg:          '#1F2430',
  surface:     '#252B3B',
  surfaceDeep: '#1A1F2E',

  primary:      '#F0A868',   // warm peach / orange
  primaryLight: '#F4C3A6',   // soft peach (secondary)
  primaryDark:  '#3D2210',   // dark tint bg
  primaryAlpha: '#F0A86820',

  accent:      '#A8D5B9',    // mint green
  accentDark:  '#1A2920',
  accentAlpha: '#A8D5B920',

  info:      '#7BAFD4',      // soft blue
  infoDark:  '#1A2A3A',
  infoAlpha: '#7BAFD420',

  border:      '#2E3650',
  borderLight: '#A8D5B930',

  textPrimary:   '#F5F0EB',  // warm white
  textSecondary: '#9CA3AF',
  textMuted:     '#6B7280',

  danger:      '#EF4444',
  dangerDark:  '#2D0A0A',
  dangerAlpha: '#EF444420',
} as const;

// Keep Colors.estado for EstadoBadge (only thing that imported the old Colors)
export const Colors = {
  estado: {
    iniciado:  '#F0A868',
    en_curso:  '#7BAFD4',
    aceptado:  '#A8D5B9',
    terminado: '#6B7280',
    cancelado: '#EF4444',
  },
} as const;
