// Genera src/lib/firebaseConfig.ts a partir de la salida de `firebase apps:sdkconfig`.
// No imprime la apiKey por consola (config web de Firebase es publica, pero no se muestra).
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const src = readFileSync('scripts/.fbconfig.json', 'utf8');
const start = src.indexOf('{');
const end = src.lastIndexOf('}');
if (start < 0 || end < 0) {
  throw new Error('No se encontro JSON en scripts/.fbconfig.json');
}
const cfg = JSON.parse(src.slice(start, end + 1));

const body =
  '// GENERADO por scripts/gen_firebase_config.mjs — no editar a mano.\n' +
  '// La config web de Firebase es PUBLICA (el apiKey del cliente no es un secreto).\n' +
  'export const firebaseConfig = ' +
  JSON.stringify(cfg, null, 2) +
  ';\n';

writeFileSync('src/lib/firebaseConfig.ts', body);
unlinkSync('scripts/.fbconfig.json');
console.log('OK -> src/lib/firebaseConfig.ts (projectId:', cfg.projectId, ')');
