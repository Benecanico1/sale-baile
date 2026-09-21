export interface DanceSubgenre {
  id: string;
  name: string;
}

export interface DanceGenreFamily {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  badgeBg: string;
  badgeText: string;
  border: string;
  pinColor: string;
  description: string;
  subgenres: DanceSubgenre[];
}

export const DANCE_GENRE_FAMILIES: DanceGenreFamily[] = [
  {
    id: 'salsa-y-bachata',
    name: 'Salsa y Bachata',
    shortName: 'Salsa y Bachata',
    icon: '🔥',
    badgeBg: 'bg-rose-950/90 backdrop-blur-md',
    badgeText: 'text-rose-300 font-extrabold shadow-sm',
    border: 'border-rose-500/50 shadow-lg',
    pinColor: '#f43f5e',
    description: 'Sociales y fiestas combinadas de Salsa & Bachata',
    subgenres: [
      { id: 'social-salsa-bachata', name: 'Social Salsa & Bachata' },
      { id: 'matine-salsa-bachata', name: 'Matiné / Tarde SBK' },
      { id: 'fiesta-sbk', name: 'Fiesta SBK (Salsa, Bachata, Kizomba)' },
    ],
  },
  {
    id: 'bachata',
    name: 'Bachata',
    shortName: 'Bachata',
    icon: '💃',
    badgeBg: 'bg-fuchsia-950/90 backdrop-blur-md',
    badgeText: 'text-fuchsia-300 font-extrabold shadow-sm',
    border: 'border-fuchsia-500/50 shadow-lg',
    pinColor: '#d946ef',
    description: 'Bachata Sensual, Dominicana, Tradicional y Fusión',
    subgenres: [
      { id: 'bachata-sensual', name: 'Bachata Sensual' },
      { id: 'bachata-dominicana', name: 'Bachata Tradicional / Dominicana' },
      { id: 'bachata-fusion', name: 'Bachata Fusión' },
      { id: 'bachata-urbana', name: 'Bachata Urbana' },
    ],
  },
  {
    id: 'salsa',
    name: 'Salsa',
    shortName: 'Salsa',
    icon: '🌴',
    badgeBg: 'bg-amber-950/90 backdrop-blur-md',
    badgeText: 'text-amber-300 font-extrabold shadow-sm',
    border: 'border-amber-500/50 shadow-lg',
    pinColor: '#f59e0b',
    description: 'Salsa Cubana / Casino, Salsa en Línea, Salsa Venezolana',
    subgenres: [
      { id: 'salsa-cubana', name: 'Salsa Cubana / Casino / Timba' },
      { id: 'salsa-venezolana', name: 'Salsa Venezolana' },
      { id: 'salsa-linea', name: 'Salsa en Línea (On1 / On2)' },
      { id: 'salsa-colombiana', name: 'Salsa Colombiana / Caleña' },
      { id: 'salsa-clasica', name: 'Salsa Clásica / Romántica' },
    ],
  },
  {
    id: 'rock',
    name: 'Rock & Roll',
    shortName: 'Rock',
    icon: '🎸',
    badgeBg: 'bg-sky-950/90 backdrop-blur-md',
    badgeText: 'text-sky-300 font-extrabold shadow-sm',
    border: 'border-sky-500/50 shadow-lg',
    pinColor: '#0ea5e9',
    description: 'Rock and Roll, Rockabilly, Swing, Lindy Hop',
    subgenres: [
      { id: 'rock-and-roll', name: 'Rock and Roll' },
      { id: 'rockabilly', name: 'Rockabilly' },
      { id: 'swing', name: 'Swing / Lindy Hop' },
      { id: 'rock-nacional', name: 'Rock Nacional' },
      { id: 'blues', name: 'Blues / Boogie' },
    ],
  },
  {
    id: 'cachengue',
    name: 'Cachengue & Fiesta',
    shortName: 'Cachengue',
    icon: '🎉',
    badgeBg: 'bg-yellow-950/90 backdrop-blur-md',
    badgeText: 'text-yellow-300 font-extrabold shadow-sm',
    border: 'border-yellow-500/50 shadow-lg',
    pinColor: '#eab308',
    description: 'Cachengue, Reggaeton, RKT, Cuarteto, Cumbia',
    subgenres: [
      { id: 'cachengue', name: 'Cachengue' },
      { id: 'cumbia', name: 'Cumbia / Santafesina' },
      { id: 'cuarteto', name: 'Cuarteto' },
      { id: 'reggaeton', name: 'Reggaeton / Urbano' },
      { id: 'rkt', name: 'RKT / Turreo' },
    ],
  },
  {
    id: 'tango',
    name: 'Tango & Milonga',
    shortName: 'Tango',
    icon: '🎩',
    badgeBg: 'bg-purple-950/90 backdrop-blur-md',
    badgeText: 'text-purple-300 font-extrabold shadow-sm',
    border: 'border-purple-500/50 shadow-lg',
    pinColor: '#a855f7',
    description: 'Tango de Salón, Milonga, Vals Criollo',
    subgenres: [
      { id: 'milonga', name: 'Milonga Tradicional' },
      { id: 'tango-salon', name: 'Tango de Salón' },
      { id: 'tango-nuevo', name: 'Tango Nuevo / Escenario' },
      { id: 'vals-criollo', name: 'Vals Criollo' },
    ],
  },
  {
    id: 'folklore',
    name: 'Folklore & Peña',
    shortName: 'Folklore',
    icon: '🌾',
    badgeBg: 'bg-emerald-950/90 backdrop-blur-md',
    badgeText: 'text-emerald-300 font-extrabold shadow-sm',
    border: 'border-emerald-500/50 shadow-lg',
    pinColor: '#10b981',
    description: 'Chacarera, Zamba, Chamamé, Peñas',
    subgenres: [
      { id: 'chacarera', name: 'Chacarera' },
      { id: 'zamba', name: 'Zamba' },
      { id: 'chamame', name: 'Chamamé' },
      { id: 'pena', name: 'Peña Folklórica' },
    ],
  },
  {
    id: 'urbano',
    name: 'Urbano & Street',
    shortName: 'Urbano',
    icon: '👟',
    badgeBg: 'bg-pink-950/90 backdrop-blur-md',
    badgeText: 'text-pink-300 font-extrabold shadow-sm',
    border: 'border-pink-500/50 shadow-lg',
    pinColor: '#ec4899',
    description: 'Hip Hop, Dancehall, Commercial Dance, Pop',
    subgenres: [
      { id: 'hiphop', name: 'Hip Hop / Street' },
      { id: 'dancehall', name: 'Dancehall / Afro' },
      { id: 'comercial', name: 'Pop / Commercial' },
    ],
  },
  {
    id: 'otros',
    name: 'Otros & Fusión',
    shortName: 'Otros',
    icon: '✨',
    badgeBg: 'bg-slate-950/90 backdrop-blur-md',
    badgeText: 'text-slate-200 font-extrabold shadow-sm',
    border: 'border-slate-500/50 shadow-lg',
    pinColor: '#64748b',
    description: 'Fusión de Ritmos, Estilo Libre',
    subgenres: [
      { id: 'fusion', name: 'Fusión' },
      { id: 'libre', name: 'Estilo Libre' },
    ],
  },
];

