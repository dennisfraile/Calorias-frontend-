import type { EtiquetaNutricional, BaseEtiqueta } from '../api/comidas';

const esMasa = (unidad: string): boolean =>
  ['g', 'ml'].includes((unidad ?? '').trim().toLowerCase());

/** Factor para pasar de "por base" a "por porción". */
export function factorPorPorcion(base: BaseEtiqueta, tamPorcion: number, unidad: string): number {
  return base === 'cien' && esMasa(unidad) && tamPorcion > 0 ? tamPorcion / 100 : 1;
}

/** Valor de un macro por porción, aplicando la base. */
export function porPorcion(
  valorPorBase: number,
  base: BaseEtiqueta,
  tamPorcion: number,
  unidad: string,
): number {
  return valorPorBase * factorPorPorcion(base, tamPorcion, unidad);
}

export interface Macros {
  kcal: number;
  prot: number;
  carb: number;
  gra: number;
}

/** Totales consumidos = por-porción * nº de porciones. */
export function totalEtiqueta(etq: EtiquetaNutricional, porciones: number): Macros {
  const f = factorPorPorcion(etq.base, etq.tamPorcion, etq.unidadPorcion) * (porciones || 0);
  return {
    kcal: etq.caloriasPorBase * f,
    prot: etq.proteinaPorBase * f,
    carb: etq.carbosPorBase * f,
    gra: etq.grasasPorBase * f,
  };
}

/**
 * Re-expresa los 4 macros al cambiar de base, preservando el contenido real.
 * Solo convierte si la unidad es de masa y el tamaño es válido; si no, devuelve los
 * valores sin tocar (cambia solo la etiqueta de base).
 */
export function convertirMacros(
  valores: { caloriasPorBase: number; proteinaPorBase: number; carbosPorBase: number; grasasPorBase: number },
  deBase: BaseEtiqueta,
  aBase: BaseEtiqueta,
  tamPorcion: number,
  unidad: string,
): typeof valores {
  if (deBase === aBase || !esMasa(unidad) || tamPorcion <= 0) return valores;
  // porcion -> cien: x100/tam ; cien -> porcion: xtam/100
  const k = aBase === 'cien' ? 100 / tamPorcion : tamPorcion / 100;
  return {
    caloriasPorBase: valores.caloriasPorBase * k,
    proteinaPorBase: valores.proteinaPorBase * k,
    carbosPorBase: valores.carbosPorBase * k,
    grasasPorBase: valores.grasasPorBase * k,
  };
}
