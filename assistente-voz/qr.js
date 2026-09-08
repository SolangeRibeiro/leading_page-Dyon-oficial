/* ============================================================
   DYON · GERADOR DE QR CODE
   Codificador QR completo (modo byte, correção de erro nível M,
   versões 1 a 10), sem dependência externa e sem rede — a
   credencial precisa abrir mesmo com o celular offline no
   credenciamento.

   Referência: ISO/IEC 18004. Segue o modelo clássico:
   Reed-Solomon sobre GF(256), intercalação de blocos e oito
   máscaras avaliadas por penalidade.
   ============================================================ */

(() => {
  "use strict";

  /* ---------- GF(256): polinômio primitivo 0x11D, gerador 2 ---------- */
  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  for (let i = 0, x = 1; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];

  const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

  /** Polinômio gerador de grau `degree`, do maior coeficiente para o menor. */
  function generatorPoly(degree) {
    let poly = [1];
    for (let i = 0; i < degree; i++) {
      const next = new Array(poly.length + 1).fill(0);
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= mul(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  /** Códigos de correção de erro de um bloco de dados. */
  function errorCodewords(data, ecLength) {
    const gen = generatorPoly(ecLength);
    const buffer = new Uint8Array(data.length + ecLength);
    buffer.set(data);
    for (let i = 0; i < data.length; i++) {
      const factor = buffer[i];
      if (!factor) continue;
      for (let j = 0; j < gen.length; j++) buffer[i + j] ^= mul(gen[j], factor);
    }
    return buffer.subarray(data.length);
  }

  /* ---------- Tabelas por versão (nível de correção M) ----------
     [ correção por bloco, blocos do grupo 1, dados por bloco do
       grupo 1, blocos do grupo 2, dados por bloco do grupo 2 ] */
  const BLOCKS = {
    1: [10, 1, 16, 0, 0],
    2: [16, 1, 28, 0, 0],
    3: [26, 1, 44, 0, 0],
    4: [18, 2, 32, 0, 0],
    5: [24, 2, 43, 0, 0],
    6: [16, 4, 27, 0, 0],
    7: [18, 4, 31, 0, 0],
    8: [22, 2, 38, 2, 39],
    9: [22, 3, 36, 2, 37],
    10: [26, 4, 43, 1, 44],
  };

  /** Centros dos padrões de alinhamento por versão. */
  const ALIGNMENT = {
    1: [],
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
    5: [6, 30],
    6: [6, 34],
    7: [6, 22, 38],
    8: [6, 24, 42],
    9: [6, 26, 46],
    10: [6, 28, 50],
  };

  const MAX_VERSION = 10;
  const ECC_BITS_M = 0b00; // indicador do nível M nos bits de formato

  const dataCapacity = (version) => {
    const [, g1, d1, g2, d2] = BLOCKS[version];
    return g1 * d1 + g2 * d2;
  };

  const countBits = (version) => (version < 10 ? 8 : 16);

  /** Menor versão que comporta `byteLength` bytes no modo byte. */
  function pickVersion(byteLength) {
    for (let v = 1; v <= MAX_VERSION; v++) {
      const capacity = Math.floor((dataCapacity(v) * 8 - 4 - countBits(v)) / 8);
      if (byteLength <= capacity) return v;
    }
    throw new RangeError(`Conteudo longo demais para QR versao ${MAX_VERSION}: ${byteLength} bytes`);
  }

  /* ---------- Fluxo de bits ---------- */
  class BitBuffer {
    constructor() {
      this.bits = [];
    }
    push(value, length) {
      for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
    }
    get length() {
      return this.bits.length;
    }
    toBytes() {
      const bytes = new Uint8Array(Math.ceil(this.bits.length / 8));
      this.bits.forEach((bit, i) => {
        if (bit) bytes[i >>> 3] |= 0x80 >>> (i & 7);
      });
      return bytes;
    }
  }

  /** Texto para códigos de dados, já com terminador e preenchimento. */
  function encodeData(text, version) {
    const bytes = new TextEncoder().encode(text);
    const capacity = dataCapacity(version);
    const buffer = new BitBuffer();

    buffer.push(0b0100, 4); // modo byte
    buffer.push(bytes.length, countBits(version));
    bytes.forEach((b) => buffer.push(b, 8));

    const limit = capacity * 8;
    buffer.push(0, Math.min(4, limit - buffer.length)); // terminador
    buffer.push(0, (8 - (buffer.length % 8)) % 8); // fecha o byte

    const codewords = new Uint8Array(capacity);
    codewords.set(buffer.toBytes());
    for (let i = buffer.length / 8, pad = 0; i < capacity; i++, pad++) {
      codewords[i] = pad % 2 === 0 ? 0xec : 0x11; // preenchimento padrão
    }
    return codewords;
  }

  /** Divide em blocos, calcula a correção e intercala tudo. */
  function interleave(codewords, version) {
    const [ecLength, g1, d1, g2, d2] = BLOCKS[version];
    const blocks = [];
    let offset = 0;
    for (let i = 0; i < g1; i++, offset += d1) blocks.push(codewords.subarray(offset, offset + d1));
    for (let i = 0; i < g2; i++, offset += d2) blocks.push(codewords.subarray(offset, offset + d2));

    const ecBlocks = blocks.map((block) => errorCodewords(block, ecLength));
    const result = [];

    const longest = Math.max(...blocks.map((b) => b.length));
    for (let i = 0; i < longest; i++) {
      for (const block of blocks) if (i < block.length) result.push(block[i]);
    }
    for (let i = 0; i < ecLength; i++) {
      for (const block of ecBlocks) result.push(block[i]);
    }
    return Uint8Array.from(result);
  }

  /* ---------- Matriz ---------- */
  const MASKS = [
    (r, c) => (r + c) % 2 === 0,
    (r) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];

  function buildMatrix(version, codewords) {
    const size = version * 4 + 17;
    const modules = new Uint8Array(size * size);
    const reserved = new Uint8Array(size * size);
    const at = (r, c) => r * size + c;

    const setFunction = (r, c, dark) => {
      modules[at(r, c)] = dark ? 1 : 0;
      reserved[at(r, c)] = 1;
    };

    // Localizadores e separadores
    for (const [baseR, baseC] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const rr = baseR + r;
          const cc = baseC + c;
          if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
          const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
          setFunction(rr, cc, ring !== 2 && ring <= 3);
        }
      }
    }

    // Alinhamento (os que colidem com localizadores não são desenhados)
    const centers = ALIGNMENT[version];
    for (const r of centers) {
      for (const c of centers) {
        const collides =
          (r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6);
        if (collides) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            setFunction(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
          }
        }
      }
    }

    // Sincronismo
    for (let i = 8; i < size - 8; i++) {
      setFunction(6, i, i % 2 === 0);
      setFunction(i, 6, i % 2 === 0);
    }

    // Áreas reservadas de formato e de versão
    for (let i = 0; i < 9; i++) {
      if (!reserved[at(8, i)]) setFunction(8, i, false);
      if (!reserved[at(i, 8)]) setFunction(i, 8, false);
    }
    for (let i = 0; i < 8; i++) {
      if (!reserved[at(8, size - 1 - i)]) setFunction(8, size - 1 - i, false);
      if (!reserved[at(size - 1 - i, 8)]) setFunction(size - 1 - i, 8, false);
    }
    setFunction(size - 8, 8, true); // módulo sempre escuro

    if (version >= 7) {
      for (let i = 0; i < 18; i++) {
        const a = size - 11 + (i % 3);
        const b = Math.floor(i / 3);
        setFunction(b, a, false);
        setFunction(a, b, false);
      }
    }

    // Dados em zigue-zague, de baixo para cima; a coluna 6 é pulada
    let bit = 0;
    let upward = true;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let step = 0; step < size; step++) {
        for (let side = 0; side < 2; side++) {
          const c = right - side;
          const r = upward ? size - 1 - step : step;
          if (reserved[at(r, c)]) continue;
          modules[at(r, c)] =
            bit < codewords.length * 8 ? (codewords[bit >>> 3] >>> (7 - (bit & 7))) & 1 : 0;
          bit++;
        }
      }
      upward = !upward;
    }

    return { size, modules, reserved };
  }

  /** Penalidade das quatro regras do padrão — quanto menor, melhor. */
  function penalty(modules, size) {
    const at = (r, c) => modules[r * size + c];
    let score = 0;

    // 1. sequências de cinco ou mais módulos iguais
    for (let i = 0; i < size; i++) {
      for (const horizontal of [true, false]) {
        let run = 1;
        for (let j = 1; j < size; j++) {
          const prev = horizontal ? at(i, j - 1) : at(j - 1, i);
          const curr = horizontal ? at(i, j) : at(j, i);
          if (curr === prev) {
            run++;
            if (run === 5) score += 3;
            else if (run > 5) score += 1;
          } else {
            run = 1;
          }
        }
      }
    }

    // 2. blocos 2x2 da mesma cor
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        const v = at(r, c);
        if (v === at(r, c + 1) && v === at(r + 1, c) && v === at(r + 1, c + 1)) score += 3;
      }
    }

    // 3. padrão 1:1:3:1:1 com quatro claros ao lado, em qualquer sentido
    const A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    const matches = (get, start) =>
      A.every((v, k) => get(start + k) === v) || B.every((v, k) => get(start + k) === v);
    for (let i = 0; i < size; i++) {
      for (let j = 0; j <= size - 11; j++) {
        if (matches((k) => at(i, k), j)) score += 40;
        if (matches((k) => at(k, i), j)) score += 40;
      }
    }

    // 4. desequilíbrio entre claros e escuros
    let dark = 0;
    for (let i = 0; i < modules.length; i++) dark += modules[i];
    const percent = (dark * 100) / modules.length;
    score += Math.floor(Math.abs(percent - 50) / 5) * 10;

    return score;
  }

  function formatBits(mask) {
    const data = (ECC_BITS_M << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    return ((data << 10) | rem) ^ 0x5412;
  }

  function versionBits(version) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    return (version << 12) | rem;
  }

  function applyFormat(modules, size, mask) {
    const bits = formatBits(mask);
    const bit = (i) => (bits >>> i) & 1;
    const set = (r, c, v) => {
      modules[r * size + c] = v;
    };

    for (let i = 0; i <= 5; i++) set(i, 8, bit(i));
    set(7, 8, bit(6));
    set(8, 8, bit(7));
    set(8, 7, bit(8));
    for (let i = 9; i < 15; i++) set(8, 14 - i, bit(i));

    for (let i = 0; i < 8; i++) set(8, size - 1 - i, bit(i));
    for (let i = 8; i < 15; i++) set(size - 15 + i, 8, bit(i));
    set(size - 8, 8, 1);
  }

  function applyVersion(modules, size, version) {
    if (version < 7) return;
    const bits = versionBits(version);
    for (let i = 0; i < 18; i++) {
      const value = (bits >>> i) & 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      modules[b * size + a] = value;
      modules[a * size + b] = value;
    }
  }

  /**
   * Gera a matriz do QR Code.
   * @param {string} text conteúdo a codificar
   * @returns {{size:number, modules:Uint8Array, version:number, mask:number}}
   */
  function encode(text) {
    const version = pickVersion(new TextEncoder().encode(text).length);
    const codewords = interleave(encodeData(text, version), version);
    const base = buildMatrix(version, codewords);

    let best = null;
    for (let mask = 0; mask < 8; mask++) {
      const modules = Uint8Array.from(base.modules);
      const test = MASKS[mask];
      for (let r = 0; r < base.size; r++) {
        for (let c = 0; c < base.size; c++) {
          if (base.reserved[r * base.size + c]) continue;
          if (test(r, c)) modules[r * base.size + c] ^= 1;
        }
      }
      applyFormat(modules, base.size, mask);
      applyVersion(modules, base.size, version);
      const score = penalty(modules, base.size);
      if (!best || score < best.score) best = { score, modules, mask };
    }

    return { size: base.size, modules: best.modules, version, mask: best.mask };
  }

  /**
   * Desenha o QR Code num canvas, com zona de silêncio e nitidez
   * ajustada à densidade de pixels da tela.
   */
  function draw(canvas, text, options = {}) {
    const { dark = "#241046", light = "#FFFFFF", quiet = 4, size = 240 } = options;
    const qr = encode(text);
    const total = qr.size + quiet * 2;
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    // Módulo com tamanho inteiro em pixels: sem isso a borda sai borrada.
    const scale = Math.max(1, Math.floor((size * ratio) / total));
    const pixels = total * scale;

    canvas.width = pixels;
    canvas.height = pixels;
    canvas.style.width = `${pixels / ratio}px`;
    canvas.style.height = `${pixels / ratio}px`;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, pixels, pixels);
    ctx.fillStyle = dark;
    for (let r = 0; r < qr.size; r++) {
      for (let c = 0; c < qr.size; c++) {
        if (qr.modules[r * qr.size + c]) {
          ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
        }
      }
    }
    return qr;
  }

  window.DyonQR = { encode, draw };
})();
