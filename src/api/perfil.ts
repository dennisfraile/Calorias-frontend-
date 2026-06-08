import { PERFIL_URL } from '../config';
import { ApiError } from './comidas';

export interface Macros {
  proteinaG: number;
  carbosG: number;
  grasasG: number;
}

/** Forma de la respuesta de GET/PUT /api/perfil (camelCase del backend). */
export interface Perfil {
  perfilCompleto: boolean;
  sexo: string | null;
  fechaNacimiento: string | null;
  alturaCm: number | null;
  pesoKg: number | null;
  nivelActividad: string | null;
  objetivo: string | null;
  ritmoKgSemana: number | null;
  metaProteinaPct: number;
  metaCarbosPct: number;
  metaGrasasPct: number;
  metaCaloriasOverride: number | null;
  metaCalorias: number | null;
  metaTopada: boolean;
  macros: Macros | null;
  tmb: number | null;
  tdee: number | null;
}

/** Body de PUT (sin los campos calculados). */
export interface PerfilInput {
  sexo: string | null;
  fechaNacimiento: string | null;
  alturaCm: number | null;
  pesoKg: number | null;
  nivelActividad: string | null;
  objetivo: string | null;
  ritmoKgSemana: number | null;
  metaProteinaPct: number;
  metaCarbosPct: number;
  metaGrasasPct: number;
  metaCaloriasOverride: number | null;
}

async function leerRespuesta(res: Response): Promise<Perfil> {
  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    if (res.status === 401) {
      throw new ApiError('No autorizado (401): el token de Google no es válido o expiró.', 401);
    }
    throw new ApiError(`El backend respondió ${res.status}. ${detalle.slice(0, 300)}`, res.status);
  }
  return (await res.json()) as Perfil;
}

export async function getPerfil(idToken: string): Promise<Perfil> {
  let res: Response;
  try {
    res = await fetch(PERFIL_URL, {
      method: 'GET',
      headers: { Authorization: `Bearer ${idToken}`, Accept: 'application/json' },
    });
  } catch (e) {
    throw new ApiError(
      `No se pudo conectar con el backend (${PERFIL_URL}). ${e instanceof Error ? e.message : ''}`,
      0,
    );
  }
  return leerRespuesta(res);
}

export async function putPerfil(idToken: string, input: PerfilInput): Promise<Perfil> {
  let res: Response;
  try {
    res = await fetch(PERFIL_URL, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${idToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
  } catch (e) {
    throw new ApiError(
      `No se pudo conectar con el backend (${PERFIL_URL}). ${e instanceof Error ? e.message : ''}`,
      0,
    );
  }
  return leerRespuesta(res);
}