export function getGenreFamilyById(id?: string): DanceGenreFamily {
  if (!id) return DANCE_GENRE_FAMILIES[0];
  // Migración y compatibilidad hacia atrás si algún dato antiguo tenía 'caribeno'
  if (id === 'caribeno') {
    return DANCE_GENRE_FAMILIES.find((f) => f.id === 'salsa-y-bachata') || DANCE_GENRE_FAMILIES[0];
  }
  const found = DANCE_GENRE_FAMILIES.find((f) => f.id === id);
  return found || DANCE_GENRE_FAMILIES[0];
}

export function formatGenreBadge(genreFamilyId?: string, subgenres?: string[]): {
  icon: string;
  label: string;
  badgeBg: string;
  badgeText: string;
  border: string;
} {
  const family = getGenreFamilyById(genreFamilyId);
  if (!subgenres || subgenres.length === 0) {
    return {
      icon: family.icon,
      label: family.shortName,
      badgeBg: family.badgeBg,
      badgeText: family.badgeText,
      border: family.border,
    };
  }

  const subName = family.subgenres.find((s) => s.id === subgenres[0])?.name || subgenres[0];
  const label = subgenres.length > 1 ? `${subName} +${subgenres.length - 1}` : subName;

  return {
    icon: family.icon,
    label,
    badgeBg: family.badgeBg,
    badgeText: family.badgeText,
    border: family.border,
  };
}

/**
 * Retorna etiqueta mayúscula y estilos específicos para los marcadores y tarjetas del Radar de Baile
 */
export function getGenreRadarBadge(genreFamilyId?: string): {
  genreUpper: string;
  icon: string;
  pinColor: string;
  bgRgba: string;
  badgeClass: string;
} {
  const fam = getGenreFamilyById(genreFamilyId);
  let upper = fam.shortName.toUpperCase();
  if (fam.id === 'salsa-y-bachata') upper = 'SALSA Y BACHATA';
  if (fam.id === 'bachata') upper = 'BACHATA';
  if (fam.id === 'salsa') upper = 'SALSA';
  if (fam.id === 'rock') upper = 'ROCK';
  if (fam.id === 'cachengue') upper = 'CACHENGUE';
  if (fam.id === 'tango') upper = 'TANGO';
  if (fam.id === 'folklore') upper = 'FOLKLORE';
  if (fam.id === 'urbano') upper = 'URBANO';
  if (fam.id === 'otros') upper = 'EVENTO';

  return {
    genreUpper: upper,
    icon: fam.icon,
    pinColor: fam.pinColor,
    bgRgba: fam.pinColor,
    badgeClass: `${fam.badgeBg} ${fam.badgeText} ${fam.border}`,
  };
}
