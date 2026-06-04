# Calorías — Frontend (Expo + React Native + TypeScript)

App móvil de seguimiento de calorías por foto. Repositorio propio (no monorepo);
el contrato con el [backend .NET](../backend) es la frontera entre ambos.

## Stack

- **Expo SDK 54** + React Native 0.81 + React 19 + TypeScript.
- **Mythik 0.2.1** (`mythik` + `mythik-react-native`) para pantallas data-driven JSON-native.
  > Mythik 0.2.1 soporta Expo 52–54 / RN 0.76–0.81. Por eso el proyecto está fijado a SDK 54
  > (no al último SDK), dentro del rango de peers de `mythik-react-native`.
- **Google Sign-In** vía `expo-auth-session` (flujo ID Token, scopes `openid/profile/email`).

## Enfoque híbrido

- **Captura de foto → React Native clásico** (`expo-image-picker` + `FormData` + `fetch`):
  interacción nativa imperativa. Sube la imagen a `POST /api/comidas/analizar` con
  `Authorization: Bearer <idToken>`. Ver [src/screens/CaptureScreen.tsx](src/screens/CaptureScreen.tsx).
- **Historial → Mythik** (AppSpec JSON renderizado por `MythikRenderer`): demuestra el
  modelo JSON-native con `derive`, `repeat` y expresiones `$item`/`$let`/`$template`.
  Ver [src/mythik/historialSpec.ts](src/mythik/historialSpec.ts) y
  [src/screens/HistoryScreen.tsx](src/screens/HistoryScreen.tsx).

  En RN la autenticación NO va dentro del spec: se inyecta por el `fetcher` del host
  (los docs nativos de Mythik lo indican explícitamente). Solo se usan primitivos
  soportados en RN (`stack`, `box`, `text`, `list`); `table`/charts no renderizan nativamente.

## Configuración

```bash
npm install
cp .env.example .env   # rellena API_BASE_URL y los Client IDs de Google
```

Variables (ver [.env.example](.env.example)):

- `EXPO_PUBLIC_API_BASE_URL` — URL del backend. `localhost:5247` (iOS sim/web),
  `10.0.2.2:5247` (emulador Android) o la IP LAN de tu máquina (dispositivo físico).
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` / `_IOS_` / `_ANDROID_` — OAuth Client IDs de
  Google Cloud Console. El `aud` del token debe coincidir con `ValidAudience` del backend.

## Ejecutar

```bash
npm run start      # Metro + QR para Expo Go / dev client
npm run ios        # iOS Simulator (requiere macOS)
npm run android    # emulador / dispositivo Android
```

## Verificación

```bash
npx tsc --noEmit          # typecheck
npx expo export -p ios    # bundle real de Metro (comprueba resolución + babel)
```

## Estructura

```
App.tsx                      Auth Google + navegación entre Captura/Historial
src/config.ts                URLs y Client IDs desde EXPO_PUBLIC_*
src/theme.ts                 Tokens visuales de las pantallas RN clásicas
src/auth/useGoogleAuth.ts    Hook de Google Sign-In (ID Token)
src/api/comidas.ts           Subida multipart de la foto al backend
src/screens/CaptureScreen.tsx  Pantalla de captura (RN clásico)
src/screens/HistoryScreen.tsx  Host de Mythik para el historial
src/mythik/historialSpec.ts    AppSpec JSON del historial (props verificados)
```

## Notas de configuración

- `babel.config.js` incluye `react-native-worklets/plugin` (Reanimated 4), requerido por
  `mythik-react-native`. Debe ir **último** en la lista de plugins.
- `babel-preset-expo` se declara como devDependency explícita (al existir un
  `babel.config.js` propio, Babel lo resuelve desde la raíz del proyecto).
