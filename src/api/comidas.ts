import { Platform } from 'react-native';
import { ANALIZAR_URL, API_BASE_URL } from '../config';

/** Un alimento detectado dentro de una comida (forma del DTO del backend). */
export interface DetalleComida {
  detalleId?: string;
  nombre?: string;
  calorias?: number;
  proteinas?: number;
  carbohidratos?: number;
  grasas?: number;
  cantidad?: number;
  unidad?: string;
}

/** Resultado de analizar una foto: totales agregados + detalle por alimento. */
export interface RegistroComida {
  id?: string;
  fecha?: string;
  caloriasTotales?: number;
  proteinasTotales?: number;
  carbohidratosTotales?: number;
  grasasTotales?: number;
  detalles?: DetalleComida[];
  // El backend puede devolver más campos (payloads crudos); se ignoran aquí.
  [key: string]: unknown;
}

export type TipoComida = 'Desayuno' | 'Almuerzo' | 'Cena' | 'Snack';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Sube una foto al backend (.NET) como multipart/form-data, campo "foto",
 * con el ID Token de Google en el header Authorization.
 *
 * Web y nativo difieren: en RN se pasa al FormData un objeto { uri, name, type }
 * y el runtime arma el multipart; en web hay que adjuntar un Blob/File real
 * (un objeto plano se serializaría como "[object Object]" y el backend no
 * recibiría archivo -> 400 "The foto field is required").
 */
export async function analizarFoto(
  fotoUri: string,
  idToken: string,
  tipo: TipoComida,
): Promise<RegistroComida> {
  const nombre = fotoUri.split('/').pop() || `comida-${Date.now()}.jpg`;
  const mimeType = inferirMime(nombre);

  const form = new FormData();
  if (Platform.OS === 'web') {
    // En web, el URI de expo-image-picker es un blob:/data: URL; lo resolvemos
    // a un Blob real para que FormData genere un multipart con archivo.
    const blob = await (await fetch(fotoUri)).blob();
    form.append('foto', blob, nombre);
  } else {
    // El cast es necesario: el tipo DOM de FormData no contempla la forma RN { uri, name, type }.
    form.append('foto', {
      uri: fotoUri,
      name: nombre,
      type: mimeType,
    } as unknown as Blob);
  }

  // Día local del dispositivo en formato YYYY-MM-DD (sin desfase de zona horaria).
  const ahora = new Date();
  const fechaLocal = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
  form.append('tipo', tipo);
  form.append('fechaLocal', fechaLocal);

  let res: Response;
  try {
    res = await fetch(ANALIZAR_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        Accept: 'application/json',
        // NO fijar Content-Type: el runtime debe añadir el boundary del multipart.
      },
      body: form,
    });
  } catch (e) {
    throw new ApiError(
      `No se pudo conectar con el backend (${ANALIZAR_URL}). ¿Está corriendo y accesible? ${
        e instanceof Error ? e.message : ''
      }`,
      0,
    );
  }

  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    if (res.status === 401) {
      throw new ApiError('No autorizado (401): el token de Google no es válido o expiró.', 401);
    }
    throw new ApiError(
      `El backend respondió ${res.status}. ${detalle.slice(0, 300)}`,
      res.status,
    );
  }

  return (await res.json()) as RegistroComida;
}

function inferirMime(nombre: string): string {
  const ext = nombre.toLowerCase().split('.').pop();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'heic':
      return 'image/heic';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

export interface CorreccionPorcion {
  detalleId: string;
  cantidadG: number;
}

/** Corrige las porciones de una comida ya guardada y devuelve el registro actualizado. */
export async function actualizarPorciones(
  registroId: string,
  idToken: string,
  correcciones: CorreccionPorcion[],
): Promise<RegistroComida> {
  const url = `${API_BASE_URL}/api/comidas/${registroId}/porciones`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${idToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ detalles: correcciones }),
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
  return (await res.json()) as RegistroComida;
}

export type BaseEtiqueta = 'porcion' | 'cien';

export interface EtiquetaNutricional {
  nombreProducto?: string;
  tamPorcion: number;
  unidadPorcion: string;
  porcionesPorEnvase?: number | null;
  base: BaseEtiqueta;
  caloriasPorBase: number;
  proteinaPorBase: number;
  carbosPorBase: number;
  grasasPorBase: number;
}

/** Lee una etiqueta nutricional (no guarda). */
export async function leerEtiqueta(fotoUri: string, idToken: string): Promise<EtiquetaNutricional> {
  const nombre = fotoUri.split('/').pop() || `etiqueta-${Date.now()}.jpg`;
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(fotoUri)).blob();
    form.append('foto', blob, nombre);
  } else {
    form.append('foto', { uri: fotoUri, name: nombre, type: inferirMime(nombre) } as unknown as Blob);
  }

  const url = `${API_BASE_URL}/api/comidas/leer-etiqueta`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, Accept: 'application/json' },
      body: form,
    });
  } catch (e) {
    throw new ApiError(`No se pudo conectar con el backend (${url}). ${e instanceof Error ? e.message : ''}`, 0);
  }
  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    if (res.status === 401) throw new ApiError('No autorizado (401).', 401);
    throw new ApiError(detalle.slice(0, 300) || `El backend respondió ${res.status}.`, res.status);
  }
  return (await res.json()) as EtiquetaNutricional;
}

export interface GuardarEtiquetaPayload extends EtiquetaNutricional {
  porciones: number;
  tipo: TipoComida;
  fechaLocal: string;
}

/** Guarda una comida desde los datos de una etiqueta + porciones. */
export async function guardarEtiqueta(
  payload: GuardarEtiquetaPayload,
  idToken: string,
): Promise<RegistroComida> {
  const url = `${API_BASE_URL}/api/comidas/guardar-etiqueta`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    throw new ApiError(`No se pudo conectar con el backend (${url}). ${e instanceof Error ? e.message : ''}`, 0);
  }
  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    if (res.status === 401) throw new ApiError('No autorizado (401).', 401);
    throw new ApiError(detalle.slice(0, 300) || `El backend respondió ${res.status}.`, res.status);
  }
  return (await res.json()) as RegistroComida;
}
