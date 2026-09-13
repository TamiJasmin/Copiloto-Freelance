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

// ============================================================
// duracionValidez: copiar la duración, no la fecha
// ============================================================

function duracionValidez(creadoISO, vence) {
  if (!vence) return null;
  const creado = new Date(creadoISO);
  const limite = new Date(`${vence}T12:00:00`);
  if (Number.isNaN(creado.getTime()) || Number.isNaN(limite.getTime())) return null;
  creado.setHours(0, 0, 0, 0);
  limite.setHours(0, 0, 0, 0);
  const dias = Math.round((limite.getTime() - creado.getTime()) / 86_400_000);
  return dias > 0 ? dias : null;
}

const haceDias = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

test('recupera la duracion original', () => {
  // Creado hace 60 dias, vencia 15 dias despues: la duracion era 15.
  assert.equal(duracionValidez(haceDias(60), fechaEnDias(-45)), 15);
  assert.equal(duracionValidez(haceDias(30), fechaEnDias(-23)), 7);
  assert.equal(duracionValidez(haceDias(10), fechaEnDias(20)), 30);
});

test('una plantilla vieja no arrastra su fecha vencida', () => {
  // Este es el caso que motiva la funcion: copiar la fecha tal cual dejaria
  // el presupuesto nuevo vencido desde el momento de crearlo.
  const duracion = duracionValidez(haceDias(90), fechaEnDias(-75));
  assert.equal(duracion, 15);
  assert.ok(diasHasta(fechaEnDias(duracion)) > 0, 'la fecha nueva tiene que estar en el futuro');
});

test('sin vencimiento no inventa uno', () => {
  assert.equal(duracionValidez(haceDias(10), null), null);
  assert.equal(duracionValidez(haceDias(10), ''), null);
});

test('una duracion invalida se descarta', () => {
  // Vencimiento anterior a la creacion: dato roto, mejor null que negativo.
  assert.equal(duracionValidez(haceDias(10), fechaEnDias(-20)), null);
  assert.equal(duracionValidez(haceDias(10), 'no-es-fecha'), null);
});

console.log('4 tests de duracion OK');
