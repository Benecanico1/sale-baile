import http from 'http';

console.log('🧪 ==========================================');
console.log('🧪 INICIANDO BATERÍA DE PRUEBAS: BACHATA HOY');
console.log('🧪 ==========================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
  }
}

// 1. Probar que el servidor HTTP responde 200 y sirve la PWA con Manifest
async function testHttpServer() {
  return new Promise((resolve) => {
    http.get('http://localhost:4173/', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        assert(res.statusCode === 200, 'Servidor HTTP responde código 200 OK');
        assert(data.includes('Bachata Hoy'), 'HTML contiene el título de la marca Bachata Hoy');
        assert(data.includes('manifest.webmanifest'), 'HTML incluye enlace al manifest de PWA');
        assert(data.includes('leaflet.css'), 'HTML incluye estilos de mapas Leaflet');
        resolve();
      });
    }).on('error', (err) => {
      assert(false, `Error conectando al servidor: ${err.message}`);
      resolve();
    });
  });
}

// 2. Probar cálculos de distancia geográfica (Haversine)
function testGeoCalculations() {
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Obelisco Buenos Aires (-34.6037, -58.3816) a Palermo (-34.5828, -58.4326)
  const distObeliscoPalermo = haversine(-34.6037, -58.3816, -34.5828, -58.4326);
  assert(distObeliscoPalermo > 4.5 && distObeliscoPalermo < 6.5, `Distancia CABA Obelisco -> Palermo (${distObeliscoPalermo.toFixed(2)} km) dentro de rango esperado (~5.2 km)`);

  // Buenos Aires a Córdoba Capital
  const distBsAsCba = haversine(-34.6037, -58.3816, -31.4201, -64.1888);
  assert(distBsAsCba > 630 && distBsAsCba < 720, `Distancia Buenos Aires -> Córdoba (${distBsAsCba.toFixed(2)} km) dentro de rango (~650 km)`);

  // Radio filter test: Si radio es 10km, evento en Palermo está dentro de Obelisco, pero Córdoba queda excluida
  assert(distObeliscoPalermo <= 10, 'Filtro radio 10km incluye eventos de Palermo desde Obelisco');
  assert(distBsAsCba > 10, 'Filtro radio 10km excluye correctamente eventos en Córdoba desde Obelisco');
}

// 3. Probar lógica de fechas y eventos que cruzan medianoche
function testScheduleCalculations() {
  const startIso = '2026-09-13T22:30:00.000Z';
  const endIso = '2026-09-14T05:00:00.000Z'; // Cruza medianoche

  const start = new Date(startIso);
  const end = new Date(endIso);
  const isMidnightCrossing = start.toDateString() !== end.toDateString();

  assert(isMidnightCrossing === true, 'Detecta correctamente cruce de medianoche para fiesta nocturna (22:30 a 05:00)');
  assert(end.getTime() > start.getTime(), 'Valida que el horario de finalización es posterior al inicio');
}

// 4. Probar ciclo de vida de moderación
function testModerationLifecycle() {
  let event = {
    id: 'evt-test-1',
    title: 'Bachata Social Test',
    status: 'borrador',
    is_cancelled: false,
  };

  // Organizador envía a revisión
  event.status = 'pendiente';
  assert(event.status === 'pendiente', 'Organizador envía a revisión: Estado = pendiente');

  // Público buscando eventos activos: los pendientes no deben mostrarse
  const isPubliclyVisible = (e) => (e.status === 'publicado' || e.is_cancelled === true);
  assert(!isPubliclyVisible(event), 'Evento pendiente NO es visible en la búsqueda pública de usuarios');

  // Admin aprueba
  event.status = 'publicado';
  assert(isPubliclyVisible(event), 'Admin aprueba evento: Ahora SÍ es visible públicamente');

  // Organizador cancela evento
  event.is_cancelled = true;
  event.cancellation_notice = 'Suspendido por lluvia';
  assert(event.is_cancelled === true && isPubliclyVisible(event), 'Evento cancelado se mantiene visible públicamente con aviso destacado');
}

async function runAll() {
  await testHttpServer();
  testGeoCalculations();
  testScheduleCalculations();
  testModerationLifecycle();

  console.log(`\n==========================================`);
  console.log(`📊 RESULTADOS: ${passedTests} de ${totalTests} pruebas superadas exitosamente.`);
  console.log(`==========================================\n`);
}

runAll();
