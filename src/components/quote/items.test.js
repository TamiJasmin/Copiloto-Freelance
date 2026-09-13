/**
 * Tests de la aritmética de ítems.
 *
 * Sin framework a propósito: se corren con `node src/components/quote/items.test.js`
 * y no agregan dependencias al proyecto. Están acá, y no en un directorio
 * temporal, porque estas funciones ya escondieron dos bugs reales: "150.000"
 * leído como 150, y el precio cargado en el campo de cantidad.
 */
const assert = require('node:assert');

// --- Copias de src/components/quote/ItemsEditor.tsx ---
// (el archivo es TSX y este runner es JS plano; si cambia una, cambia la otra)

const parseAmount = (raw) => {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned) return 0;
  const dots = (cleaned.match(/\./g) ?? []).length;
  const commas = (cleaned.match(/,/g) ?? []).length;
  let normalized;
  if (dots && commas) {
    normalized =
      cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
        ? cleaned.replace(/\./g, '').replace(',', '.')
        : cleaned.replace(/,/g, '');
  } else if (dots || commas) {
    const sep = dots ? '.' : ',';
    const tail = cleaned.slice(cleaned.lastIndexOf(sep) + 1);
    const isThousands = (dots || commas) > 1 || tail.length === 3;
    normalized = isThousands ? cleaned.split(sep).join('') : cleaned.replace(sep, '.');
  } else {
    normalized = cleaned;
  }
  const n = parseFloat(normalized);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const parseQty = (raw) => {
  const n = parseInt(String(raw).replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

const itemLineTotal = (i) => parseQty(i.qty) * parseAmount(i.amount);
const itemsTotal = (items) => items.reduce((s, i) => s + itemLineTotal(i), 0);

// --- Casos ---

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

test('formato local: el punto es separador de miles', () => {
  assert.equal(parseAmount('150.000'), 150000);
  assert.equal(parseAmount('1.234.567'), 1234567);
  assert.equal(parseAmount('$ 45.000'), 45000);
});

test('formato local: la coma es el decimal', () => {
  assert.equal(parseAmount('99,99'), 99.99);
  assert.equal(parseAmount('150.000,50'), 150000.5);
});

test('formato ingles: tambien se entiende', () => {
  assert.equal(parseAmount('150,000.50'), 150000.5);
  assert.equal(parseAmount('150000.50'), 150000.5);
});

test('entradas invalidas valen cero', () => {
  assert.equal(parseAmount(''), 0);
  assert.equal(parseAmount('abc'), 0);
});

test('cantidad: minimo 1, nunca 0 ni negativa', () => {
  assert.equal(parseQty('2'), 2);
  assert.equal(parseQty(''), 1, 'vacio mientras se reescribe no debe dar 0');
  assert.equal(parseQty('0'), 1);
  assert.equal(parseQty('-3'), 3);
  assert.equal(parseQty('abc'), 1);
});

test('el caso que motivo el cambio: 2 unidades de 100 son 200', () => {
  assert.equal(itemLineTotal({ qty: '2', amount: '100' }), 200);
});

test('sin cantidad explicita se cobra una unidad', () => {
  assert.equal(itemLineTotal({ qty: '', amount: '100' }), 100);
});

test('el total suma las lineas, no los precios unitarios', () => {
  const items = [
    { qty: '2', amount: '100' }, // 200
    { qty: '3', amount: '50' }, //  150
    { qty: '1', amount: '1.500' }, // 1500
  ];
  assert.equal(itemsTotal(items), 1850);
});

test('una linea sin precio no aporta', () => {
  assert.equal(itemsTotal([{ qty: '5', amount: '' }]), 0);
});

console.log(pasaron + ' tests de items OK');
