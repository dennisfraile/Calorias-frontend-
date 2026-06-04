import type { Spec } from 'mythik';
import { HISTORIAL_PATH } from '../config';

/**
 * Pantalla de HISTORIAL como AppSpec JSON de Mythik (modelo JSON-native).
 *
 * Props verificados contra los docs locales empaquetados:
 *   node_modules/mythik/docs/consumer/ai-context.md  (estructura, expresiones, derive, fetch)
 *   node_modules/mythik/docs/consumer/ai-context-primitives.md  (props de cada primitivo)
 *
 * Solo se usan primitivos SOPORTADOS por el renderer nativo (matriz de
 * mythik-react-native README): stack, box, text, list. Se evita `table` y los
 * charts (son "native milestone primitives", no renderizan en RN), y se evita
 * `$token` porque este proyecto no define tokens ("If no tokens defined, use
 * direct CSS values").
 *
 * DATOS REALES: `initialActions` hace un `fetch` GET a HISTORIAL_PATH y escribe
 * la respuesta en /comidas. La URL es relativa: el `urlResolver` del host la
 * resuelve contra el backend y el `fetcher` del host inyecta el Bearer token
 * (ver HistoryScreen.tsx). El `fetch` gestiona /ui/loading y, vía errorTarget,
 * /ui/loadErrors/comidas. La auth NO vive dentro del spec.
 */
export const historialSpec: Spec = {
  root: 'screen',

  initialActions: [
    {
      action: 'fetch',
      params: {
        url: HISTORIAL_PATH, // relativa; la resuelve urlResolver del host
        method: 'GET',
        target: '/comidas',
        errorTarget: '/ui/loadErrors/comidas',
      },
    },
  ],

  // Totales reactivos: se recalculan solos cuando /comidas cambia.
  derive: {
    '/resumen/total': { $array: 'count', source: { $state: '/comidas' } },
    '/resumen/kcal': { $array: 'sum', source: { $state: '/comidas' }, field: 'calorias' },
    '/resumen/prot': { $array: 'sum', source: { $state: '/comidas' }, field: 'proteinas' },
  },

  elements: {
    screen: {
      type: 'stack',
      props: { direction: 'vertical', gap: 16 },
      style: { padding: 24, backgroundColor: '#0B1120' },
      children: ['titulo', 'subtitulo', 'error', 'cargando', 'resumen', 'lista', 'vacio'],
    },

    titulo: {
      type: 'text',
      props: { content: 'Historial', variant: 'heading' },
      style: { color: '#F8FAFC', fontSize: 26, fontWeight: '700' },
    },
    subtitulo: {
      type: 'text',
      props: { content: 'Pantalla data-driven renderizada desde un AppSpec JSON de Mythik.', variant: 'caption' },
      style: { color: '#94A3B8', fontSize: 13 },
    },

    // Estado de error de carga (lo escribe el fetch en errorTarget).
    error: {
      type: 'text',
      props: { content: 'No se pudo cargar el historial. ¿Backend arriba y sesión iniciada?', variant: 'body' },
      style: { color: '#F87171', fontSize: 14, paddingVertical: 12 },
      visible: { $state: '/ui/loadErrors/comidas' },
    },

    // Estado de carga (mientras el fetch está en vuelo y aún no hay datos).
    cargando: {
      type: 'text',
      props: { content: 'Cargando…', variant: 'body' },
      style: { color: '#94A3B8', fontSize: 14, paddingVertical: 12 },
      visible: {
        $and: [
          { $state: '/ui/loading' },
          { $not: { $array: 'count', source: { $state: '/comidas' } } },
        ],
      },
    },

    // Tarjeta resumen: lee los valores derivados vía $template (${/ruta}).
    resumen: {
      type: 'box',
      props: { surface: 'card' },
      style: {
        backgroundColor: '#111A2E',
        borderColor: '#243049',
        borderWidth: 1,
        borderRadius: 22,
        padding: 20,
      },
      children: ['resumen-kcal', 'resumen-detalle'],
      visible: { $array: 'count', source: { $state: '/comidas' } },
    },
    'resumen-kcal': {
      type: 'text',
      props: { content: { $template: '${/resumen/kcal} kcal' } },
      style: { color: '#22C55E', fontSize: 28, fontWeight: '800' },
    },
    'resumen-detalle': {
      type: 'text',
      props: {
        content: { $template: '${/resumen/total} comidas · ${/resumen/prot} g de proteína' },
      },
      style: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
    },

    // Lista con repeat sobre /comidas. Cada item renderiza el elemento "fila".
    lista: {
      type: 'list',
      props: {},
      style: { gap: 10 },
      repeat: { statePath: '/comidas', key: 'id' },
      children: ['fila'],
      visible: { $array: 'count', source: { $state: '/comidas' } },
    },
    fila: {
      type: 'stack',
      props: { direction: 'horizontal', justify: 'between', align: 'center', gap: 12 },
      style: {
        backgroundColor: '#111A2E',
        borderColor: '#243049',
        borderWidth: 1,
        borderRadius: 14,
        padding: 16,
      },
      children: ['fila-info', 'fila-kcal'],
    },
    'fila-info': {
      type: 'stack',
      props: { direction: 'vertical', gap: 4 },
      children: ['fila-nombre', 'fila-macros'],
    },
    'fila-nombre': {
      type: 'text',
      props: { content: { $item: 'nombre' } },
      style: { color: '#F8FAFC', fontSize: 15, fontWeight: '600' },
    },
    // $template NO resuelve $item directamente: se captura primero en $let.
    'fila-macros': {
      type: 'text',
      props: {
        content: {
          $let: {
            p: { $item: 'proteinas' },
            c: { $item: 'carbohidratos' },
            g: { $item: 'grasas' },
            h: { $item: 'hora' },
          },
          $in: { $template: '${h} · P ${p} · C ${c} · G ${g}' },
        },
        variant: 'caption',
      },
      style: { color: '#94A3B8', fontSize: 12 },
    },
    'fila-kcal': {
      type: 'text',
      props: {
        content: {
          $let: { k: { $item: 'calorias' } },
          $in: { $template: '${k} kcal' },
        },
      },
      style: { color: '#38BDF8', fontSize: 15, fontWeight: '700' },
    },

    // Estado vacío: sin carga, sin error y sin comidas.
    vacio: {
      type: 'text',
      props: { content: 'Aún no hay comidas registradas.', variant: 'body' },
      style: { color: '#94A3B8', fontSize: 14, paddingVertical: 24 },
      visible: {
        $and: [
          { $not: { $state: '/ui/loading' } },
          { $not: { $array: 'count', source: { $state: '/comidas' } } },
          { $not: { $state: '/ui/loadErrors/comidas' } },
        ],
      },
    },
  },
};
