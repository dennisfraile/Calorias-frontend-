import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

export type IconName =
  | 'camera'
  | 'images'
  | 'zap'
  | 'history'
  | 'check'
  | 'save'
  | 'logout'
  | 'chevronLeft'
  | 'barChart'
  | 'user'
  | 'sun'
  | 'moon'
  | 'flame';

/**
 * Íconos de línea propios (react-native-svg), sin dependencias externas.
 * `color` controla el trazo; por defecto el texto del tema.
 */
export default function Icon({
  name,
  size = 18,
  color = '#94A3B8',
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const p = {
    stroke: color,
    strokeWidth: 2,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const svg = (children: React.ReactNode) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {children}
    </Svg>
  );

  switch (name) {
    case 'camera':
      return svg(
        <>
          <Path {...p} d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <Circle {...p} cx="12" cy="13" r="4" />
        </>,
      );
    case 'images':
      return svg(
        <>
          <Rect {...p} x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <Circle {...p} cx="8.5" cy="8.5" r="1.5" />
          <Polyline {...p} points="21 15 16 10 5 21" />
        </>,
      );
    case 'zap':
      return svg(<Polygon {...p} points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />);
    case 'history':
      return svg(
        <>
          <Circle {...p} cx="12" cy="12" r="9" />
          <Polyline {...p} points="12 7 12 12 15 14" />
        </>,
      );
    case 'check':
      return svg(<Polyline {...p} points="20 6 9 17 4 12" />);
    case 'save':
      return svg(
        <>
          <Path {...p} d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <Polyline {...p} points="17 21 17 13 7 13 7 21" />
          <Polyline {...p} points="7 3 7 8 15 8" />
        </>,
      );
    case 'logout':
      return svg(
        <>
          <Path {...p} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <Polyline {...p} points="16 17 21 12 16 7" />
          <Line {...p} x1="21" y1="12" x2="9" y2="12" />
        </>,
      );
    case 'chevronLeft':
      return svg(<Polyline {...p} points="15 18 9 12 15 6" />);
    case 'barChart':
      return svg(
        <>
          <Line {...p} x1="6" y1="20" x2="6" y2="16" />
          <Line {...p} x1="12" y1="20" x2="12" y2="9" />
          <Line {...p} x1="18" y1="20" x2="18" y2="4" />
        </>,
      );
    case 'user':
      return svg(
        <>
          <Path {...p} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <Circle {...p} cx="12" cy="7" r="4" />
        </>,
      );
    case 'sun':
      return svg(
        <>
          <Circle {...p} cx="12" cy="12" r="5" />
          <Line {...p} x1="12" y1="1" x2="12" y2="3" />
          <Line {...p} x1="12" y1="21" x2="12" y2="23" />
          <Line {...p} x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <Line {...p} x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <Line {...p} x1="1" y1="12" x2="3" y2="12" />
          <Line {...p} x1="21" y1="12" x2="23" y2="12" />
          <Line {...p} x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <Line {...p} x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </>,
      );
    case 'moon':
      return svg(<Path {...p} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />);
    case 'flame':
      return svg(
        <Path
          {...p}
          d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
        />,
      );
    default:
      return null;
  }
}
