// Expo SDK 56+ vendoriza React Navigation dentro de expo-router y bloquea los
// imports de `@react-navigation/*` desde código de app. Esta app no usa expo-router:
// navega con React Navigation standalone, así que no hay doble instancia y el check
// no aplica. Se desactiva aquí (y no vía env var suelta) para que dev, CI y EAS
// compartan la misma config.
process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1';

const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// web/ y backend/ son submódulos (BROKEATE-WEB, BROKEATE-BACKEND) que viven bajo la
// raíz del proyecto. Metro rastrea la raíz entera, así que sin esto indexaría ambos
// repos y podría resolver una segunda copia de React desde sus node_modules.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const submodules = ['web', 'backend'].map(
  (dir) => new RegExp(`^${escapeRe(path.join(__dirname, dir))}[\\\\/].*`)
);

config.resolver.blockList = [
  ...[config.resolver.blockList ?? []].flat(),
  ...submodules,
];

module.exports = withNativeWind(config, { input: './src/style/global.css' });
