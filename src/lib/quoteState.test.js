/**
 * Tests de los estados derivados.
 *
 * Sin framework: `node src/lib/quoteState.test.js`.
 *
 * Estos estados no se guardan en la base, se calculan según el tiempo
 * transcurrido, así que son exactamente el tipo de lógica que puede quedar
 * muerta sin que nada falle: durante varias versiones "Vencido" y "Por
 * vencer" eran inalcanzables porque no había forma de cargar valid_until, y
 * ni el compilador ni el bundle se quejaron.
 */
const assert = require('node:assert');

const DIAS_SIN_RESPUESTA = 7;
const DIAS_PARA_MORA = 14;
const DIAS_POR_VENCER = 3;

// --- Copia de la lógica de src/lib/quoteState.ts ---
const dias = (iso) =>
  iso === null ? 0 : Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

const diasHasta = (fecha) => {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(fecha).getTime() - hoy.getTime()) / 86_400_000);
};

function quoteView(q) {
  if (q.status === 'cobrado') return 'cobrado';
  if (q.status === 'rechazado') return 'rechazado';
  if (q.status === 'anulado') return 'anulado';
  if (q.status === 'borrador') return 'borrador';

  if (q.status === 'aprobado') {
    return dias(q.approved_at ?? null) >= DIAS_PARA_MORA ? 'moroso' : 'aprobado';
  }

  const faltan = diasHasta(q.valid_until);
  if (faltan !== null && faltan < 0) return 'vencido';
  if (faltan !== null && faltan <= DIAS_POR_VENCER) return 'por_vencer';
  if (dias(q.sent_at) >= DIAS_SIN_RESPUESTA) return 'sin_respuesta';

  return 'enviado';
}

// --- Ayudas ---
const haceDias = (n) => new Date(Date.now() - n * 86_400_000).toISOString();
const fechaEnDias = (n) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
};

let pasaron = 0;
const test = (nombre, fn) => {
  try {
    fn();
    pasaron++;
  } catch (e) {
    console.error('FALLA: ' + nombre + '\n  ' + e.message);
    process.exitCode = 1;
  }
};

// --- Estados finales: el tiempo no los mueve ---

test('los estados cerrados no cambian con el tiempo', () => {
  for (const status of ['cobrado', 'rechazado', 'anulado', 'borrador']) {
    const q = { status, sent_at: haceDias(400), valid_until: fechaEnDias(-400) };
    assert.equal(quoteView(q), status, status + ' no deberia derivar a otra cosa');
  }
});

// --- Los que motivaron el campo de vencimiento ---

test('vencido: la fecha de validez ya paso', () => {
  const q = { status: 'enviado', sent_at: haceDias(1), valid_until: fechaEnDias(-1) };
  assert.equal(quoteView(q), 'vencido');
});

test('por vencer: faltan 3 dias o menos', () => {
  for (const n of [0, 1, 3]) {
    const q = { status: 'enviado', sent_at: haceDias(1), valid_until: fechaEnDias(n) };
    assert.equal(quoteView(q), 'por_vencer', 'con ' + n + ' dias deberia avisar');
  }
});

test('con 4 dias todavia no avisa', () => {
  const q = { status: 'enviado', sent_at: haceDias(1), valid_until: fechaEnDias(4) };
  assert.equal(quoteView(q), 'enviado');
});

test('el vencimiento manda sobre el silencio', () => {
  // Mandado hace mucho Y por vencer: lo urgente es la fecha, no el silencio.
  const q = { status: 'enviado', sent_at: haceDias(30), valid_until: fechaEnDias(2) };
  assert.equal(quoteView(q), 'por_vencer');
});

// --- Silencio y mora ---

test('sin respuesta: 7 dias sin contestar y sin fecha de vencimiento', () => {
  const q = { status: 'enviado', sent_at: haceDias(7), valid_until: null };
  assert.equal(quoteView(q), 'sin_respuesta');
});

test('recien mandado sigue siendo enviado', () => {
  const q = { status: 'enviado', sent_at: haceDias(2), valid_until: null };
  assert.equal(quoteView(q), 'enviado');
});

test('moroso: aprobado hace 14 dias y sin cobrar', () => {
  const q = { status: 'aprobado', approved_at: haceDias(14), sent_at: haceDias(20) };
  assert.equal(quoteView(q), 'moroso');
});

test('aprobado hace poco no es moroso', () => {
  const q = { status: 'aprobado', approved_at: haceDias(3), sent_at: haceDias(10) };
  assert.equal(quoteView(q), 'aprobado');
});

test('quien no contesto no es moroso: no debe plata todavia', () => {
  const q = { status: 'enviado', sent_at: haceDias(60), valid_until: null };
  assert.equal(quoteView(q), 'sin_respuesta');
});

// --- Alcanzabilidad: cada estado tiene que poder darse ---

test('los diez estados son alcanzables', () => {
  const casos = {
    borrador: { status: 'borrador' },
    enviado: { status: 'enviado', sent_at: haceDias(1), valid_until: null },
    sin_respuesta: { status: 'enviado', sent_at: haceDias(10), valid_until: null },
    por_vencer: { status: 'enviado', sent_at: haceDias(1), valid_until: fechaEnDias(2) },
    vencido: { status: 'enviado', sent_at: haceDias(1), valid_until: fechaEnDias(-5) },
    aprobado: { status: 'aprobado', approved_at: haceDias(1) },
    moroso: { status: 'aprobado', approved_at: haceDias(30) },
    cobrado: { status: 'cobrado' },
    rechazado: { status: 'rechazado' },
    anulado: { status: 'anulado' },
  };
  for (const [esperado, q] of Object.entries(casos)) {
    assert.equal(quoteView(q), esperado, esperado + ' quedo inalcanzable');
  }
});

console.log(pasaron + ' tests de estados OK');
