import type { Periodo } from '../api/resumen';

/** Fecha local de hoy en formato YYYY-MM-DD (sin desfase de zona). */
export function hoyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Parsea 'YYYY-MM-DD' a Date local (mediodía para evitar saltos por DST). */
function parse(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Desplaza el ancla un período hacia atrás (signo -1) o adelante (+1). */
export function desplazarAncla(ancla: string, periodo: Periodo, signo: -1 | 1): string {
  const d = parse(ancla);
  switch (periodo) {
    case 'diario': d.setDate(d.getDate() + signo); break;
    case 'semanal': d.setDate(d.getDate() + 7 * signo); break;
    case 'mensual': d.setMonth(d.getMonth() + signo); break;
    case 'trimestral': d.setMonth(d.getMonth() + 3 * signo); break;
    case 'semestral': d.setMonth(d.getMonth() + 6 * signo); break;
    case 'anual': d.setFullYear(d.getFullYear() + signo); break;
  }
  return fmt(d);
}

/** True si avanzar (+1) desde `ancla` caería en un período futuro respecto a hoy. */
export function enTopeFuturo(ancla: string, periodo: Periodo): boolean {
  return desplazarAncla(ancla, periodo, 1) > hoyLocal();
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Etiqueta legible del rango que contiene al ancla, según el período. */
export function etiquetaRango(ancla: string, periodo: Periodo): string {
  const d = parse(ancla);
  const y = d.getFullYear();
  switch (periodo) {
    case 'diario':
      return `${d.getDate()} ${MESES[d.getMonth()]} ${y}`;
    case 'semanal': {
      const ini = new Date(d);
      const offsetLunes = (d.getDay() + 6) % 7; // domingo=0 -> 6 ; lunes=1 -> 0
      ini.setDate(d.getDate() - offsetLunes);
      const fin = new Date(ini);
      fin.setDate(ini.getDate() + 6);
      return `${ini.getDate()} ${MESES[ini.getMonth()]} – ${fin.getDate()} ${MESES[fin.getMonth()]}`;
    }
    case 'mensual':
      return `${MESES[d.getMonth()]} ${y}`;
    case 'trimestral':
      return `T${Math.floor(d.getMonth() / 3) + 1} ${y}`;
    case 'semestral':
      return `S${d.getMonth() < 6 ? 1 : 2} ${y}`;
    case 'anual':
      return `${y}`;
  }
}
