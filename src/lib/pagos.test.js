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

const ETIQUETA_LINK = {
  mp: 'Pagar con Mercado Pago',
  paypal: 'Pagar con PayPal',
  alias: 'Pagar',
  cbu: 'Pagar',
};

const ETIQUETA_COPIA = {
  mp: 'Copiar datos de pago',
  paypal: 'Copiar datos de pago',
  alias: 'Copiar alias',
  cbu: 'Copiar CBU',
};

function accionDePago(info) {
  const valor = info?.valor?.trim();
  if (!valor) return null;
  const tipo = info?.tipo ?? 'alias';
  if (tipo === 'mp' || tipo === 'paypal') {
    const url = comoUrl(valor);
    if (url) return { clase: 'link', url, etiqueta: ETIQUETA_LINK[tipo] };
  }
  return { clase: 'copiar', valor, etiqueta: ETIQUETA_COPIA[tipo] ?? 'Copiar datos de pago' };
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
  // El bug que motivo este test: la accion era correcta pero el boton seguia
  // diciendo "Pagar con Mercado Pago" y lo unico que hacia era copiar.
  assert.equal(a.etiqueta, 'Copiar datos de pago', 'el texto tiene que decir lo que hace');
});

test('INVARIANTE: el texto del boton coincide con lo que hace', () => {
  // Esta es la proteccion de verdad: no importa que combinacion entre, un
  // boton que copia nunca puede decir "Pagar" ni al reves.
  const tipos = ['mp', 'paypal', 'alias', 'cbu'];
  const valores = [
    'mi.alias.mp',
    'link.mercadopago.com.ar/x',
    'https://paypal.me/x',
    '0000003100000000000000',
    'cualquier cosa',
    'sin.puntos',
  ];

  for (const tipo of tipos) {
    for (const valor of valores) {
      const a = accionDePago({ tipo, valor });
      if (!a) continue;
      const dicePagar = /pagar/i.test(a.etiqueta);
      const diceCopiar = /copiar/i.test(a.etiqueta);

      if (a.clase === 'link') {
        assert.ok(dicePagar, `link con texto "${a.etiqueta}" (${tipo}/${valor})`);
        assert.ok(!diceCopiar, `un link no deberia decir copiar: ${a.etiqueta}`);
      } else {
        assert.ok(diceCopiar, `copiar con texto "${a.etiqueta}" (${tipo}/${valor})`);
        assert.ok(!dicePagar, `copiar no deberia decir pagar: ${a.etiqueta} (${tipo}/${valor})`);
      }
    }
  }
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

// ============================================================
// Link propio del presupuesto
// ============================================================

function etiquetaDeUrl(url) {
  if (/mercadopago|mercadolibre/i.test(url)) return 'Pagar con Mercado Pago';
  if (/paypal/i.test(url)) return 'Pagar con PayPal';
  if (/modo/i.test(url)) return 'Pagar con MODO';
  return 'Pagar este presupuesto';
}

function accionDePagoDe(linkDelPresupuesto, info) {
  const propio = linkDelPresupuesto?.trim();
  if (propio) {
    const url = comoUrl(propio);
    if (url) return { clase: 'link', url, etiqueta: etiquetaDeUrl(url) };
  }
  return accionDePago(info);
}

const ALIAS = { tipo: 'alias', valor: 'mi.alias.mp' };

test('el link del presupuesto gana sobre los datos generales', () => {
  const a = accionDePagoDe('link.mercadopago.com.ar/p/29500', ALIAS);
  assert.equal(a.clase, 'link');
  assert.equal(a.url, 'https://link.mercadopago.com.ar/p/29500');
  assert.equal(a.etiqueta, 'Pagar con Mercado Pago');
});

test('sin link propio se usa lo general', () => {
  assert.deepEqual(accionDePagoDe(null, ALIAS), accionDePago(ALIAS));
  assert.deepEqual(accionDePagoDe('', ALIAS), accionDePago(ALIAS));
  assert.deepEqual(accionDePagoDe('   ', ALIAS), accionDePago(ALIAS));
});

test('un link propio invalido NO deja al cliente sin forma de pagar', () => {
  // Alguien pega cualquier cosa en el campo: mejor caer al alias del negocio
  // que mostrar un boton que no lleva a ningun lado.
  const a = accionDePagoDe('esto no es un link', ALIAS);
  assert.equal(a.clase, 'copiar');
  assert.equal(a.valor, 'mi.alias.mp');
});

test('el medio se nombra segun el dominio', () => {
  assert.equal(accionDePagoDe('paypal.me/x/100', null).etiqueta, 'Pagar con PayPal');
  assert.equal(accionDePagoDe('https://otracosa.com/pagar', null).etiqueta, 'Pagar este presupuesto');
});

test('sin nada cargado no hay accion', () => {
  assert.equal(accionDePagoDe(null, null), null);
  assert.equal(accionDePagoDe('no-es-link', {}), null);
});

console.log('5 tests de link por presupuesto OK');
