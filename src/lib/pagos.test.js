/**
 * Tests de la interpretación de los datos de cobro.
 *
 * El riesgo real acá es fabricar un link roto a partir de un alias: el
 * cliente tocaría "Pagar" y aterrizaría en una página inexistente en vez de
 * en Mercado Pago, justo en el momento en que estaba por pagar.
 */
const assert = require('node:assert');

function comoUrl(valor) {
  const limpio = String(valor ?? '').trim();
  if (!limpio || /\s/.test(limpio)) return null;
  if (/^https?:\/\//i.test(limpio)) return limpio;
  const pareceDominio = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(limpio);
  const tieneRuta = limpio.includes('/');
  return pareceDominio && tieneRuta ? `https://${limpio}` : null;
}

const ETIQUETAS = {
  mp: 'Pagar con Mercado Pago',
  paypal: 'Pagar con PayPal',
  alias: 'Copiar alias',
  cbu: 'Copiar CBU',
};

function accionDePago(info) {
  const valor = info?.valor?.trim();
  if (!valor) return null;
  const tipo = info?.tipo ?? 'alias';
  const etiqueta = ETIQUETAS[tipo] ?? 'Copiar datos de pago';
  if (tipo === 'mp' || tipo === 'paypal') {
    const url = comoUrl(valor);
    if (url) return { clase: 'link', url, etiqueta };
  }
  return { clase: 'copiar', valor, etiqueta };
}

let pasaron = 0;
const test = (n, fn) => {
  try { fn(); pasaron++; } catch (e) {
    console.error('FALLA: ' + n + '\n  ' + e.message);
    process.exitCode = 1;
  }
};

test('un link de MP sin esquema se completa', () => {
  assert.equal(comoUrl('link.mercadopago.com.ar/miestudio'), 'https://link.mercadopago.com.ar/miestudio');
  assert.equal(comoUrl('paypal.me/miestudio'), 'https://paypal.me/miestudio');
});

test('un link ya completo no se toca', () => {
  assert.equal(comoUrl('https://link.mercadopago.com.ar/x'), 'https://link.mercadopago.com.ar/x');
  assert.equal(comoUrl('http://ejemplo.com/pago'), 'http://ejemplo.com/pago');
});

test('un alias NO se convierte en link aunque tenga puntos', () => {
  // El caso peligroso: "mi.alias.mp" parece un dominio.
  assert.equal(comoUrl('mi.alias.mp'), null);
  assert.equal(comoUrl('tamara.pagos'), null);
  assert.equal(comoUrl('estudio.norte.ar'), null);
});

test('un CBU no es un link', () => {
  assert.equal(comoUrl('0000003100000000000000'), null);
});

test('texto con espacios no es un link', () => {
  assert.equal(comoUrl('mi alias mp'), null);
  assert.equal(comoUrl(''), null);
  assert.equal(comoUrl('   '), null);
});

test('MP con link da un boton de pago', () => {
  const a = accionDePago({ tipo: 'mp', valor: 'link.mercadopago.com.ar/miestudio' });
  assert.equal(a.clase, 'link');
  assert.equal(a.url, 'https://link.mercadopago.com.ar/miestudio');
  assert.equal(a.etiqueta, 'Pagar con Mercado Pago');
});

test('MP cargado como alias cae a copiar, no a un link roto', () => {
  // Alguien puede elegir "Mercado Pago" y pegar su alias en vez del link.
  const a = accionDePago({ tipo: 'mp', valor: 'mi.alias.mp' });
  assert.equal(a.clase, 'copiar', 'no debe inventar un link');
  assert.equal(a.valor, 'mi.alias.mp');
});

test('alias y CBU se copian, con su etiqueta', () => {
  assert.deepEqual(accionDePago({ tipo: 'alias', valor: 'mi.alias.mp' }), {
    clase: 'copiar', valor: 'mi.alias.mp', etiqueta: 'Copiar alias',
  });
  assert.equal(accionDePago({ tipo: 'cbu', valor: '00000031000' }).etiqueta, 'Copiar CBU');
});

test('un CBU cargado como link de MP nunca abre nada', () => {
  const a = accionDePago({ tipo: 'mp', valor: '0000003100000000000000' });
  assert.equal(a.clase, 'copiar');
});

test('sin datos de cobro no hay accion', () => {
  assert.equal(accionDePago(null), null);
  assert.equal(accionDePago({}), null);
  assert.equal(accionDePago({ tipo: 'mp', valor: '   ' }), null);
});

console.log(pasaron + ' tests de pagos OK');
