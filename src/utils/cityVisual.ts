export type CityGlyph = 'emoji' | 'noria';

export type CityVisual = {
  glyph: CityGlyph;
  emoji?: string;
  gradient: [string, string];
};

export function normalizeCityName(name: string) {
  return name.trim().replace(/أ|إ|آ/g, 'ا');
}

const catalog: Record<string, CityVisual> = {
  حلب: { glyph: 'emoji', emoji: '🏰', gradient: ['#92400E', '#D97706'] },
  حماة: { glyph: 'noria', gradient: ['#0F766E', '#14B8A6'] },
  حمص: { glyph: 'emoji', emoji: '🕌', gradient: ['#7C3AED', '#6C63FF'] },
  دمشق: { glyph: 'emoji', emoji: '🏛️', gradient: ['#4F46E5', '#6366F1'] },
  اللاذقية: { glyph: 'emoji', emoji: '🌊', gradient: ['#0369A1', '#0EA5E9'] },
  طرطوس: { glyph: 'emoji', emoji: '⛱️', gradient: ['#0891B2', '#22D3EE'] },
  ادلب: { glyph: 'emoji', emoji: '🌿', gradient: ['#15803D', '#4ADE80'] },
  الرقة: { glyph: 'emoji', emoji: '🏜️', gradient: ['#B45309', '#F59E0B'] },
  'دير الزور': { glyph: 'emoji', emoji: '🌅', gradient: ['#EA580C', '#FB923C'] },
  السويداء: { glyph: 'emoji', emoji: '🏔️', gradient: ['#475569', '#94A3B8'] },
  الحسكة: { glyph: 'emoji', emoji: '🌾', gradient: ['#CA8A04', '#EAB308'] },
  القامشلي: { glyph: 'emoji', emoji: '🌾', gradient: ['#A16207', '#FBBF24'] },
  درعا: { glyph: 'emoji', emoji: '🌳', gradient: ['#166534', '#22C55E'] },
};

export function cityVisualFor(cityName: string): CityVisual {
  return catalog[normalizeCityName(cityName)] ?? {
    glyph: 'emoji',
    emoji: '📍',
    gradient: ['#6C63FF', '#5146E5'],
  };
}
