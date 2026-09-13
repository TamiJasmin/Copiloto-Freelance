/**
 * Genera los íconos de la app a partir de LANA.png.
 *
 *   npm run icons
 *
 * El archivo original viene con la llama chica y mucho margen negro, que
 * para un ícono es casi todo espacio desperdiciado: en la grilla del
 * teléfono se vería un punto diminuto. Este script recorta contra el
 * contenido real, normaliza el trazo a transparencia y arma cada tamaño.
 *
 * Sin dependencias de sistema: pngjs es JS puro, así que corre igual en
 * cualquier máquina sin instalar nada aparte.
 */
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');

const RAIZ = path.join(__dirname, '..');
const ORIGEN = path.join(RAIZ, 'LANA.png');
const DESTINO = path.join(RAIZ, 'assets');

/** Fondo de la app. Tiene que coincidir con C.bg de src/theme/tokens.ts */
const FONDO = { r: 0x0a, g: 0x0a, b: 0x0b };

const luminancia = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Recorta contra el trazo visible, ignorando el fondo negro. */
function recortar(png, umbral = 40) {
  let x0 = png.width;
  let y0 = png.height;
  let x1 = -1;
  let y1 = -1;

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (png.width * y + x) << 2;
      const a = png.data[i + 3];
      if (a < 10) continue; // transparente: no es contenido
      if (luminancia(png.data[i], png.data[i + 1], png.data[i + 2]) < umbral) continue;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }

  if (x1 < 0) throw new Error('No se encontró ningún trazo en LANA.png');
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * Pasa el trazo blanco a alfa.
 *
 * El original es blanco sobre negro opaco. Convirtiendo la luminancia en
 * transparencia, la llama queda recortada y se puede apoyar sobre
 * cualquier color sin arrastrar un rectángulo negro.
 */
function aTransparente(png, caja) {
  const out = new PNG({ width: caja.w, height: caja.h });
  for (let y = 0; y < caja.h; y++) {
    for (let x = 0; x < caja.w; x++) {
      const src = (png.width * (y + caja.y0) + (x + caja.x0)) << 2;
      const dst = (caja.w * y + x) << 2;
      const l = luminancia(png.data[src], png.data[src + 1], png.data[src + 2]);
      const a = Math.round(Math.min(255, l) * (png.data[src + 3] / 255));
      out.data[dst] = 255;
      out.data[dst + 1] = 255;
      out.data[dst + 2] = 255;
      out.data[dst + 3] = a;
    }
  }
  return out;
}

/**
 * Reduce con filtro de caja: promedia todos los píxeles de origen que caen
 * en cada píxel de destino. Para achicar mucho da mejor resultado que
 * tomar el más cercano, que dejaría el trazo fino lleno de dientes.
 */
function escalar(png, ancho, alto) {
  const out = new PNG({ width: ancho, height: alto });
  const escalaX = png.width / ancho;
  const escalaY = png.height / alto;

  for (let y = 0; y < alto; y++) {
    const sy0 = Math.floor(y * escalaY);
    const sy1 = Math.max(sy0 + 1, Math.floor((y + 1) * escalaY));

    for (let x = 0; x < ancho; x++) {
      const sx0 = Math.floor(x * escalaX);
      const sx1 = Math.max(sx0 + 1, Math.floor((x + 1) * escalaX));

      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (png.width * sy + sx) << 2;
          const alfa = png.data[i + 3];
          // Se premultiplica: si no, los bordes transparentes tiñen de negro.
          r += png.data[i] * alfa;
          g += png.data[i + 1] * alfa;
          b += png.data[i + 2] * alfa;
          a += alfa;
          n++;
        }
      }

      const d = (ancho * y + x) << 2;
      const alfaMedio = a / n;
      out.data[d] = a > 0 ? Math.round(r / a) : 0;
      out.data[d + 1] = a > 0 ? Math.round(g / a) : 0;
      out.data[d + 2] = a > 0 ? Math.round(b / a) : 0;
      out.data[d + 3] = Math.round(alfaMedio);
    }
  }
  return out;
}

/**
 * Parte el logo en sus bloques, separados por bandas de filas vacías.
 *
 * El archivo es un imagotipo: la llama arriba y la palabra LANA abajo,
 * con 35px de aire en el medio. Para los íconos hace falta sólo la llama,
 * porque a 48px en la pantalla de un teléfono la palabra es una mancha.
 * Detectar la banda vacía es más robusto que cortar por un porcentaje:
 * si mañana cambia la proporción del dibujo, sigue funcionando.
 */
function bloques(figura) {
  const vacia = (y) => {
    for (let x = 0; x < figura.width; x++) {
      if (figura.data[((figura.width * y + x) << 2) + 3] >= 10) return false;
    }
    return true;
  };

  const cortes = [];
  let inicio = 0;
  for (let y = 0; y <= figura.height; y++) {
    if (y === figura.height || vacia(y)) {
      if (y > inicio) cortes.push([inicio, y - 1]);
      inicio = y + 1;
    }
  }

  return cortes.map(([y0, y1]) => recorteVertical(figura, y0, y1 - y0 + 1));
}

