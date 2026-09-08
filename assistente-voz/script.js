/* ============================================================
   DYON · APP DO CONVIDADO — COMPORTAMENTO

   Princípios do arquivo:
   · Nenhum handler inline no HTML — tudo por delegação de evento
     e atributos data-*.
   · Nenhum texto entra no DOM por interpolação de HTML: o conteúdo
     é montado com createElement/textContent, então aspas, "<" e
     acentos nunca viram marcação.
   · Nenhum alert(): confirmações usam aviso flutuante, e detalhes
     abrem num painel (<dialog>) que devolve o foco a quem o abriu.
   · Estado persistido em localStorage, sempre protegido: modo
     privado e cota cheia não podem derrubar o app.
   ============================================================ */

(() => {
  "use strict";

  const D = window.DyonData;
  const QR = window.DyonQR;

  const KEY = {
    guest: "dyon.guest",
    settings: "dyon.settings",
    prefs: "dyon.prefs",
    saved: "dyon.saved",
    read: "dyon.read",
    rsvp: "dyon.rsvp",
    rsvpFicha: "dyon.rsvp.ficha",
  };

  /* O que se pergunta na hora de confirmar presença. Fica neste aparelho,
     como o resto do app. */
  const RSVP_PADRAO = {
    respondido: false,
    acompanhantes: 0,
    alcool: true,
    /* Mais de uma: quem bebe cerveja costuma beber refrigerante também. */
    bebidas: [],
    vegetariano: false,
    alergia: "",
    acessibilidade: "",
  };

  const BEBIDAS_ALCOOLICAS = ["Cerveja", "Drinks", "Vinho"];
  const BEBIDAS_SEM_ALCOOL = ["Suco", "Refrigerante", "Água com gás", "Água sem gás"];

  /* ============ ARMAZENAMENTO ============ */
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* segue sem persistir */
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignora */
      }
    },
  };

  /* ============ HELPERS DE DOM ============ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /**
   * Cria um elemento. `text` entra sempre como texto, nunca como HTML.
   */
  function el(tag, options = {}, children = []) {
    const { className, text, ...attrs } = options;
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    for (const [key, value] of Object.entries(attrs)) {
      if (value === false || value == null) continue;
      if (key.startsWith("on") && typeof value === "function") {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (value === true) {
        node.setAttribute(key, "");
      } else {
        node.setAttribute(key, String(value));
      }
    }
    for (const child of children.flat()) if (child) node.append(child);
    return node;
  }

  /** Ícone do sprite. Decorativo por padrão: o texto ao lado já informa. */
  function icon(name, className = "icon") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", className);
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", `#i-${name}`);
    svg.append(use);
    return svg;
  }

  const clear = (node) => {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  };

  /* ============ ESTADO ============ */
  const settingsDefaults = {
    theme: "auto", // auto | light | dark
    font: "normal", // normal | large
    contrast: "normal", // normal | high
    motion: "auto", // auto | reduced
    accessibleOnly: false,
  };

  const state = {
    guest: store.get(KEY.guest, null),
    settings: { ...settingsDefaults, ...store.get(KEY.settings, {}) },
    prefs: store.get(KEY.prefs, D.PREFERENCES.map((p) => p.selected)),
    saved: new Set(store.get(KEY.saved, [])),
    read: new Set(store.get(KEY.read, [])),
    /* Ninguém entra com presença já confirmada: confirmar é uma escolha da
       pessoa, e é nela que a ficha é preenchida. */
    rsvp: store.get(KEY.rsvp, false),
    rsvpFicha: { ...RSVP_PADRAO, ...store.get(KEY.rsvpFicha, {}) },
    day: 0,
    category: "todos",
    query: "",
    mapPoint: null,
  };

  /* A bebida preferida já foi uma escolha só. Fichas guardadas antes disso
     trazem `bebida` como texto; vira lista sem a pessoa perder a resposta. */
  if (!Array.isArray(state.rsvpFicha.bebidas)) {
    state.rsvpFicha.bebidas = state.rsvpFicha.bebida ? [state.rsvpFicha.bebida] : [];
  }
  delete state.rsvpFicha.bebida;

  // A lista de preferências pode crescer entre versões: completa o que faltar.
  if (state.prefs.length !== D.PREFERENCES.length) {
    state.prefs = D.PREFERENCES.map((p, i) => state.prefs[i] ?? p.selected);
  }

  /* ============ AVISOS FLUTUANTES ============ */
  const toaster = $("#toaster");

  function toast(message, iconName = "check") {
    const node = el("p", { className: "toast" }, [icon(iconName), el("span", { text: message })]);
    toaster.append(node);
    setTimeout(() => {
      node.classList.add("is-leaving");
      node.addEventListener("animationend", () => node.remove(), { once: true });
    }, 3200);
  }

  /* ============ PAINEL DE DETALHES ============ */
  const sheet = $("#sheet");
  const sheetTitle = $("#sheetTitle");
  const sheetBody = $("#sheetBody");

  function openSheet(title, nodes) {
    sheetTitle.textContent = title;
    clear(sheetBody).append(...nodes);
    if (typeof sheet.showModal === "function") sheet.showModal();
    else sheet.setAttribute("open", "");
    sheetTitle.focus({ preventScroll: true });
  }

  function closeSheet() {
    if (sheet.open) sheet.close();
  }

  sheet.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-sheet]")) {
      closeSheet();
      return;
    }
    // Clique no backdrop fecha o painel. A checagem é por alvo, e não por
    // coordenada: teclado dispara clique em (0, 0), e comparar coordenadas
    // faria um Enter em qualquer botão de dentro fechar o painel.
    if (event.target === sheet) closeSheet();
  });

  /* ============ NAVEGAÇÃO ============ */
  const screens = $$(".screen").map((node) => ({ id: node.id.replace("screen-", ""), node }));
  const screenIds = new Set(screens.map((s) => s.id));
  const tabbar = $("#tabbar");
  const announcer = $("#announcer");

  /** Telas de entrada não mostram a barra de abas. */
  const CHROMELESS = new Set(["splash", "identificacao", "boasvindas"]);

  /** Para onde “voltar” leva quando não há histórico dentro do app. */
  const PARENT = {
    evento: "inicio",
    programacao: "evento",
    convite: "evento",
    transporte: "evento",
    explorar: "inicio",
    mapa: "explorar",
    turismo: "explorar",
    salvos: "perfil",
    experiencia: "perfil",
    acessibilidade: "perfil",
    notificacoes: "inicio",
    momentos: "inicio",
    historia: "inicio",
    assistente: "inicio",
    perfil: "inicio",
  };

  /** Qual aba fica marcada como atual em cada tela. */
  const TAB_FOR = {
    inicio: "inicio", notificacoes: "inicio", momentos: "inicio", historia: "inicio",
    evento: "evento", programacao: "evento", convite: "evento", transporte: "evento",
    explorar: "explorar", mapa: "explorar", turismo: "explorar", salvos: "explorar",
    assistente: "assistente",
    perfil: "perfil", experiencia: "perfil", acessibilidade: "perfil",
  };

  let current = "splash";
  let depth = 0;
  let counter = 0;
  let firstRender = true;

  // Por que a tela de nome está aberta: na entrada do app ela leva às
  // boas-vindas; vinda do perfil, ela volta para o perfil.
  let nameIntent = "entrada"; // entrada | edicao
  // Tela pedida por link direto, aberta só depois da identificação.
  let pendingLink = null;

  const parseHash = () => {
    const id = location.hash.replace(/^#\/?/, "");
    return screenIds.has(id) ? id : null;
  };

  /**
   * Troca de tela. Usa o hash (e não history.pushState) porque
   * pushState com URL é bloqueado sob file://, e o app precisa
   * abrir com duplo clique.
   */
  function go(id, options = {}) {
    if (!screenIds.has(id)) return;
    const target = `#/${id}`;
    if (location.hash === target) {
      show(id);
      return;
    }
    if (options.replace) {
      location.replace(location.href.split("#")[0] + target);
    } else {
      location.hash = target;
    }
  }

  function goBack() {
    if (depth > 1) history.back();
    else go(PARENT[current] || "inicio", { replace: true });
  }

  function show(id) {
    const target = screens.find((s) => s.id === id);
    if (!target) return;

    for (const { node } of screens) {
      node.hidden = true;
      node.classList.remove("is-active");
    }
    target.node.hidden = false;
    target.node.classList.add("is-active");
    target.node.scrollTop = 0;
    target.node.classList.remove("is-scrolled");

    tabbar.hidden = CHROMELESS.has(id);
    const activeTab = TAB_FOR[id];
    for (const tab of $$(".tab", tabbar)) {
      const isCurrent = tab.dataset.go === activeTab;
      tab.classList.toggle("is-current", isCurrent);
      // A classe pinta; aria-current é o que o leitor de tela anuncia.
      if (isCurrent) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    }

    current = id;
    closeSheet();
    onEnter[id]?.();

    // Sem mover o foco, quem navega por teclado ficaria preso no botão
    // anterior e o leitor de tela não perceberia a troca de tela.
    if (!firstRender) {
      const heading = target.node.querySelector("h1");
      if (heading) {
        heading.focus({ preventScroll: true });
        announcer.textContent = `${heading.textContent.trim()} — tela aberta`;
      }
    }
    firstRender = false;
  }

  window.addEventListener("hashchange", () => {
    const id = parseHash() || defaultScreen();
    const historyState = history.state;
    if (historyState && typeof historyState.idx === "number") {
      depth = historyState.idx; // voltar/avançar do navegador
    } else {
      depth = ++counter;
      try {
        history.replaceState({ idx: depth }, "");
      } catch {
        /* file:// pode recusar; a navegação continua funcionando */
      }
    }
    show(id);
  });

  // Sombra na barra superior só depois que a tela rola.
  for (const { node } of screens) {
    node.addEventListener(
      "scroll",
      () => node.classList.toggle("is-scrolled", node.scrollTop > 4),
      { passive: true }
    );
  }

  /* ============ CONVIDADO ============ */

  /** Código curto e estável, derivado do nome — a mesma pessoa vê o mesmo código. */
  function guestCode(name) {
    let hash = 0x811c9dc5;
    for (const char of name.trim().toLowerCase()) {
      hash ^= char.codePointAt(0);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return `HT26-${hash.toString(36).toUpperCase().padStart(6, "0").slice(-6)}`;
  }

  const firstName = () => (state.guest ? state.guest.name.trim().split(/\s+/)[0] : "convidado");

  function applyGuest() {
    const name = state.guest ? state.guest.name : "Convidado";
    for (const node of $$('[data-bind="fullName"]')) node.textContent = name;
    for (const node of $$('[data-bind="firstName"]')) node.textContent = firstName();
    const code = state.guest ? state.guest.code : "—";
    $("#ticketCode").textContent = code;
    $("#profileCode").textContent = code;
    $("#profileAvatar").textContent = firstName().charAt(0).toUpperCase();
  }

  function saveGuest(name) {
    state.guest = { name: name.trim().replace(/\s+/g, " "), code: guestCode(name) };
    store.set(KEY.guest, state.guest);
    applyGuest();
    renderTicketQr();
    resetChat();
  }

  /* ============ PREFERÊNCIAS DO SISTEMA ============ */
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const prefersDark = () => darkQuery.matches;

  // Se o tema segue o sistema, o interruptor precisa acompanhar a mudança.
  darkQuery.addEventListener("change", () => {
    if (state.settings.theme === "auto") renderA11y();
  });

  function applySettings() {
    const root = document.documentElement;
    root.dataset.theme = state.settings.theme === "auto" ? "" : state.settings.theme;
    if (state.settings.theme === "auto") root.removeAttribute("data-theme");
    root.dataset.font = state.settings.font;
    root.dataset.contrast = state.settings.contrast;
    root.dataset.motion = state.settings.motion;
    store.set(KEY.settings, state.settings);
  }

  /* ============ TELA: INÍCIO ============ */
  const SHORTCUTS = [
    { icon: "calendar", label: "Programação", go: "programacao" },
    { icon: "ticket", label: "Meu convite", go: "convite" },
    { icon: "location", label: "Mapa", go: "mapa" },
    { icon: "transport", label: "Como chegar", go: "transporte" },
    { icon: "track", label: "Trilhas", go: "experiencia" },
    { icon: "food", label: "Onde comer", go: "explorar", category: "restaurante" },
    { icon: "lodging", label: "Hospedagem", go: "explorar", category: "hotel" },
    { icon: "tourism", label: "Turismo", go: "turismo" },
    { icon: "moments", label: "Momentos", go: "momentos" },
    { icon: "history", label: "História", go: "historia" },
  ];

  function renderShortcuts() {
    const host = clear($("#shortcuts"));
    for (const item of SHORTCUTS) {
      host.append(
        el(
          "button",
          {
            className: "shortcut",
            type: "button",
            "data-go": item.go,
            "data-category": item.category,
          },
          [icon(item.icon), el("span", { text: item.label })]
        )
      );
    }
  }

  /** Data real de cada item da programação, para contagem e “próximo”. */
  function scheduleMoments() {
    const moments = [];
    D.SCHEDULE.forEach((day, dayIndex) => {
      const [d, m] = day.date.split("/").map(Number);
      day.items.forEach((item) => {
        const [hh, mm] = item.time.split(":").map(Number);
        moments.push({
          dayIndex,
          when: new Date(D.EVENT.startsAt.getFullYear(), m - 1, d, hh, mm),
          day,
          item,
        });
      });
    });
    return moments;
  }

  const MOMENTS = scheduleMoments();
  const RING = 2 * Math.PI * 52;

  function renderCountdown() {
    const now = Date.now();
    const start = D.EVENT.startsAt.getTime();
    const end = D.EVENT.endsAt.getTime();
    const card = $("#countdown");
    const number = $("#countdownNumber");
    const unit = $("#countdownUnit");
    const label = $("#countdownLabel");
    const detail = $("#countdownDetail");
    const subtitle = $("#homeSubtitle");
    let progress;

    if (now < start) {
      const left = start - now;
      const days = Math.floor(left / 86400000);
      const hours = Math.floor(left / 3600000);
      const minutes = Math.max(1, Math.floor(left / 60000));
      if (days >= 1) {
        number.textContent = String(days + 1);
        unit.textContent = days === 0 ? "dia" : "dias";
      } else if (hours >= 1) {
        number.textContent = String(hours);
        unit.textContent = hours === 1 ? "hora" : "horas";
      } else {
        number.textContent = String(minutes);
        unit.textContent = "min";
      }
      label.textContent = "Contagem regressiva";
      detail.textContent = `${D.EVENT.dateLabel.replace(" de 2026", "")} · Santa Rita do Sapucaí, MG`;
      subtitle.textContent = `Seu evento começa em ${number.textContent} ${unit.textContent}.`;
      const windowMs = D.EVENT.countdownWindowDays * 86400000;
      progress = Math.min(1, Math.max(0.04, 1 - left / windowMs));
      card.classList.remove("is-live");
    } else if (now <= end) {
      const dayNumber = Math.min(
        D.SCHEDULE.length,
        Math.floor((now - start) / 86400000) + 1
      );
      number.textContent = String(dayNumber);
      unit.textContent = `de ${D.SCHEDULE.length}`;
      label.textContent = "Acontecendo agora";
      detail.textContent = "O festival está rolando por toda a cidade.";
      subtitle.textContent = "O festival está acontecendo agora.";
      progress = (now - start) / (end - start);
      card.classList.add("is-live");
    } else {
      number.textContent = "10ª";
      unit.textContent = "edição";
      label.textContent = "Edição encerrada";
      detail.textContent = "Até a próxima — obrigado por participar.";
      subtitle.textContent = "Obrigado por viver a 10ª edição com a gente.";
      progress = 1;
      card.classList.remove("is-live");
    }

    const ring = $("#countdownRing");
    ring.style.strokeDasharray = String(RING);
    ring.style.strokeDashoffset = String(RING * (1 - progress));
  }

  function renderNextUp() {
    const host = clear($("#nextUp"));
    const now = Date.now();
    const next = MOMENTS.find((m) => m.when.getTime() >= now);

    if (!next) {
      host.append(
        el("p", { className: "empty" }, [
          icon("check-seal"),
          el("span", { text: "A 10ª edição foi encerrada. Até a próxima!" }),
        ])
      );
      return;
    }

    host.append(
      el("button", { className: "next-card", type: "button", "data-go": "programacao", "data-day": next.dayIndex }, [
        el("span", { className: "next-card__when" }, [
          el("b", { text: next.item.time }),
          el("small", { text: `${next.day.label} · ${next.day.date}` }),
        ]),
        el("span", { className: "next-card__body" }, [
          el("b", { text: next.item.title }),
          el("span", { text: `${next.item.track} · ${next.item.place}` }),
        ]),
      ])
    );
  }

  function renderDiscover() {
    const host = clear($("#discoverRail"));
    const picks = D.PLACES.filter((p) => ["hotel", "restaurante", "cafe"].includes(p.cat)).slice(0, 5);
    for (const place of picks) {
      const art = D.CATEGORY_ART[place.cat];
      const card = el("button", { className: "rail__card", type: "button", "data-place": place.id }, [
        el("span", { className: "rail__art", style: `background:${art.grad}` }, [icon(art.icon)]),
        el("span", { className: "rail__body" }, [
          el("b", { text: place.name }),
          el("span", { text: place.dist }),
        ]),
      ]);
      host.append(el("li", {}, [card]));
    }
  }

  /* ============ TELA: MEU EVENTO ============ */
  function renderEventInfo() {
    const host = clear($("#eventInfo"));
    for (const row of D.EVENT_INFO) {
      host.append(
        el("div", {}, [
          icon(row.icon),
          el("div", {}, [el("dt", { text: row.label }), el("dd", { text: row.value })]),
        ])
      );
    }
  }

  /* ============ TELA: PROGRAMAÇÃO ============ */
  function renderDayTabs() {
    const host = clear($("#dayTabs"));
    D.SCHEDULE.forEach((day, index) => {
      const selected = index === state.day;
      host.append(
        el(
          "button",
          {
            className: "daytab",
            type: "button",
            role: "tab",
            id: `daytab-${index}`,
            "aria-selected": String(selected),
            "aria-controls": `daypanel-${index}`,
            // Roving tabindex: uma parada de tabulação para o grupo todo.
            tabindex: selected ? "0" : "-1",
            "data-day": index,
          },
          [el("b", { text: day.label }), el("small", { text: `${day.date} · ${day.weekday}` })]
        )
      );
    });
  }

  function renderDay() {
    const host = clear($("#daySections"));
    const day = D.SCHEDULE[state.day];
    const panel = el("section", {
      className: "day-block",
      id: `daypanel-${state.day}`,
      role: "tabpanel",
      "aria-labelledby": `daytab-${state.day}`,
      tabindex: "0",
    });
    panel.append(
      el("header", { className: "day-block__head" }, [
        el("h3", { text: `${day.label} — ${day.date}` }),
        el("span", { text: day.weekday }),
      ])
    );

    const list = el("div", { className: "timeline" });
    day.items.forEach((item, index) => {
      list.append(
        el("article", { className: "timeline__item" }, [
          el("span", { className: "timeline__track" }, [
            el("span", { className: "timeline__dot" }, [icon(item.icon)]),
            index < day.items.length - 1 ? el("span", { className: "timeline__line" }) : null,
          ]),
          el("div", {}, [
            el("p", { className: "timeline__time", text: item.time }),
            el("h4", { className: "timeline__title", text: item.title }),
            el("p", { className: "timeline__desc", text: item.desc }),
            el("p", { className: "timeline__meta" }, [
              el("span", {}, [icon("track"), document.createTextNode(item.track)]),
              el("span", {}, [icon("location"), document.createTextNode(item.place)]),
            ]),
          ]),
        ])
      );
    });
    panel.append(list);
    host.append(panel);
  }

  function selectDay(index) {
    state.day = Math.max(0, Math.min(D.SCHEDULE.length - 1, index));
    renderDayTabs();
    renderDay();
  }

  // Setas, Home e End navegam entre as abas, como manda o padrão.
  $("#dayTabs").addEventListener("keydown", (event) => {
    const keys = { ArrowRight: 1, ArrowLeft: -1, Home: "first", End: "last" };
    const move = keys[event.key];
    if (move === undefined) return;
    event.preventDefault();
    const last = D.SCHEDULE.length - 1;
    let next;
    if (move === "first") next = 0;
    else if (move === "last") next = last;
    else next = (state.day + move + D.SCHEDULE.length) % D.SCHEDULE.length;
    selectDay(next);
    $(`#daytab-${next}`).focus();
  });

  /* ============ TELA: CONVITE ============ */
  function ticketPayload() {
    const name = state.guest ? state.guest.name : "Convidado";
    const code = state.guest ? state.guest.code : "HT26-DEMO";
    // Conteúdo legível por qualquer leitor de QR, sem depender de rede.
    return [
      "DYON",
      "HackTown 2026",
      `Convidado: ${name}`,
      `Credencial: ${code}`,
      `Data: ${D.EVENT.dateLabel}`,
      state.rsvp ? "Presenca: confirmada" : "Presenca: nao confirmada",
    ].join("\n");
  }

  function renderTicketQr() {
    const canvas = $("#ticketQr");
    try {
      const dark = state.settings.contrast === "high" ? "#000000" : "#241046";
      QR.draw(canvas, ticketPayload(), { size: 220, dark });
      canvas.setAttribute(
        "aria-label",
        `QR Code da credencial ${state.guest ? state.guest.code : ""}. Apresente no credenciamento.`
      );
    } catch (error) {
      console.error("Falha ao gerar o QR Code:", error);
      canvas.hidden = true;
      if (!$("#qrFallback")) {
        canvas.after(
          el("p", {
            className: "footnote",
            id: "qrFallback",
            text: `Não foi possível desenhar o QR Code. Apresente o código ${state.guest?.code ?? ""} no credenciamento.`,
          })
        );
      }
    }
  }

  function renderRsvp() {
    const status = $("#rsvpStatus");
    const button = $("#rsvpButton");
    clear(status);
    if (state.rsvp) {
      status.classList.remove("is-pending");
      status.append(icon("check-seal"), el("span", { text: "Presença confirmada" }));
      button.textContent = "Cancelar presença";
    } else {
      status.classList.add("is-pending");
      status.append(icon("warning"), el("span", { text: "Presença não confirmada" }));
      button.textContent = "Confirmar presença";
    }
    renderRespostasRsvp();
  }

  /* ============================================================
     FICHA DE PRESENÇA
     Confirmar presença deixou de ser um botão que só liga e desliga:
     agora abre um formulário curto. O que a pessoa responde aqui é o
     que a produção precisa saber antes da festa — quantas pessoas
     vêm, o que se bebe, quem não come carne e, principalmente, quem
     tem alergia a quê.

     A alergia é a única resposta que aparece destacada no resumo:
     as outras orientam a compra, essa orienta a cozinha.
     ============================================================ */

  /** Grupo de escolha única, no mesmo padrão dos chips das preferências. */
  function grupoEscolha(rotulo, opcoes, escolhida, aoEscolher) {
    const grupo = el("div", { className: "pref-options", role: "group", "aria-label": rotulo });
    for (const opcao of opcoes) {
      const botao = el("button", {
        className: "chip", type: "button", text: opcao,
        "aria-pressed": String(opcao === escolhida),
        onClick() {
          for (const irmao of grupo.children) irmao.setAttribute("aria-pressed", "false");
          botao.setAttribute("aria-pressed", "true");
          aoEscolher(opcao);
        },
      });
      grupo.append(botao);
    }
    return grupo;
  }

  /** Grupo de escolha múltipla: cada chip liga e desliga por conta própria. */
  function grupoMultiplo(rotulo, opcoes, escolhidas, aoMudar) {
    const grupo = el("div", { className: "pref-options", role: "group", "aria-label": rotulo });
    for (const opcao of opcoes) {
      const botao = el("button", {
        className: "chip", type: "button", text: opcao,
        "aria-pressed": String(escolhidas.includes(opcao)),
        onClick() {
          const marcado = botao.getAttribute("aria-pressed") === "true";
          botao.setAttribute("aria-pressed", String(!marcado));
          aoMudar(opcao, !marcado);
        },
      });
      grupo.append(botao);
    }
    return grupo;
  }

  const cartaoPergunta = (nomeIcone, titulo, corpo) =>
    el("section", { className: "pref-card" }, [
      el("h3", { className: "pref-card__head" }, [icon(nomeIcone), el("span", { text: titulo })]),
      corpo,
    ]);

  function abrirFichaRsvp() {
    const ficha = { ...state.rsvpFicha };

    /* --- acompanhantes --- */
    const quantos = el("input", {
      className: "field-input", type: "number", id: "rsvpQuantos",
      min: "1", max: "10", inputmode: "numeric",
      value: String(ficha.acompanhantes || 1),
      onInput() { ficha.acompanhantes = Math.min(10, Math.max(1, Number(quantos.value) || 1)); },
    });
    const linhaQuantos = el("div", { className: "field-group rsvp-extra" }, [
      el("label", { className: "field-label", for: "rsvpQuantos", text: "Quantas pessoas vêm com você?" }),
      quantos,
    ]);
    linhaQuantos.hidden = !ficha.acompanhantes;

    const blocoAcompanhante = cartaoPergunta("profile", "Você vai levar acompanhante?",
      el("div", {}, [
        grupoEscolha("Acompanhante", ["Vou sozinho(a)", "Vou levar acompanhante"],
          ficha.acompanhantes ? "Vou levar acompanhante" : "Vou sozinho(a)",
          (opcao) => {
            const leva = opcao === "Vou levar acompanhante";
            ficha.acompanhantes = leva ? Math.max(1, Number(quantos.value) || 1) : 0;
            linhaQuantos.hidden = !leva;
            if (leva) quantos.focus();
          }),
        linhaQuantos,
      ]));

    /* --- álcool e bebidas preferidas --- */
    const caixaBebidas = el("div", {});
    const erroBebida = el("p", { className: "field-error", role: "alert" }, [
      icon("warning"), el("span", { text: "Escolha pelo menos uma bebida." }),
    ]);
    erroBebida.hidden = true;

    function montarBebidas() {
      const lista = ficha.alcool
        ? [...BEBIDAS_ALCOOLICAS, ...BEBIDAS_SEM_ALCOOL]
        : BEBIDAS_SEM_ALCOOL;
      /* Quem acabou de dizer que não bebe álcool não pode continuar com
         cerveja marcada — a resposta anterior deixa de valer. */
      ficha.bebidas = ficha.bebidas.filter((b) => lista.includes(b));
      clear(caixaBebidas).append(
        grupoMultiplo("Bebidas preferidas", lista, ficha.bebidas, (opcao, marcou) => {
          if (marcou) ficha.bebidas.push(opcao);
          else ficha.bebidas = ficha.bebidas.filter((b) => b !== opcao);
          if (ficha.bebidas.length) erroBebida.hidden = true;
        }),
        el("p", { className: "field-hint", text: "Pode marcar quantas quiser." }),
        erroBebida
      );
    }
    montarBebidas();

    const blocoAlcool = cartaoPergunta("drinks", "Você bebe álcool?",
      grupoEscolha("Álcool", ["Sim, bebo", "Não bebo álcool"],
        ficha.alcool ? "Sim, bebo" : "Não bebo álcool",
        (opcao) => { ficha.alcool = opcao === "Sim, bebo"; montarBebidas(); }));

    const blocoBebida = cartaoPergunta("drinks", "O que você prefere beber?", caixaBebidas);

    /* --- alimentação --- */
    const blocoVeg = cartaoPergunta("food", "Você é vegetariano(a)?",
      grupoEscolha("Alimentação", ["Como de tudo", "Sou vegetariano(a)"],
        ficha.vegetariano ? "Sou vegetariano(a)" : "Como de tudo",
        (opcao) => { ficha.vegetariano = opcao === "Sou vegetariano(a)"; }));

    /* --- alergia --- */
    const erroAlergia = el("p", { className: "field-error", role: "alert" }, [
      icon("warning"), el("span", { text: "Escreva a qual alimento, para a cozinha saber o que evitar." }),
    ]);
    erroAlergia.hidden = true;

    const qualAlergia = el("input", {
      className: "field-input", type: "text", id: "rsvpAlergia",
      placeholder: "Ex.: camarão, amendoim, leite",
      maxlength: "80", autocomplete: "off",
      value: ficha.alergia,
      onInput() {
        ficha.alergia = qualAlergia.value;
        if (qualAlergia.value.trim()) {
          erroAlergia.hidden = true;
          qualAlergia.removeAttribute("aria-invalid");
        }
      },
    });

    const linhaAlergia = el("div", { className: "field-group rsvp-extra" }, [
      el("label", { className: "field-label", for: "rsvpAlergia", text: "A qual alimento?" }),
      qualAlergia,
      el("p", { className: "field-hint", text: "Vai para a produção junto com a sua confirmação." }),
      erroAlergia,
    ]);
    let temAlergia = Boolean(ficha.alergia);
    linhaAlergia.hidden = !temAlergia;

    const blocoAlergia = cartaoPergunta("warning", "Você tem alergia a algum alimento?",
      el("div", {}, [
        grupoEscolha("Alergia", ["Não tenho", "Tenho alergia"],
          temAlergia ? "Tenho alergia" : "Não tenho",
          (opcao) => {
            temAlergia = opcao === "Tenho alergia";
            linhaAlergia.hidden = !temAlergia;
            if (temAlergia) qualAlergia.focus();
            else { ficha.alergia = ""; qualAlergia.value = ""; erroAlergia.hidden = true; }
          }),
        linhaAlergia,
      ]));

    /* --- acessibilidade --- */
    const erroApoio = el("p", { className: "field-error", role: "alert" }, [
      icon("warning"), el("span", { text: "Escreva qual, para a equipe preparar o espaço." }),
    ]);
    erroApoio.hidden = true;

    const qualApoio = el("input", {
      className: "field-input", type: "text", id: "rsvpApoio",
      maxlength: "120", autocomplete: "off",
      value: ficha.acessibilidade,
      onInput() {
        ficha.acessibilidade = qualApoio.value;
        if (qualApoio.value.trim()) {
          erroApoio.hidden = true;
          qualApoio.removeAttribute("aria-invalid");
        }
      },
    });

    const linhaApoio = el("div", { className: "field-group rsvp-extra" }, [
      el("label", { className: "field-label", for: "rsvpApoio", text: "Qual deficiência?" }),
      qualApoio,
      erroApoio,
    ]);
    let temApoio = Boolean(ficha.acessibilidade);
    linhaApoio.hidden = !temApoio;

    const blocoApoio = cartaoPergunta("a11y-wheelchair", "Você tem alguma deficiência que precisa de acessibilidade?",
      el("div", {}, [
        grupoEscolha("Acessibilidade", ["Não tenho", "Tenho"],
          temApoio ? "Tenho" : "Não tenho",
          (opcao) => {
            temApoio = opcao === "Tenho";
            linhaApoio.hidden = !temApoio;
            if (temApoio) qualApoio.focus();
            else { ficha.acessibilidade = ""; qualApoio.value = ""; erroApoio.hidden = true; }
          }),
        linhaApoio,
      ]));

    /* --- salvar --- */
    const salvar = el("button", {
      className: "btn btn--primary", type: "button",
      text: state.rsvp ? "Salvar respostas" : "Confirmar presença",
      onClick() {
        if (!ficha.bebidas.length) {
          erroBebida.hidden = false;
          caixaBebidas.scrollIntoView({ block: "center" });
          return;
        }
        if (temAlergia && !ficha.alergia.trim()) {
          erroAlergia.hidden = false;
          qualAlergia.setAttribute("aria-invalid", "true");
          qualAlergia.focus();
          return;
        }
        if (temApoio && !ficha.acessibilidade.trim()) {
          erroApoio.hidden = false;
          qualApoio.setAttribute("aria-invalid", "true");
          qualApoio.focus();
          return;
        }
        ficha.alergia = temAlergia ? ficha.alergia.trim() : "";
        ficha.acessibilidade = temApoio ? ficha.acessibilidade.trim() : "";
        ficha.respondido = true;

        state.rsvpFicha = ficha;
        store.set(KEY.rsvpFicha, ficha);

        const jaEstava = state.rsvp;
        state.rsvp = true;
        store.set(KEY.rsvp, true);

        renderRsvp();
        renderTicketQr();
        closeSheet();
        toast(jaEstava ? "Respostas atualizadas." : "Presença confirmada. Obrigado!", "check-seal");
      },
    });

    openSheet(state.rsvp ? "Suas respostas" : "Confirmar presença", [
      el("p", { className: "sheet-lead", text: "Estas respostas ajudam a produção a comprar na medida e a cuidar de quem tem restrição. Leva menos de um minuto." }),
      blocoAcompanhante,
      blocoAlcool,
      blocoBebida,
      blocoVeg,
      blocoAlergia,
      blocoApoio,
      el("div", { className: "btn-row" }, [salvar]),
    ]);
  }

  /** Resumo das respostas, embaixo da credencial. */
  function renderRespostasRsvp() {
    const host = $("#rsvpRespostas");
    if (!host) return;
    clear(host);

    const f = state.rsvpFicha;
    if (!state.rsvp) return;

    /* Quem já estava com presença confirmada — o estado inicial do app, e
       quem confirmou antes da ficha existir — nunca veria as perguntas.
       Em vez de exigir cancelar e confirmar de novo, o convite fica aqui. */
    if (!f.respondido) {
      host.append(
        el("section", { className: "rsvp-resumo rsvp-resumo--convite" }, [
          el("p", { className: "rsvp-convite__txt", text: "Faltam suas preferências: bebida, alimentação, acompanhante e o que a produção precisa saber para cuidar de você." }),
          el("button", {
            className: "btn btn--primary btn--block", type: "button",
            "data-action": "editar-rsvp", text: "Responder agora",
          }),
        ])
      );
      return;
    }

    const linha = (nomeIcone, rotulo, valor) =>
      el("div", { className: "rsvp-linha" }, [
        icon(nomeIcone),
        el("div", {}, [
          el("span", { className: "rsvp-linha__rot", text: rotulo }),
          el("span", { className: "rsvp-linha__val", text: valor }),
        ]),
      ]);

    const itens = [
      linha("profile", "Acompanhantes",
        f.acompanhantes ? `+${f.acompanhantes} ${f.acompanhantes > 1 ? "pessoas" : "pessoa"}` : "Vou sozinho(a)"),
      linha("drinks", f.bebidas.length > 1 ? "Bebidas preferidas" : "Bebida preferida",
        f.bebidas.join(", ") + (f.alcool ? "" : " · não bebo álcool")),
      linha("food", "Alimentação",
        f.vegetariano ? "Vegetariano(a)" : "Como de tudo"),
    ];

    if (f.acessibilidade) {
      itens.push(linha("a11y-wheelchair", "Acessibilidade", f.acessibilidade));
    }

    if (f.alergia) {
      itens.push(
        el("div", { className: "rsvp-linha rsvp-linha--alerta" }, [
          icon("warning"),
          el("div", {}, [
            el("span", { className: "rsvp-linha__rot", text: "Alergia alimentar" }),
            el("span", { className: "rsvp-linha__val", text: f.alergia }),
          ]),
        ])
      );
    }

    host.append(
      el("section", { className: "rsvp-resumo" }, [
        el("h3", { className: "rsvp-resumo__head", text: "Suas respostas" }),
        el("div", { className: "rsvp-resumo__lista" }, itens),
        el("button", {
          className: "btn btn--outline btn--block", type: "button",
          "data-action": "editar-rsvp", text: "Editar respostas",
        }),
      ])
    );
  }

  /* ============ TELA: MINHA EXPERIÊNCIA ============ */
  function renderPrefs() {
    const host = clear($("#prefsList"));
    D.PREFERENCES.forEach((pref, prefIndex) => {
      const options = el("div", { className: "pref-options", role: "group", "aria-label": pref.title });
      pref.options.forEach((option, optionIndex) => {
        options.append(
          el("button", {
            className: "chip",
            type: "button",
            text: option,
            "aria-pressed": String(state.prefs[prefIndex] === optionIndex),
            "data-pref": prefIndex,
            "data-option": optionIndex,
          })
        );
      });
      host.append(
        el("section", { className: "pref-card" }, [
          el("h2", { className: "pref-card__head" }, [icon(pref.icon), el("span", { text: pref.title })]),
          options,
        ])
      );
    });
  }

  /* ============ TELA: EXPLORAR ============ */
  function renderCategories() {
    const host = clear($("#categoryChips"));
    for (const category of D.CATEGORIES) {
      host.append(
        el("button", {
          className: "chip",
          type: "button",
          "aria-pressed": String(state.category === category.id),
          "data-category": category.id,
        }, [icon(category.icon), el("span", { text: category.label })])
      );
    }
  }

  function placeMatches(place) {
    if (state.category !== "todos" && place.cat !== state.category) return false;
    if (state.settings.accessibleOnly && !place.tags.includes("Acessível")) return false;
    const query = state.query.trim().toLowerCase();
    if (!query) return true;
    const haystack = [place.name, place.desc, place.dist, ...place.tags,
      D.CATEGORIES.find((c) => c.id === place.cat)?.label ?? ""].join(" ").toLowerCase();
    return haystack.includes(query);
  }

  /** Cartão de lugar, reaproveitado em Explorar e em Salvos. */
  function placeCard(place) {
    const art = D.CATEGORY_ART[place.cat];
    const categoryLabel = D.CATEGORIES.find((c) => c.id === place.cat)?.label ?? "";
    const isSaved = state.saved.has(place.id);

    return el("article", { className: "place" }, [
      el("div", { className: "place__art", style: `background:${art.grad}` }, [
        icon(art.icon),
        el("button", {
          className: "place__save",
          type: "button",
          "aria-pressed": String(isSaved),
          "data-save": place.id,
        }, [
          // Contorno quando não está salvo, preenchido quando está: o
          // desenho sozinho já diz o estado, sem depender só da cor.
          icon(isSaved ? "saved" : "save"),
          el("span", { className: "sr-only", text: `${isSaved ? "Remover" : "Salvar"} ${place.name}` }),
        ]),
      ]),
      el("div", { className: "place__body" }, [
        el("div", { className: "place__head" }, [
          el("h3", { className: "place__name", text: place.name }),
          el("p", { className: "place__rating" }, [
            icon("star"),
            el("span", { text: place.rating }),
            el("span", { className: "sr-only", text: "de 5" }),
          ]),
        ]),
        el("p", { className: "place__meta", text: `${categoryLabel} · ${place.dist} · ${place.price}` }),
        el("p", { className: "place__desc", text: place.desc }),
        el("div", { className: "place__tags" }, place.tags.map((tag) => el("span", { text: tag }))),
        el("div", { className: "place__actions" }, [
          el("button", {
            className: "btn btn--outline btn--sm",
            type: "button",
            text: "Ver detalhes",
            "data-place": place.id,
          }),
          el("button", {
            className: "btn btn--primary btn--sm",
            type: "button",
            "data-route": `${place.name}, ${D.EVENT.city}`,
            "data-route-name": place.name,
          }, [icon("route"), el("span", { text: "Como chegar" })]),
        ]),
      ]),
    ]);
  }

  function renderPlaces() {
    const host = clear($("#placeList"));
    const list = D.PLACES.filter(placeMatches);
    const count = $("#placeCount");

    count.textContent = list.length
      ? `${list.length} ${list.length === 1 ? "lugar encontrado" : "lugares encontrados"}`
      : "";

    if (!list.length) {
      host.append(
        el("p", { className: "empty" }, [
          icon("search"),
          el("span", { text: "Nada encontrado com esses filtros. Tente outra busca ou categoria." }),
          el("button", { className: "btn btn--ghost btn--sm", type: "button", text: "Limpar filtros", "data-action": "clear-filters" }),
        ])
      );
      return;
    }
    for (const place of list) host.append(placeCard(place));
  }

  function renderSaved() {
    const host = clear($("#savedList"));
    const list = D.PLACES.filter((p) => state.saved.has(p.id));
    const badge = $("#savedCount");
    badge.textContent = state.saved.size ? String(state.saved.size) : "";

    if (!list.length) {
      host.append(
        el("p", { className: "empty" }, [
          icon("saved"),
          el("span", { text: "Você ainda não salvou nenhum lugar. Toque no coração em Explorar." }),
          el("button", { className: "btn btn--ghost btn--sm", type: "button", text: "Ir para Explorar", "data-go": "explorar" }),
        ])
      );
      return;
    }
    for (const place of list) host.append(placeCard(place));
  }

  function toggleSaved(id) {
    const place = D.PLACES.find((p) => p.id === id);
    if (state.saved.has(id)) {
      state.saved.delete(id);
      toast(`${place.name} removido dos salvos.`, "close");
    } else {
      state.saved.add(id);
      toast(`${place.name} salvo.`, "saved");
    }
    store.set(KEY.saved, [...state.saved]);
    renderPlaces();
    renderSaved();
  }

  function openPlaceSheet(id) {
    const place = D.PLACES.find((p) => p.id === id);
    if (!place) return;
    const categoryLabel = D.CATEGORIES.find((c) => c.id === place.cat)?.label ?? "";
    openSheet(place.name, [
      el("p", { className: "screen-lead", text: place.desc }),
      infoList([
        { icon: "landmark", label: "Categoria", value: categoryLabel },
        { icon: "location", label: "Distância", value: place.dist },
        { icon: "star", label: "Avaliação", value: `${place.rating} de 5` },
        { icon: "price", label: "Faixa de preço", value: place.price },
        { icon: "info", label: "Destaques", value: place.tags.join(" · ") },
      ]),
      el("div", { className: "btn-row" }, [
        el("button", {
          className: "btn btn--outline",
          type: "button",
          "aria-pressed": String(state.saved.has(place.id)),
          "data-save": place.id,
        }, [
          icon(state.saved.has(place.id) ? "saved" : "save"),
          el("span", { text: state.saved.has(place.id) ? "Salvo" : "Salvar" }),
        ]),
        el("button", {
          className: "btn btn--primary",
          type: "button",
          "data-route": `${place.name}, ${D.EVENT.city}`,
          "data-route-name": place.name,
        }, [icon("route"), el("span", { text: "Como chegar" })]),
      ]),
      el("p", { className: "footnote", text: "Estabelecimento ilustrativo, usado para demonstrar o app." }),
    ]);
  }

  function infoList(rows) {
    return el(
      "dl",
      { className: "info-list" },
      rows.filter((row) => row.value).map((row) =>
        el("div", {}, [
          icon(row.icon),
          el("div", {}, [el("dt", { text: row.label }), el("dd", { text: row.value })]),
        ])
      )
    );
  }

  /* ============ TELA: MAPA ============ */
  function renderMap() {
    const canvas = $("#mapCanvas");
    for (const marker of $$(".map__marker", canvas)) marker.remove();

    D.MAP_POINTS.forEach((point, index) => {
      const marker = el("button", {
        className: `map__marker${point.venue ? " is-venue" : ""}`,
        type: "button",
        style: `top:${point.top}%; left:${point.left}%`,
        "data-map-point": index,
        "aria-pressed": "false",
      }, [icon(point.icon), el("span", { className: "sr-only", text: point.name })]);
      canvas.append(marker);
    });

    showMapPoint(state.mapPoint ?? 0);
  }

  function showMapPoint(index) {
    const point = D.MAP_POINTS[index];
    if (!point) return;
    state.mapPoint = index;

    for (const marker of $$(".map__marker")) {
      const isActive = Number(marker.dataset.mapPoint) === index;
      marker.classList.toggle("is-active", isActive);
      marker.setAttribute("aria-pressed", String(isActive));
    }

    clear($("#mapCard")).append(
      icon(point.icon),
      el("div", {}, [
        el("b", { text: point.name }),
        el("p", { text: point.desc }),
        el("button", {
          className: "btn btn--outline btn--sm",
          type: "button",
          "data-route": point.query,
          "data-route-name": point.name,
        }, [icon("route"), el("span", { text: "Abrir no mapa" })]),
      ])
    );
  }

  /* ============ TELA: TRANSPORTE ============ */
  const TRANSPORT_DETAIL = {
    transit: {
      title: "Transporte público",
      rows: [
        { icon: "bus", label: "Linhas do festival", value: "Circulares ligando o centro, o Inatel e a ETE, com reforço nos horários de pico." },
        { icon: "clock", label: "Funcionamento", value: "Das 7h às 23h durante os cinco dias de evento." },
        { icon: "price", label: "Tarifa", value: "Tarifa urbana da cidade; credenciados têm desconto nos pontos oficiais." },
      ],
      note: "Horários ilustrativos — confirme com a operadora local antes de sair.",
    },
    shuttle: {
      title: "Transfer oficial",
      rows: [
        { icon: "shuttle", label: "Saídas", value: "A cada 30 minutos dos hotéis parceiros para os polos do festival." },
        { icon: "clock", label: "Primeira e última", value: "Primeira saída às 8h, última volta à 1h." },
        { icon: "badge", label: "Acesso", value: "Apresente a credencial digital no embarque." },
      ],
      note: "A reserva de vaga abre na véspera de cada dia de evento.",
    },
  };

  function renderTransport() {
    const host = clear($("#transportList"));
    for (const option of D.TRANSPORT) {
      host.append(
        el("article", { className: "transport" }, [
          icon(option.icon),
          el("div", {}, [el("b", { text: option.title }), el("p", { text: option.desc })]),
          el("button", {
            className: "btn btn--outline btn--sm",
            type: "button",
            text: option.action,
            "data-transport": option.id,
            "data-kind": option.kind,
          }),
        ])
      );
    }
  }

  /* ============ TELA: ACESSIBILIDADE ============ */
  const SWITCHES = [
    {
      id: "theme",
      icon: "theme",
      title: "Tema escuro",
      desc: "Menos brilho para ambientes com pouca luz.",
      // Reflete o tema em vigor: com "auto", quem manda é o sistema, e o
      // interruptor precisa mostrar isso em vez de aparecer desligado.
      on: () => state.settings.theme === "dark" || (state.settings.theme === "auto" && prefersDark()),
      set: (value) => { state.settings.theme = value ? "dark" : "light"; },
    },
    {
      id: "font",
      icon: "a11y-font",
      title: "Fonte ampliada",
      desc: "Aumenta todo o texto do app em cerca de 18%.",
      on: () => state.settings.font === "large",
      set: (value) => { state.settings.font = value ? "large" : "normal"; },
    },
    {
      id: "contrast",
      icon: "a11y-contrast",
      title: "Alto contraste",
      desc: "Reforça bordas e escurece os textos secundários.",
      on: () => state.settings.contrast === "high",
      set: (value) => { state.settings.contrast = value ? "high" : "normal"; },
    },
    {
      id: "motion",
      icon: "a11y-motion",
      title: "Menos movimento",
      desc: "Desliga transições e animações da interface.",
      on: () => state.settings.motion === "reduced",
      set: (value) => { state.settings.motion = value ? "reduced" : "auto"; },
    },
    {
      id: "accessibleOnly",
      icon: "a11y-wheelchair",
      title: "Só locais acessíveis",
      desc: "Filtra Explorar para lugares marcados como acessíveis.",
      on: () => state.settings.accessibleOnly,
      set: (value) => { state.settings.accessibleOnly = value; },
    },
  ];

  function renderA11y() {
    const host = clear($("#a11yList"));
    for (const item of SWITCHES) {
      host.append(
        el("button", {
          className: "switch-row",
          type: "button",
          role: "switch",
          "aria-checked": String(item.on()),
          "data-switch": item.id,
        }, [
          icon(item.icon),
          el("span", {}, [el("b", { text: item.title }), el("p", { text: item.desc })]),
          el("span", { className: "switch" }),
        ])
      );
    }
  }

  function toggleSwitch(id) {
    const item = SWITCHES.find((s) => s.id === id);
    if (!item) return;
    const next = !item.on();
    item.set(next);
    applySettings();
    renderA11y();
    if (id === "accessibleOnly") renderPlaces();
    if (id === "contrast") renderTicketQr();
    toast(`${item.title}: ${next ? "ativado" : "desativado"}.`, next ? "check" : "close");
  }

  /* ============ TELA: NOTIFICAÇÕES ============ */
  function unreadCount() {
    return D.NOTIFICATIONS.filter((n) => !state.read.has(n.id)).length;
  }

  function renderNotifBadge() {
    const badge = $("#notifCount");
    const count = unreadCount();
    badge.hidden = count === 0;
    badge.textContent = count ? String(count) : "";
    badge.setAttribute("aria-label", count ? `${count} notificações não lidas` : "");
  }

  function renderNotifications() {
    const host = clear($("#notifList"));
    for (const item of D.NOTIFICATIONS) {
      const unread = !state.read.has(item.id);
      host.append(
        el("button", {
          className: `notif${unread ? " is-unread" : ""}`,
          type: "button",
          "data-notif": item.id,
        }, [
          el("span", { className: "notif__icon" }, [icon(item.icon)]),
          el("span", {}, [
            el("b", { text: item.title }),
            unread ? el("span", { className: "sr-only", text: "Não lida." }) : null,
            el("p", { text: item.desc }),
            el("time", { text: item.time }),
          ]),
        ])
      );
    }
    renderNotifBadge();
  }

  /* ============ TELA: MOMENTOS ============ */
  function renderGallery() {
    const host = clear($("#galleryGrid"));
    for (const item of D.GALLERY) {
      host.append(
        el("li", {}, [
          el("figure", {}, [
            el("span", { className: "gallery__art", style: `background:${item.grad}`, role: "img", "aria-label": item.caption }, [icon("moments")]),
            el("figcaption", { text: `${item.caption} · ${item.year}` }),
          ]),
        ])
      );
    }
  }

  /* ============ TELA: HISTÓRIA ============ */
  function renderHistory() {
    const host = clear($("#historyList"));
    D.HISTORY.forEach((entry, index) => {
      host.append(
        el("li", { className: "timeline__item" }, [
          el("span", { className: "timeline__track" }, [
            el("span", { className: "timeline__dot" }, [icon(entry.icon)]),
            index < D.HISTORY.length - 1 ? el("span", { className: "timeline__line" }) : null,
          ]),
          el("div", {}, [
            el("p", { className: "timeline__time", text: entry.year }),
            el("h3", { className: "timeline__title", text: entry.title }),
            el("p", { className: "timeline__desc", text: entry.desc }),
          ]),
        ])
      );
    });
  }

  /* ============ TELA: PONTOS TURÍSTICOS ============ */
  function renderAttractions() {
    const host = clear($("#attractionList"));
    for (const spot of D.ATTRACTIONS) {
      host.append(
        el("article", { className: "place" }, [
          el("div", { className: "place__art", style: `background:${spot.grad}` }, [icon(spot.icon)]),
          el("div", { className: "place__body" }, [
            el("h3", { className: "place__name", text: spot.name }),
            el("p", { className: "place__desc", text: spot.desc }),
            el("div", { className: "place__actions" }, [
              el("button", {
                className: "btn btn--outline btn--sm",
                type: "button",
                text: "Ver detalhes",
                "data-attraction": spot.id,
              }),
              el("button", {
                className: "btn btn--primary btn--sm",
                type: "button",
                "data-route": spot.address,
                "data-route-name": spot.name,
              }, [icon("route"), el("span", { text: "Como chegar" })]),
            ]),
          ]),
        ])
      );
    }
  }

  function openAttractionSheet(id) {
    const spot = D.ATTRACTIONS.find((a) => a.id === id);
    if (!spot) return;
    const actions = el("div", { className: "btn-row" }, [
      el("button", {
        className: "btn btn--primary",
        type: "button",
        "data-route": spot.address,
        "data-route-name": spot.name,
      }, [icon("route"), el("span", { text: "Como chegar" })]),
    ]);
    if (spot.phone) {
      actions.append(
        el("a", { className: "btn btn--outline", href: `tel:${spot.phone}` }, [
          icon("phone"),
          el("span", { text: "Ligar" }),
        ])
      );
    }

    openSheet(spot.name, [
      el("p", { className: "screen-lead", text: spot.desc }),
      infoList([
        { icon: "clock", label: "Funcionamento", value: spot.hours },
        { icon: "location", label: "Endereço", value: spot.address },
        { icon: "price", label: "Valores", value: spot.price },
        { icon: "info", label: "Outras informações", value: spot.info },
      ]),
      actions,
      el("p", { className: "footnote", text: "Horários e valores podem mudar — confirme antes de visitar." }),
    ]);
  }

  /* ============ ROTAS EXTERNAS ============
     A rota usa a Maps URLs API do Google — a interface pública para
     abrir navegação. Ela **não pede chave**, e é a certa aqui por dois
     motivos: quem assume é o aplicativo de mapa do celular, que já tem
     a localização e dá voz e trânsito em tempo real; e uma chave de API
     embutida nesta página seria pública para qualquer pessoa que
     abrisse o código, cobrada na conta da Dyon.

     Sem `origin`, o Google usa a localização atual de quem abriu — é o
     que faz a rota "cair" pronta, do lugar onde a pessoa está até o
     evento. */

  /** Ponto de chegada do evento: o credenciamento, não a cidade inteira. */
  function destinoDoEvento() {
    const ponto = (D.MAP_POINTS ?? []).find((p) => p.venue);
    return ponto?.query || D.EVENT.mapQuery;
  }

  const urlRotaMaps = (destino, modo) =>
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`
    + `&travelmode=${modo}&dir_action=navigate`;

  /**
   * @param {string} query   endereço de destino
   * @param {string} name    o que aparece em negrito no painel
   * @param {string} [modo]  "driving", "transit", "walking"… Com modo, os
   *                         botões traçam rota; sem modo, só localizam.
   */
  function openRouteSheet(query, name, modo) {
    const encoded = encodeURIComponent(query);
    const rota = Boolean(modo);

    /* Cada serviço faz uma coisa diferente: mapa traça rota, o Uber
       chama corrida. Um verbo só para os três mentiria em um deles. */
    const options = rota
      ? [
          { icon: "location", texto: "Traçar rota no Google Maps", url: urlRotaMaps(query, modo) },
          { icon: "route", texto: "Traçar rota no Waze", url: `https://waze.com/ul?q=${encoded}&navigate=yes` },
          { icon: "taxi", texto: "Chamar corrida no Uber", url: `https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${encoded}` },
        ]
      : [
          { icon: "location", texto: "Abrir no Google Maps", url: `https://www.google.com/maps/search/?api=1&query=${encoded}` },
          { icon: "route", texto: "Abrir no Waze", url: `https://waze.com/ul?q=${encoded}` },
          { icon: "taxi", texto: "Chamar corrida no Uber", url: `https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${encoded}` },
        ];

    openSheet(rota ? "Rota até o evento" : "Como chegar", [
      el("p", { className: "sheet__lead" }, [
        el("b", { text: name }),
        el("span", { text: query }),
      ]),
      rota
        ? el("p", { className: "footnote", text: "A rota abre no aplicativo de mapa, já saindo de onde você estiver." })
        : null,
      el(
        "div",
        { className: "stack" },
        options.map((option) =>
          el("a", {
            className: "btn btn--outline btn--block",
            href: option.url,
            target: "_blank",
            rel: "noopener noreferrer",
          }, [icon(option.icon), el("span", { text: option.texto }), icon("external")])
        )
      ),
      el("button", {
        className: "btn btn--ghost btn--block",
        type: "button",
        text: "Copiar endereço",
        "data-copy": query,
      }),
    ]);
  }

  async function copyText(text, message) {
    try {
      await navigator.clipboard.writeText(text);
      toast(message, "copy");
    } catch {
      toast("Não foi possível copiar automaticamente.", "warning");
    }
  }

  /* ============ AGENDA (.ics) ============ */
  const pad = (value) => String(value).padStart(2, "0");

  /** Hora local flutuante: o evento cai no fuso de quem abre o arquivo. */
  const icsDate = (date) =>
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;

  /** DTSTAMP tem de ser UTC, com o sufixo Z — exigência do RFC 5545. */
  const icsStamp = (date) => `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;

  /** Escapa vírgula, ponto e vírgula e quebra de linha, como pede o RFC 5545. */
  const icsEscape = (text) => text.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = el("a", { href: url, download: filename });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function addToCalendar() {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Dyon//App do Convidado//PT-BR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${(state.guest?.code ?? "demo").toLowerCase()}-hacktown2026@dyon.app`,
      `DTSTAMP:${icsStamp(new Date())}`,
      `DTSTART:${icsDate(D.EVENT.startsAt)}`,
      `DTEND:${icsDate(D.EVENT.endsAt)}`,
      `SUMMARY:${icsEscape(`${D.EVENT.name} — ${D.EVENT.edition}`)}`,
      `LOCATION:${icsEscape(`${D.EVENT.venue}, ${D.EVENT.city}`)}`,
      `DESCRIPTION:${icsEscape(`${D.EVENT.motto}\nCredenciamento a partir das 9h do primeiro dia.`)}`,
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      "DESCRIPTION:O HackTown 2026 começa amanhã",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    downloadBlob(
      new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" }),
      "hacktown-2026.ics"
    );
    toast("Arquivo da agenda gerado. Abra para adicionar ao seu calendário.", "calendar-check");
  }

  /* ============ COMPARTILHAR ============ */
  async function shareTicket() {
    const text = `Estarei no ${D.EVENT.name}, de ${D.EVENT.dateLabel}, em ${D.EVENT.city}. Credencial ${state.guest?.code ?? ""}.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${D.EVENT.name} · Dyon`, text });
        return;
      } catch (error) {
        if (error.name === "AbortError") return; // o usuário cancelou
      }
    }
    copyText(text, "Dados da credencial copiados.");
  }

  async function shareApp() {
    const text = `App do convidado Dyon — ${D.EVENT.name}.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Dyon", text, url: location.href.split("#")[0] });
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    copyText(location.href.split("#")[0], "Link do app copiado.");
  }

  function downloadTicketQr() {
    const canvas = $("#ticketQr");
    if (!canvas.toBlob) {
      toast("Seu navegador não permite salvar a imagem.", "warning");
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        toast("Não foi possível gerar a imagem.", "warning");
        return;
      }
      downloadBlob(blob, `credencial-${(state.guest?.code ?? "dyon").toLowerCase()}.png`);
      toast("QR Code salvo na pasta de downloads.", "download");
    }, "image/png");
  }

  /* ============ ASSISTENTE ============ */
  const chatWindow = $("#chatWindow");

  function addBubble(role, text, action) {
    const bubble = el("div", { className: `bubble bubble--${role}` }, [el("span", { text })]);
    if (action) {
      bubble.append(
        el("button", {
          className: "btn btn--ghost btn--sm bubble__action",
          type: "button",
          text: action.label,
          "data-go": action.id,
        })
      );
    }
    chatWindow.append(bubble);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return bubble;
  }

  function resetChat() {
    clear(chatWindow);
    addBubble(
      "bot",
      `Olá, ${firstName()}! Sou o assistente da Dyon. Posso ajudar com datas, programação, credenciamento, hospedagem, restaurantes e transporte do ${D.EVENT.name}. O que você quer saber?`
    );
  }

  function renderChatSuggestions() {
    const host = clear($("#chatSuggestions"));
    for (const suggestion of D.AI_SUGGESTIONS) {
      host.append(
        el("button", { className: "chip", type: "button", text: suggestion, "data-ask": suggestion })
      );
    }
  }

  function ask(question) {
    addBubble("user", question);
    const typing = el("div", { className: "bubble bubble--bot bubble--typing" }, [
      el("i"), el("i"), el("i"),
    ]);
    chatWindow.append(typing);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    setTimeout(() => {
      typing.remove();
      const answer = D.aiAnswer(question);
      addBubble("bot", answer.text, answer.go);
      responderEmVoz(answer.text);
    }, 480);
  }

  $("#chatForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = $("#chatInput");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    ask(text);
  });

  /* ============ FORMULÁRIO DE NOME ============ */
  $("#nameForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = $("#nameInput");
    const error = $("#nameError");
    const value = input.value.trim();

    if (value.length < 2) {
      error.hidden = false;
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }

    error.hidden = true;
    input.removeAttribute("aria-invalid");

    const mesmaPessoa = state.guest && state.guest.name === value.replace(/\s+/g, " ");
    saveGuest(value);

    if (nameIntent === "edicao") {
      go("perfil", { replace: true });
      toast("Nome atualizado.", "check");
      return;
    }
    afterIdentify(!mesmaPessoa);
  });

  // Revalida ao digitar, mas só depois do primeiro erro.
  $("#nameInput").addEventListener("input", (event) => {
    if ($("#nameError").hidden) return;
    if (event.target.value.trim().length >= 2) {
      $("#nameError").hidden = true;
      event.target.removeAttribute("aria-invalid");
    }
  });

  /* ============ BUSCA ============ */
  const searchInput = $("#placeSearch");
  searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    $("#placeSearchClear").hidden = state.query === "";
    renderPlaces();
  });
  $("#placeSearchClear").addEventListener("click", () => {
    searchInput.value = "";
    state.query = "";
    $("#placeSearchClear").hidden = true;
    renderPlaces();
    searchInput.focus();
  });

  /* ============ DELEGAÇÃO DE EVENTOS ============ */
  document.addEventListener("click", (event) => {
    const target = event.target;

    const back = target.closest("[data-back]");
    if (back) {
      goBack();
      return;
    }

    const goBtn = target.closest("[data-go]");
    if (goBtn) {
      if (goBtn.dataset.category) {
        state.category = goBtn.dataset.category;
        state.query = "";
        searchInput.value = "";
        $("#placeSearchClear").hidden = true;
        renderCategories();
        renderPlaces();
      }
      if (goBtn.dataset.day !== undefined) selectDay(Number(goBtn.dataset.day));
      go(goBtn.dataset.go);
      return;
    }

    const dayTab = target.closest("[data-day][role='tab']");
    if (dayTab) {
      selectDay(Number(dayTab.dataset.day));
      return;
    }

    const prefChip = target.closest("[data-pref]");
    if (prefChip) {
      state.prefs[Number(prefChip.dataset.pref)] = Number(prefChip.dataset.option);
      store.set(KEY.prefs, state.prefs);
      renderPrefs();
      return;
    }

    const categoryChip = target.closest("[data-category]");
    if (categoryChip && !categoryChip.dataset.go) {
      state.category = categoryChip.dataset.category;
      renderCategories();
      renderPlaces();
      return;
    }

    const saveBtn = target.closest("[data-save]");
    if (saveBtn) {
      toggleSaved(saveBtn.dataset.save);
      // Se veio do painel, o botão é atualizado no lugar — fechar o painel
      // por causa de um "salvar" tiraria o contexto de quem estava lendo.
      if (sheet.contains(saveBtn)) {
        const on = state.saved.has(saveBtn.dataset.save);
        saveBtn.setAttribute("aria-pressed", String(on));
        saveBtn.querySelector("use")?.setAttribute("href", on ? "#i-saved" : "#i-save");
        const label = saveBtn.querySelector("span:not(.sr-only)");
        if (label) label.textContent = on ? "Salvo" : "Salvar";
      }
      return;
    }

    const placeBtn = target.closest("[data-place]");
    if (placeBtn) {
      openPlaceSheet(placeBtn.dataset.place);
      return;
    }

    const attractionBtn = target.closest("[data-attraction]");
    if (attractionBtn) {
      openAttractionSheet(attractionBtn.dataset.attraction);
      return;
    }

    const marker = target.closest("[data-map-point]");
    if (marker) {
      showMapPoint(Number(marker.dataset.mapPoint));
      return;
    }

    const routeBtn = target.closest("[data-route]");
    if (routeBtn) {
      openRouteSheet(routeBtn.dataset.route, routeBtn.dataset.routeName || routeBtn.dataset.route);
      return;
    }

    const copyBtn = target.closest("[data-copy]");
    if (copyBtn) {
      copyText(copyBtn.dataset.copy, "Endereço copiado.");
      return;
    }

    const transportBtn = target.closest("[data-transport]");
    if (transportBtn) {
      handleTransport(transportBtn.dataset.kind);
      return;
    }

    const switchBtn = target.closest("[data-switch]");
    if (switchBtn) {
      toggleSwitch(switchBtn.dataset.switch);
      return;
    }

    const notifBtn = target.closest("[data-notif]");
    if (notifBtn) {
      const id = notifBtn.dataset.notif;
      state.read.add(id);
      store.set(KEY.read, [...state.read]);
      renderNotifications();
      const item = D.NOTIFICATIONS.find((n) => n.id === id);
      if (item?.go) go(item.go);
      return;
    }

    const askBtn = target.closest("[data-ask]");
    if (askBtn) {
      ask(askBtn.dataset.ask);
      return;
    }

    const actionBtn = target.closest("[data-action]");
    if (actionBtn) actions[actionBtn.dataset.action]?.();
  });

  function handleTransport(kind) {
    /* Carro particular abre rota de verdade; chamar corrida é o Uber
       levando até o destino, sem traçado nosso. */
    if (kind === "maps") {
      openRouteSheet(destinoDoEvento(), D.EVENT.name, "driving");
      return;
    }
    if (kind === "uber") {
      openRouteSheet(destinoDoEvento(), D.EVENT.name);
      return;
    }
    const detail = TRANSPORT_DETAIL[kind];
    if (!detail) return;
    openSheet(detail.title, [
      infoList(detail.rows),
      el("p", { className: "footnote", text: detail.note }),
    ]);
  }

  /* ============ AÇÕES ============ */
  let installPrompt = null;

  const actions = {
    calendar: addToCalendar,
    "share-ticket": shareTicket,
    "share-app": shareApp,
    "download-ticket": downloadTicketQr,

    /* Cancelar continua sendo um clique só. Confirmar passa pela ficha:
       é o momento em que a pessoa está disposta a responder. */
    "toggle-rsvp"() {
      if (!state.rsvp) return abrirFichaRsvp();
      state.rsvp = false;
      store.set(KEY.rsvp, false);
      renderRsvp();
      renderTicketQr();
      toast("Presença cancelada.", "close");
    },

    "editar-rsvp": abrirFichaRsvp,

    "read-all"() {
      for (const item of D.NOTIFICATIONS) state.read.add(item.id);
      store.set(KEY.read, [...state.read]);
      renderNotifications();
      toast("Todas as notificações marcadas como lidas.", "check");
    },

    "clear-filters"() {
      state.category = "todos";
      state.query = "";
      searchInput.value = "";
      $("#placeSearchClear").hidden = true;
      renderCategories();
      renderPlaces();
    },

    "edit-name"() {
      nameIntent = "edicao";
      const input = $("#nameInput");
      input.value = state.guest ? state.guest.name : "";
      $("#returningGuest").hidden = true;
      go("identificacao");
      setTimeout(() => input.focus(), 120);
    },

    /** Atalho de quem já entrou neste aparelho: um toque, sem redigitar. */
    "continue-as"() {
      if (!state.guest) return;
      afterIdentify(false);
    },

    async install() {
      if (!installPrompt) {
        toast("Use o menu do navegador para instalar o app.", "info");
        return;
      }
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      installPrompt = null;
      $("#installRow").hidden = true;
      if (outcome === "accepted") toast("App instalado no aparelho.", "check");
    },

    about() {
      openSheet("Sobre o Dyon", [
        el("p", { className: "screen-lead", text: "Dyon é a plataforma que conecta organizadores e convidados: um aplicativo com credencial, programação, mapa e guia da cidade, personalizado por evento." }),
        infoList([
          { icon: "event", label: "Evento", value: `${D.EVENT.name} · ${D.EVENT.edition}` },
          { icon: "calendar", label: "Data", value: D.EVENT.dateLabel },
          { icon: "location", label: "Local", value: `${D.EVENT.venue}, MG` },
          { icon: "shield", label: "Seus dados", value: "Nome, preferências e lugares salvos ficam apenas neste aparelho — nada é enviado para servidores." },
          { icon: "offline", label: "Offline", value: "Programação, credencial e guia continuam disponíveis sem internet." },
        ]),
        el("p", { className: "footnote", text: "Protótipo navegável. Ícones: Phosphor Icons (MIT). Tipografia: Sora e Inter (OFL)." }),
      ]);
    },

    reset() {
      openSheet("Limpar meus dados", [
        el("p", { className: "screen-lead", text: "Isso apaga o nome, as preferências, os lugares salvos e as notificações lidas deste aparelho. Não dá para desfazer." }),
        el("div", { className: "btn-row" }, [
          el("button", { className: "btn btn--outline", type: "button", text: "Cancelar", "data-action": "close-sheet" }),
          el("button", { className: "btn btn--primary", type: "button", text: "Apagar e sair", "data-action": "reset-confirm" }),
        ]),
      ]);
    },

    "reset-confirm"() {
      for (const key of Object.values(KEY)) store.remove(key);
      closeSheet();
      location.replace(location.href.split("#")[0]);
    },

    "close-sheet": closeSheet,
  };

  /* ============ AO ENTRAR EM CADA TELA ============ */
  const onEnter = {
    inicio() {
      renderCountdown();
      renderNextUp();
      renderNotifBadge();
    },
    mapa: renderMap,
    convite: renderTicketQr,
    notificacoes: renderNotifications,
    salvos: renderSaved,
    perfil() {
      $("#savedCount").textContent = state.saved.size ? String(state.saved.size) : "";
    },
    assistente() {
      setTimeout(() => (chatWindow.scrollTop = chatWindow.scrollHeight), 50);
    },
  };

  /* ============ REDE E INSTALAÇÃO ============ */
  const offlineBar = $("#offlineBar");
  const syncNetwork = () => {
    offlineBar.hidden = navigator.onLine;
  };
  window.addEventListener("online", syncNetwork);
  window.addEventListener("offline", syncNetwork);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    $("#installRow").hidden = false;
  });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
        /* sem cache offline; o app continua funcionando */
      });
    });

    // Quando uma versão nova assume o controle, o casco em memória fica
    // meio velho: recarrega uma vez para não misturar HTML novo com CSS
    // antigo. Só vale para a troca de versão — na primeira visita o
    // controlador também muda, e aí recarregar seria só um piscar à toa.
    const jaTinhaControlador = Boolean(navigator.serviceWorker.controller);
    let recarregando = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!jaTinhaControlador || recarregando) return;
      recarregando = true;
      location.reload();
    });
  }

  /* ============ INÍCIO ============ */
  /* O app sempre entra pela identificação, mesmo com um nome guardado:
     num aparelho que passa de mão em mão, quem chega depois precisa poder
     entrar com o próprio nome. Quem volta resolve num toque, pelo botão
     "Continuar como". */
  function defaultScreen() {
    return "identificacao";
  }

  /** Prepara a tela de nome para a entrada no app. */
  function prepareEntry() {
    nameIntent = "entrada";
    const input = $("#nameInput");
    const returning = $("#returningGuest");
    // Campo vazio de propósito: a próxima pessoa só digita.
    input.value = "";
    input.removeAttribute("aria-invalid");
    $("#nameError").hidden = true;

    if (state.guest) {
      $("#returningName").textContent = firstName();
      returning.hidden = false;
    } else {
      returning.hidden = true;
    }
  }

  /** Para onde ir depois de identificado. */
  function afterIdentify(novo) {
    const destino = pendingLink || (novo ? "boasvindas" : "inicio");
    pendingLink = null;
    go(destino, { replace: true });
  }

  applySettings();
  applyGuest();
  renderShortcuts();
  renderDiscover();
  renderEventInfo();
  renderDayTabs();
  renderDay();
  renderPrefs();
  renderCategories();
  renderPlaces();
  renderSaved();
  renderTransport();
  renderA11y();
  renderNotifications();
  renderGallery();
  renderHistory();
  renderAttractions();
  renderChatSuggestions();
  resetChat();
  renderRsvp();
  renderCountdown();
  renderNextUp();
  syncNetwork();

  // A contagem regressiva acompanha o relógio sem recarregar a tela.
  setInterval(renderCountdown, 60000);

  // Um link direto (#/convite, atalho do app instalado) é honrado, mas só
  // depois da identificação — senão o app abriria com o nome de outra pessoa.
  const deepLink = parseHash();
  if (deepLink && deepLink !== "splash" && deepLink !== "identificacao") {
    pendingLink = deepLink;
  }

  prepareEntry();
  show("splash");
  // A troca passa pelo hash: o hashchange é quem exibe a tela, move o foco
  // e a anuncia — chamar show() aqui também faria o trabalho duas vezes.

  /* ==================== VOZ ====================
     Perguntar falando e ouvir a resposta, pela Web Speech API do próprio
     navegador: sem biblioteca, sem servidor e sem custo.

     Duas coisas que o navegador impõe e o desenho respeita:
     - A escuta precisa nascer de um toque. Não existe palavra de ativação
       numa página web; por isso um botão, e não um "e aí, Dyon".
     - No iPhone a escuta encerra a cada frase e não religa sozinha. Lá o
       "continuar ouvindo" simplesmente não tem efeito, e o app volta a
       pedir o toque em vez de fingir que está ouvindo.

     O reconhecimento manda o áudio para o serviço do navegador (Google no
     Chrome, Apple no Safari) para transcrever. Não passa por servidor da
     Dyon, mas também não fica só no aparelho — e isso está dito na tela.
  ==================================================================== */
  const Reconhecimento = window.SpeechRecognition || window.webkitSpeechRecognition;
  const TEM_FALA = "speechSynthesis" in window;
  let vozEscolhida = null;
  let reconhecedor = null;
  let ouvindo = false;
  let modoVoz = false;      // liga na primeira vez que a pessoa usa o microfone
  let paradaPedida = false;

  function escolherVoz() {
    if (!TEM_FALA) return;
    const todas = speechSynthesis.getVoices();
    if (!todas.length) return;
    const pt = todas.filter((v) => /^pt/i.test(v.lang));
    const lista = pt.filter((v) => /BR/i.test(v.lang)).concat(pt);
    // Vozes masculinas de português nos sistemas mais comuns. A API não diz
    // o gênero da voz, então o jeito é reconhecer pelo nome.
    const masculinas = ["daniel", "felipe", "ricardo", "joao", "joão",
                        "antonio", "antônio", "eddy", "male", "homem"];
    vozEscolhida =
      lista.find((v) => masculinas.some((n) => v.name.toLowerCase().includes(n))) ||
      lista[0] || null;
  }

  function falar(texto, aoTerminar) {
    if (!TEM_FALA) { if (aoTerminar) aoTerminar(); return; }
    speechSynthesis.cancel();
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    // Um pouco mais devagar e com o tom levemente acima: é o que tira a
    // aspereza da voz sintética e faz ela soar calma em vez de robótica.
    fala.rate = 0.94;
    fala.pitch = 1.08;
    if (vozEscolhida) fala.voice = vozEscolhida;
    const fim = () => { if (aoTerminar) aoTerminar(); };
    fala.addEventListener("end", fim);
    fala.addEventListener("error", fim);
    speechSynthesis.speak(fala);
  }

  /* Chamada pelo ask(): só fala se a pessoa entrou no modo de voz. Quem
     está digitando não quer o celular falando alto no meio do evento. */
  function responderEmVoz(texto) {
    if (!modoVoz) return;
    dizEstado("Respondendo…");
    falar(texto, () => {
      const continuar = document.getElementById("vozContinua");
      if (continuar && continuar.checked && !paradaPedida) escutar();
      else dizEstado("Toque no microfone e fale sua pergunta.");
    });
  }

  function dizEstado(texto) {
    const estado = document.getElementById("vozEstado");
    if (estado) estado.textContent = texto;
  }

  function pintarMic(ativo) {
    const micBtn = document.getElementById("micBtn");
    if (micBtn) micBtn.setAttribute("aria-pressed", ativo ? "true" : "false");
  }

  function pararEscuta() {
    paradaPedida = true;
    if (reconhecedor) { try { reconhecedor.stop(); } catch (e) {} }
    ouvindo = false;
    pintarMic(false);
    dizEstado("Toque no microfone e fale sua pergunta.");
  }

  function escutar() {
    if (!Reconhecimento || ouvindo) return;
    paradaPedida = false;
    modoVoz = true;
    if (TEM_FALA) speechSynthesis.cancel();   // não escutar a si mesmo

    reconhecedor = new Reconhecimento();
    reconhecedor.lang = "pt-BR";
    reconhecedor.interimResults = true;
    reconhecedor.continuous = false;
    reconhecedor.maxAlternatives = 1;

    const campo = document.getElementById("chatInput");

    reconhecedor.addEventListener("result", (evento) => {
      let texto = "";
      for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
        texto += evento.results[i][0].transcript;
      }
      texto = texto.trim();
      if (campo) campo.value = texto;                 // mostra enquanto fala
      const ultimo = evento.results[evento.results.length - 1];
      if (ultimo.isFinal && texto) {
        if (campo) campo.value = "";
        ouvindo = false;
        pintarMic(false);
        ask(texto);
      }
    });

    reconhecedor.addEventListener("error", (evento) => {
      ouvindo = false;
      pintarMic(false);
      const erro = evento.error;
      if (erro === "not-allowed" || erro === "service-not-allowed") {
        dizEstado("O microfone está bloqueado. Libere nas permissões do navegador.");
      } else if (erro === "no-speech") {
        dizEstado("Não ouvi nada. Toque e fale de novo.");
      } else if (erro !== "aborted") {
        dizEstado("Não consegui ouvir agora. Toque para tentar de novo.");
      }
    });

    reconhecedor.addEventListener("end", () => {
      if (ouvindo) { ouvindo = false; pintarMic(false); }
    });

    try {
      reconhecedor.start();
      ouvindo = true;
      pintarMic(true);
      dizEstado("Ouvindo… pode falar.");
    } catch (e) {
      ouvindo = false;
      pintarMic(false);
      dizEstado("Toque no microfone e fale sua pergunta.");
    }
  }

  (function ligarVoz() {
    const micBtn = document.getElementById("micBtn");
    const barra = document.getElementById("vozBar");
    if (!micBtn || !barra) return;

    if (!Reconhecimento) {
      barra.hidden = false;
      dizEstado("Este navegador não reconhece fala. Funciona no Chrome do Android e no Safari do iPhone.");
      const troca = document.getElementById("vozContinua");
      if (troca) troca.closest(".vozbar__switch").hidden = true;
      return;
    }

    micBtn.hidden = false;
    barra.hidden = false;
    escolherVoz();
    if (TEM_FALA) speechSynthesis.addEventListener("voiceschanged", escolherVoz);

    micBtn.addEventListener("click", () => {
      if (ouvindo) pararEscuta();
      else escutar();
    });

    // Sair da tela do assistente cala o app: ninguém quer o celular falando
    // sozinho depois de trocar de aba.
    window.addEventListener("hashchange", () => {
      if (location.hash.indexOf("assistente") === -1) {
        paradaPedida = true;
        if (TEM_FALA) speechSynthesis.cancel();
        if (ouvindo) pararEscuta();
      }
    });
  })();

  setTimeout(() => {
    if (current === "splash") go("identificacao", { replace: true });
  }, 1600);
})();
