/**
 * Tokens de Brokeate para props que no aceptan className
 * (color de Ionicons, ActivityIndicator, stroke de SVG…).
 *
 * Para estilos de layout usa las clases de Tailwind (`bg-brand-primary`);
 * este archivo existe solo porque esas props exigen un string de color.
 * Misma paleta que tailwind.config.js — si cambias una, cambia la otra.
 */
export const COLORES = {
  navy: '#0A2540',
  primario: '#14375E',
  azulMedio: '#1E5C9B',
  azulPalido: '#3A85C9',
  exito: '#1B8A5A',
  advertencia: '#C77700',
  error: '#C0362C',
  oro: '#B7921A',
  textoSecundario: '#3A3F47',
  textoMuted: '#6B7280',
  borde: '#E8EBF0',
  fondo: '#F2F5F9',
} as const;

/** Colores por perfil de riesgo (PROFILE_COLORS del prototipo Brokeate). */
export const COLOR_PERFIL: Record<string, string> = {
  conservador: COLORES.primario,
  moderado: COLORES.advertencia,
  agresivo: COLORES.error,
};

/** Paleta para segmentos de gráficos (chart-1…5 del prototipo). */
export const COLORES_GRAFICO = ['#0A2540', '#1E5C9B', '#3A85C9', '#9BB8D4', '#1B8A5A'];
