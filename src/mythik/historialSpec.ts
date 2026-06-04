import type { Spec, Expression } from 'mythik';

/**
 * Pantalla de HISTORIAL como AppSpec JSON de Mythik (modelo JSON-native).
 *
 * Props verificados contra los docs locales empaquetados:
 *   node_modules/mythik/docs/consumer/ai-context.md  (estructura, expresiones, derive)
 *   node_modules/mythik/docs/consumer/ai-context-primitives.md  (props de cada primitivo)
 *
 * Solo se usan primitivos SOPORTADOS por el renderer nativo (matriz de
 * mythik-react-native README): stack, box, text, list, divider. Se evita
 * `table` y los charts (son "native milestone primitives", no renderizan en RN),
 * y se evita `$token` porque este proyecto no define tokens (los docs dicen:
 * "If no tokens defined, use direct CSS values").
 *
 * Los datos se SIEMBRAN en estado vía initialActions (demo autocontenida que
 * funciona sin backend). Para datos reales, sustituir el setState de /comidas
 * por un `fetch` (o un `dataSources`) contra HISTORIAL_URL — ver HistoryScreen.
 */

const COMIDAS_DEMO = [
  { id: '1', nombre: 'Ensalada César con pollo', calorias: 420, proteinas: 35, carbohidratos: 18, grasas: 22, hora: '08:30' },
  { id: '2', nombre: 'Pasta boloñesa', calorias: 650, proteinas: 28, carbohidratos: 80, grasas: 21, hora: '13:15' },
  { id: '3', nombre: 'Yogur griego con frutos rojos', calorias: 180, proteinas: 15, carbohidratos: 20, grasas: 5, hora: '17:00' },
  { id: '4', nombre: 'Salmón al horno con verduras', calorias: 510, proteinas: 40, carbohidratos: 22, grasas: 28, hora: '20:45' },
];

export const historialSpec: Spec = {
  root: 'screen',

  // Siembra de datos (demo). Reemplazable por un fetch real al backend.
  initialActions: [
    // El tipo Expression no enumera "array literal de objetos" (que el runtime sí
    // acepta como valor JSON); cast puntual sobre el dato sembrado.
    {
      action: 'setState',
      params: { statePath: '/comidas', value: COMIDAS_DEMO as unknown as Expression },
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
      children: ['titulo', 'subtitulo', 'resumen', 'lista', 'vacio'],
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
      props: { content: { $template: '${/resumen/kcal} kcal hoy' } },
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

    // Estado vacío: visible cuando no hay comidas (count 0 es falsy → $not = true).
    vacio: {
      type: 'text',
      props: { content: 'Aún no hay comidas registradas.', variant: 'body' },
      style: { color: '#94A3B8', fontSize: 14, paddingVertical: 24 },
      visible: { $not: { $array: 'count', source: { $state: '/comidas' } } },
    },
  },
};