/** Toma una franja de filas y la re-ajusta a lo ancho del contenido. */
function recorteVertical(figura, desdeY, alto) {
  let x0 = figura.width;
  let x1 = -1;
  for (let y = desdeY; y < desdeY + alto; y++) {
    for (let x = 0; x < figura.width; x++) {
      if (figura.data[((figura.width * y + x) << 2) + 3] < 10) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
    }
  }
  const w = x1 - x0 + 1;
  const out = new PNG({ width: w, height: alto });
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < w; x++) {
      const s = (figura.width * (y + desdeY) + (x + x0)) << 2;
      const d = (w * y + x) << 2;
      out.data[d] = figura.data[s];
      out.data[d + 1] = figura.data[s + 1];
      out.data[d + 2] = figura.data[s + 2];
      out.data[d + 3] = figura.data[s + 3];
    }
  }
  return out;
}
/** Pone la figura centrada en un lienzo, ocupando `proporcion` del lado. */
function lienzo(figura, lado, proporcion, fondo) {
  const out = new PNG({ width: lado, height: lado });

  if (fondo) {
    for (let i = 0; i < out.data.length; i += 4) {
      out.data[i] = fondo.r;
      out.data[i + 1] = fondo.g;
      out.data[i + 2] = fondo.b;
      out.data[i + 3] = 255;
    }
  }

  const disponible = lado * proporcion;
  const escala = Math.min(disponible / figura.width, disponible / figura.height);
  const w = Math.max(1, Math.round(figura.width * escala));
  const h = Math.max(1, Math.round(figura.height * escala));
  const chica = escalar(figura, w, h);

  const ox = Math.round((lado - w) / 2);
  const oy = Math.round((lado - h) / 2);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = (w * y + x) << 2;
      const d = (lado * (y + oy) + (x + ox)) << 2;
      const alfa = chica.data[s + 3] / 255;
      if (alfa === 0) continue;

      if (fondo) {
        // Composición sobre el fondo opaco.
        out.data[d] = Math.round(chica.data[s] * alfa + out.data[d] * (1 - alfa));
        out.data[d + 1] = Math.round(chica.data[s + 1] * alfa + out.data[d + 1] * (1 - alfa));
        out.data[d + 2] = Math.round(chica.data[s + 2] * alfa + out.data[d + 2] * (1 - alfa));
        out.data[d + 3] = 255;
      } else {
        out.data[d] = chica.data[s];
        out.data[d + 1] = chica.data[s + 1];
        out.data[d + 2] = chica.data[s + 2];
        out.data[d + 3] = chica.data[s + 3];
      }
    }
  }
  return out;
}

const guardar = (png, nombre) => {
  const destino = path.join(DESTINO, nombre);
  fs.writeFileSync(destino, PNG.sync.write(png));
  const kb = (fs.statSync(destino).size / 1024).toFixed(1);
  console.log(`  ${nombre.padEnd(20)} ${png.width}x${png.height}  ${kb} KB`);
};

// ------------------------------------------------------------------

if (!fs.existsSync(ORIGEN)) {
  console.error('Falta LANA.png en la raíz del proyecto.');
  process.exit(1);
}
fs.mkdirSync(DESTINO, { recursive: true });

const original = PNG.sync.read(fs.readFileSync(ORIGEN));
const caja = recortar(original);
console.log(`Original ${original.width}x${original.height}`);
console.log(`Recorte  ${caja.w}x${caja.h} (la llama ocupaba el ${Math.round((caja.w / original.width) * 100)}% del ancho)\n`);

const completo = aTransparente(original, caja);
const partes = bloques(completo);

if (partes.length < 2) {
  console.error(
    `Se esperaba un imagotipo de dos bloques (llama + palabra) y se encontraron ${partes.length}.\n` +
      'Si el logo cambió de estructura, revisá el corte antes de publicar los íconos.',
  );
  process.exit(1);
}

const [marca, palabra] = partes;
console.log(`Llama    ${marca.width}x${marca.height}`);
console.log(`Palabra  ${palabra.width}x${palabra.height}\n`);

const ratio = (p) => Math.round((512 * p.height) / p.width);

// La llama sola: para los íconos y para donde ya haya un título al lado.
guardar(escalar(marca, 512, ratio(marca)), 'llama.png');

// El imagotipo completo: para el ingreso y la pantalla de carga, donde hay
// lugar para que la marca se presente entera.
guardar(escalar(completo, 512, ratio(completo)), 'lockup.png');

// Ícono de tienda: fondo opaco, porque iOS no admite transparencia. Va sólo
// la llama: a 48px la palabra sería una mancha ilegible.
guardar(lienzo(marca, 1024, 0.68, FONDO), 'icon.png');

// Android recorta a círculo o squircle: la figura va más chica para que no
// le corten las orejas.
guardar(lienzo(marca, 1024, 0.5, null), 'adaptive-icon.png');

guardar(lienzo(completo, 1284, 0.42, FONDO), 'splash.png');
guardar(lienzo(marca, 64, 0.82, FONDO), 'favicon.png');

console.log('\nListo. Los íconos están en assets/');
