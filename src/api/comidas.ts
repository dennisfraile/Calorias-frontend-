import { Platform } from 'react-native';
import { ANALIZAR_URL } from '../config';

/** Un alimento detectado dentro de una comida (forma aproximada del DTO del backend). */
export interface DetalleComida {
  nombre?: string;
  calorias?: number;
  proteinas?: number;
  carbohidratos?: number;
  grasas?: number;
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
 * recibiría archivo → 400 "The foto field is required").
 */
export async function analizarFoto(
  fotoUri: string,
  idToken: string,
): Promise<RegistroComida> {
  const nombre = fotoUri.split('/').pop() || `comida-${Date.now()}.jpg`;
  const tipo = inferirMime(nombre);

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
      type: tipo,
    } as unknown as Blob);
  }

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
