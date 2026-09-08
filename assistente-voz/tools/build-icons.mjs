#!/usr/bin/env node
/**
 * Gera o sprite SVG de ícones a partir do Phosphor Icons (MIT) e o injeta
 * em index.html, entre os marcadores <!--ICON-SPRITE--> e <!--/ICON-SPRITE-->.
 *
 * O sprite é inline (e não <use href="sprite.svg#id">) porque referência a
 * arquivo SVG externo é bloqueada sob file://, e o app precisa abrir com
 * duplo clique, sem servidor e sem build.
 *
 * Uso:  node tools/build-icons.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const PHOSPHOR = resolve(ROOT, "..", "node_modules", "@phosphor-icons", "core", "assets", "regular");

/**
 * Mapa: nome semântico usado no app  ->  arquivo do Phosphor.
 * O nome descreve a FUNÇÃO, não o desenho — trocar o ícone depois não
 * exige tocar em nenhuma tela.
 */
const ICONS = {
  // navegação principal
  home: "house",
  event: "ticket",
  explore: "map-trifold",
  assistant: "sparkle",
  profile: "user",

  // atalhos e seções
  calendar: "calendar-blank",
  "calendar-check": "calendar-check",
  clock: "clock",
  location: "map-pin",
  ticket: "ticket",
  track: "target",
  food: "fork-knife",
  lodging: "buildings",
  transport: "car",
  tourism: "map-trifold",
  moments: "camera",
  history: "scroll",
  bell: "bell",
  badge: "identification-badge",
  backpack: "backpack",
  price: "currency-circle-dollar",
  experience: "sparkle",
  landmark: "map-pin",
  checklist: "list-checks",

  // categorias do explorar
  coffee: "coffee",
  culture: "mask-happy",
  shopping: "shopping-bag",

  // programação (trilhas)
  mic: "microphone-stage",
  toast: "champagne",
  tech: "laptop",
  workshop: "wrench",
  night: "moon",
  business: "chart-line-up",
  pitch: "rocket-launch",
  drinks: "beer-stein",
  art: "palette",
  stage: "mask-happy",
  music: "music-notes",
  wellness: "person-simple-tai-chi",
  closing: "sparkle",

  // história
  school: "graduation-cap",
  antenna: "broadcast",
  label: "tag",
  pause: "pause",
  resume: "arrows-clockwise",
  growth: "chart-line-up",
  anniversary: "confetti",

  // pontos turísticos
  church: "church",
  museum: "bank",
  mountain: "mountains",
  park: "tree",
  station: "train",

  // transporte
  taxi: "taxi",
  bus: "bus",
  shuttle: "van",

  // acessibilidade
  "a11y-font": "text-aa",
  "a11y-contrast": "palette",
  "a11y-motion": "lightning",
  "a11y-wheelchair": "wheelchair",
  "a11y-text": "note-pencil",

  // ações e estados de interface
  search: "magnifying-glass",
  star: "star",
  info: "info",
  warning: "warning-circle",
  check: "check",
  "check-seal": "seal-check",
  "arrow-left": "arrow-left",
  "caret-right": "caret-right",
  close: "x",
  share: "share-network",
  download: "download-simple",
  save: "heart",
  saved: "heart",
  route: "navigation-arrow",
  phone: "phone",
  external: "link-simple",
  copy: "copy-simple",
  send: "paper-plane-right",
  theme: "moon-stars",
  offline: "wifi-slash",
  exit: "sign-out",
  shield: "shield-check",
};

/** Ícones que devem sair preenchidos (fill) em vez do traço regular. */
const FILLED = new Set(["saved", "star"]);
const PHOSPHOR_FILL = resolve(PHOSPHOR, "..", "fill");

const START = "<!--ICON-SPRITE-->";
const END = "<!--/ICON-SPRITE-->";
const TARGET = resolve(ROOT, "index.html");

/** Extrai só o conteúdo interno do <svg> do Phosphor (os paths). */
function innerSvg(source) {
  const match = source.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  if (!match) throw new Error("SVG sem elemento <svg>");
  return match[1].trim();
}

async function buildSprite() {
  const symbols = [];
  const missing = [];

  for (const [name, file] of Object.entries(ICONS)) {
    const dir = FILLED.has(name) ? PHOSPHOR_FILL : PHOSPHOR;
    const suffix = FILLED.has(name) ? "-fill" : "";
    const path = resolve(dir, `${file}${suffix}.svg`);
    if (!existsSync(path)) {
      missing.push(`${name} -> ${file}${suffix}.svg`);
      continue;
    }
    symbols.push(
      `<symbol id="i-${name}" viewBox="0 0 256 256" fill="currentColor">${innerSvg(await readFile(path, "utf8"))}</symbol>`
    );
  }

  if (missing.length) {
    console.error(`Ícones não encontrados no Phosphor:\n  ${missing.join("\n  ")}`);
    process.exitCode = 1;
  }

  return [
    START,
    '<svg xmlns="http://www.w3.org/2000/svg" class="icon-sprite" aria-hidden="true" focusable="false">',
    symbols.join(""),
    "</svg>",
    END,
  ].join("\n");
}

const sprite = await buildSprite();
const html = await readFile(TARGET, "utf8");
const from = html.indexOf(START);
const to = html.indexOf(END);
if (from === -1 || to === -1) {
  console.error(`index.html sem os marcadores ${START} ... ${END}`);
  process.exit(1);
}
await writeFile(TARGET, html.slice(0, from) + sprite + html.slice(to + END.length), "utf8");
console.log(`sprite injetado em index.html — ${Object.keys(ICONS).length} ícones · Phosphor Icons (MIT)`);
