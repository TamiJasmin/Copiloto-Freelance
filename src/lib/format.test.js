/**
 * Tests de diasHasta.
 *
 * Esta funcion tuvo dos bugs distintos a la vez y ninguno hizo fallar nada:
 * comparaba medianoche contra mediodia (sumaba 1 a TODO, asi que el chip de
 * vencimiento no se marcaba nunca) y en otra copia parseaba la fecha como
 * UTC, corriendola un dia en Argentina.
 */
const assert = require('node:assert');

function diasHasta(fecha) {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const objetivo = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(objetivo.getTime())) return null;
  objetivo.setHours(0, 0, 0, 0);
  return Math.round((objetivo.getTime() - hoy.getTime()) / 86_400_000);
}

function fechaEnDias(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

let pasaron = 0;
const test = (n, fn) => {
  try { fn(); pasaron++; } catch (e) {
    console.error('FALLA: ' + n + '\n  ' + e.message);
    process.exitCode = 1;
  }
};

test('ida y vuelta exacta: lo que se genera es lo que se lee', () => {
  for (const n of [0, 1, 2, 3, 7, 14, 15, 30, 60, 365, -1, -5, -30]) {
    assert.equal(diasHasta(fechaEnDias(n)), n, 'fallo con ' + n + ' dias');
  }
});

test('hoy es cero, no uno', () => {
  assert.equal(diasHasta(fechaEnDias(0)), 0);
});

test('los chips del selector coinciden con su opcion', () => {
  // El bug original: 15 dias devolvia 16 y ningun chip quedaba marcado.
  for (const dias of [7, 15, 30]) {
    assert.equal(diasHasta(fechaEnDias(dias)), dias, 'el chip de ' + dias + ' dias no se marcaria');
  }
});

test('el limite de "por vencer" cae donde corresponde', () => {
  assert.ok(diasHasta(fechaEnDias(3)) <= 3, 'con 3 dias tiene que avisar');
  assert.ok(diasHasta(fechaEnDias(4)) > 3, 'con 4 dias todavia no');
});

test('el limite de "vencido" cae donde corresponde', () => {
  assert.ok(diasHasta(fechaEnDias(0)) >= 0, 'hoy no esta vencido');
  assert.ok(diasHasta(fechaEnDias(-1)) < 0, 'ayer si');
});

test('sin fecha o con basura devuelve null', () => {
  assert.equal(diasHasta(null), null);
  assert.equal(diasHasta(undefined), null);
  assert.equal(diasHasta(''), null);
  assert.equal(diasHasta('no-es-fecha'), null);
});

console.log(pasaron + ' tests de fechas OK');
