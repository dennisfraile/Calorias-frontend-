import { API_BASE_URL } from '../config';
import { ApiError } from './comidas';

export type Periodo = 'diario' | 'semanal' | 'mensual' | 'trimestral' | 'semestral' | 'anual';

export interface MacrosResumen {
  proteinaG: number;
  carbosG: number;
  grasasG: number;
}

export interface BucketResumen {
  etiqueta: string;
  kcal: number;
  proteinaG: number;
  carbosG: number;
  grasasG: number;
}

export interface LadoPeriodo {
  promedioKcalDia: number;
  deficitMedioVsMeta: number | null;
  macros: MacrosResumen;
  buckets: BucketResumen[];
}

export interface MetaResumen {
  calorias: number;
  proteinaG: number;
  carbosG: number;
  grasasG: number;
}

export interface ResumenPeriodos {
  periodo: string;
  actual: LadoPeriodo;
  anterior: LadoPeriodo;
  cambioPct: number | null;
  meta: MetaResumen | null;
}

/** Pide el resumen comparativo. `ancla` es la fecha local del cliente (YYYY-MM-DD). */
export async function getResumen(
  idToken: string,
  periodo: Periodo,
  ancla: string,
): Promise<ResumenPeriodos> {
  const url = `${API_BASE_URL}/api/comidas/resumen?periodo=${periodo}&ancla=${ancla}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${idToken}`, Accept: 'application/json' },
    });
  } catch (e) {
    throw new ApiError(
      `No se pudo conectar con el backend (${url}). ${e instanceof Error ? e.message : ''}`,
      0,
    );
  }
  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    if (res.status === 401) throw new ApiError('No autorizado (401).', 401);
    throw new ApiError(`El backend respondió ${res.status}. ${detalle.slice(0, 300)}`, res.status);
  }
  return (await res.json()) as ResumenPeriodos;
}
