/* ==========================================================================
   DYON — Landing page
   ========================================================================== */
(function () {
  "use strict";

  var WHATSAPP_NUMBER = "5535999755191";
  var CONTACT_EMAIL = "contato_dyon@hotmail.com";

  /* ==========================================================================
     PROSPECÇÃO DE LEADS — onde os contatos ficam registrados
     --------------------------------------------------------------------------
     modo "netlify"  → o site está na Netlify. Cada envio vira um registro em
                       Netlify → seu site → Forms → "banco-de-espera".
                       Não precisa configurar mais nada. (padrão)

     modo "endpoint" → grava numa planilha do Google (ou Formspree, Sheet.best...).
                       Cole a URL em ENDPOINT. Passo a passo e o código da
                       planilha estão em COMO-ATIVAR-OS-LEADS.md.

     modo "email"    → sem registro automático: abre o e-mail já preenchido.

     Em qualquer modo, se o envio falhar o e-mail é aberto como plano B para
     que nenhum contato se perca.
     ========================================================================== */
  var LEADS = {
    modo: "email",
    endpoint: ""
  };

  /* ==================== MENU MOBILE ==================== */
  var navBurger = document.getElementById("navBurger");
  var navLinks = document.getElementById("navLinks");

  function setMenu(open) {
    navLinks.classList.toggle("open", open);
    navBurger.setAttribute("aria-expanded", String(open));
    navBurger.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  }

  navBurger.addEventListener("click", function () {
    setMenu(!navLinks.classList.contains("open"));
  });
  navLinks.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () { setMenu(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });
  document.addEventListener("click", function (e) {
    if (navLinks.classList.contains("open") && !e.target.closest(".nav-inner")) setMenu(false);
  });

  /* ==================== NAV: ESTADO AO ROLAR ==================== */
  var nav = document.getElementById("nav");
  var ticking = false;

  function onScroll() {
    nav.classList.toggle("scrolled", window.scrollY > 24);
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ==================== VISITA: ORIGEM E COMPORTAMENTO ==================== */
  var CHAVE_VISITA = "dyon:visita:v1";
  var inicioDaVisita = Date.now();
  var secoesVistas = [];

  var visita = (function () {
    var dados = {};
    try { dados = JSON.parse(localStorage.getItem(CHAVE_VISITA) || "{}"); } catch (e) { dados = {}; }

    var params = new URLSearchParams(location.search);
    var utm = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]
      .map(function (k) { var v = params.get(k); return v ? k.replace("utm_", "") + "=" + v : null; })
      .filter(Boolean).join(" · ");

    var origem = utm || (document.referrer
      ? document.referrer.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]
      : "acesso direto");

    if (!dados.primeira) dados.primeira = new Date().toISOString();
    if (!dados.origem || dados.origem === "acesso direto") dados.origem = origem;
    dados.visitas = (dados.visitas || 0) + 1;

    try { localStorage.setItem(CHAVE_VISITA, JSON.stringify(dados)); } catch (e) { /* modo privado */ }
    return dados;
  })();

  function formatarData(iso) {
    try { return new Date(iso).toLocaleString("pt-BR"); } catch (e) { return iso; }
  }

  function dispositivo() {
    var tipo = window.matchMedia("(max-width: 760px)").matches ? "celular"
      : window.matchMedia("(max-width: 1080px)").matches ? "tablet" : "computador";
    return tipo + " · " + window.screen.width + "x" + window.screen.height;
  }

  /* ==================== NAV: SEÇÃO ATIVA ==================== */
  var navMap = {};
  navLinks.querySelectorAll('a[href^="#"]').forEach(function (a) {
    var id = a.getAttribute("href").slice(1);
    if (document.getElementById(id)) navMap[id] = a;
  });

  var titulos = {};
  document.querySelectorAll("section[id]").forEach(function (s) {
    var h = s.querySelector("h1, h2");
    var texto = h ? (h.innerText || h.textContent) : s.id;
    titulos[s.id] = texto.trim().replace(/\s+/g, " ").slice(0, 40);
  });

  var sectionObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var id = entry.target.id;
      if (secoesVistas.indexOf(id) === -1) secoesVistas.push(id);
      if (navMap[id]) {
        Object.keys(navMap).forEach(function (k) {
          navMap[k].classList.toggle("active", k === id);
        });
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });

  document.querySelectorAll("section[id]").forEach(function (s) { sectionObserver.observe(s); });

  /* ==================== REVEAL AO ROLAR ==================== */
  var revealTargets = document.querySelectorAll(
    ".pillar-card, .audience-card, .channel-card, .step, .problem-chip, .eco-node, .chat-mock, .guest-showcase, .contact-grid, .chip-row span"
  );
  revealTargets.forEach(function (el, i) {
    el.classList.add("reveal");
    el.style.transitionDelay = (i % 6) * 60 + "ms";
  });

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  revealTargets.forEach(function (el) { revealObserver.observe(el); });

  /* ==================== AGENDAR APRESENTAÇÃO DO PROTÓTIPO ==================== */
  var scheduleStart = document.getElementById("scheduleStart");
  var scheduleStep1 = document.getElementById("scheduleStep1");
  var scheduleStep2 = document.getElementById("scheduleStep2");
  var scheduleWhatsapp = document.getElementById("scheduleWhatsapp");

  scheduleStart.addEventListener("click", function () {
    scheduleStart.style.display = "none";
    scheduleStep1.classList.add("show");
  });

  document.querySelectorAll(".schedule-option").forEach(function (btn) {
    btn.addEventListener("click", function () {
      scheduleWhatsapp.href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(btn.dataset.msg);
      scheduleStep1.classList.remove("show");
      scheduleStep2.classList.add("show");
    });
  });

  /* ==================== BOTÕES DE INTERESSE ==================== */
  var interestBtns = document.querySelectorAll(".interest-btn");
  interestBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      btn.setAttribute("aria-pressed", String(btn.classList.toggle("active")));
    });
  });

  /* ==================== FORMULÁRIO: VALIDAÇÃO ==================== */
  var leadForm = document.getElementById("leadForm");
  var leadSuccess = document.getElementById("leadSuccess");
  var leadSubmit = document.getElementById("leadSubmit");

  function fieldOf(input) { return input.closest(".field"); }

  function showError(input, message) {
    var field = fieldOf(input);
    field.classList.add("invalid");
    var msg = field.querySelector(".field-error");
    if (!msg) {
      msg = document.createElement("p");
      msg.className = "field-error";
      field.appendChild(msg);
    }
    msg.textContent = message;
    input.setAttribute("aria-invalid", "true");
  }

  function clearError(input) {
    var field = fieldOf(input);
    field.classList.remove("invalid");
    var msg = field.querySelector(".field-error");
    if (msg) msg.remove();
    input.removeAttribute("aria-invalid");
  }

  function validate() {
    var name = document.getElementById("fName");
    var email = document.getElementById("fEmail");
    var whats = document.getElementById("fWhats");
    var firstInvalid = null;

    [name, email, whats].forEach(clearError);

    if (name.value.trim().length < 2) {
      showError(name, "Digite seu nome.");
      firstInvalid = firstInvalid || name;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
      showError(email, "Digite um e-mail válido.");
      firstInvalid = firstInvalid || email;
    }
    if (whats.value.replace(/\D/g, "").length < 10) {
      showError(whats, "Digite o WhatsApp com DDD.");
      firstInvalid = firstInvalid || whats;
    }

    if (firstInvalid) { firstInvalid.focus(); return false; }
    return true;
  }

  ["fName", "fEmail", "fWhats"].forEach(function (id) {
    var input = document.getElementById(id);
    input.addEventListener("input", function () {
      if (fieldOf(input).classList.contains("invalid")) clearError(input);
    });
  });

  /* Máscara leve de telefone: (35) 99999-9999 */
  var whatsInput = document.getElementById("fWhats");
  whatsInput.addEventListener("input", function () {
    var d = whatsInput.value.replace(/\D/g, "").slice(0, 11);
    var out = d;
    if (d.length > 2) out = "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length > 6) {
      var split = d.length > 10 ? 7 : 6;
      out = "(" + d.slice(0, 2) + ") " + d.slice(2, split) + "-" + d.slice(split);
    }
    whatsInput.value = out;
  });

  /* ==================== FORMULÁRIO: ENVIO E REGISTRO ==================== */
  function preencherCamposDeProspeccao() {
    var interesses = Array.prototype.filter.call(interestBtns, function (b) {
      return b.classList.contains("active");
    }).map(function (b) { return b.dataset.interest; });

    var vistas = secoesVistas.map(function (id) { return titulos[id] || id; });

    var valores = {
      fInterest: interesses.length ? interesses.join(" | ") : "-",
      fOrigem: visita.origem || "acesso direto",
      fReferrer: document.referrer || "-",
      fFirstSeen: formatarData(visita.primeira),
      fVisits: String(visita.visitas || 1),
      fSections: vistas.length ? vistas.join(" › ") : "-",
      fTime: Math.round((Date.now() - inicioDaVisita) / 1000) + "s",
      fDevice: dispositivo(),
      fSentAt: new Date().toLocaleString("pt-BR")
    };

    Object.keys(valores).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = valores[id];
    });
  }

  function corpoDoEmail(dados) {
    return "Nome: " + dados.nome +
      "\nEmpresa: " + (dados.empresa || "-") +
      "\nE-mail: " + dados.email +
      "\nWhatsApp: " + dados.whatsapp +
      "\nPerfil: " + dados.perfil +
      "\nInteresse: " + dados.interesse +
      "\n\nMensagem:\n" + (dados.mensagem || "-") +
      "\n\n--- Prospecção ---" +
      "\nOrigem: " + dados.origem +
      "\nPágina de origem: " + dados.pagina_de_origem +
      "\nPrimeira visita: " + dados.primeira_visita +
      "\nVisitas: " + dados.visitas +
      "\nSeções vistas: " + dados.secoes_vistas +
      "\nTempo no site: " + dados.tempo_no_site +
      "\nDispositivo: " + dados.dispositivo +
      "\nEnviado em: " + dados.enviado_em;
  }

  function abrirEmail(dados) {
    var assunto = encodeURIComponent("Novo contato pelo site — " + dados.nome);
    var corpo = encodeURIComponent(corpoDoEmail(dados));
    window.location.href = "mailto:" + CONTACT_EMAIL + "?subject=" + assunto + "&body=" + corpo;
  }

  function registrarLead(dados) {
    var corpo = new URLSearchParams(dados).toString();

    if (LEADS.modo === "netlify") {
      return fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: corpo
      }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return true;
      });
    }

    if (LEADS.modo === "endpoint" && LEADS.endpoint) {
      return fetch(LEADS.endpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: corpo
      }).then(function () { return true; });
    }

    return Promise.reject(new Error("sem-registro"));
  }

  function mostrarSucesso(texto) {
    if (texto) leadSuccess.querySelector("p").textContent = texto;
    leadForm.style.display = "none";
    leadSuccess.classList.add("show");
    leadSuccess.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  leadForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) return;

    preencherCamposDeProspeccao();

    var dados = {};
    new FormData(leadForm).forEach(function (valor, chave) {
      if (chave !== "bot-field") dados[chave] = valor;
    });

    leadSubmit.disabled = true;
    leadSubmit.textContent = "Enviando…";

    registrarLead(dados)
      .then(function () {
        mostrarSucesso("Obrigado! Você entrou para o banco de espera da Dyon — em breve entraremos em contato.");
      })
      .catch(function () {
        /* Plano B: nenhum contato se perde */
        abrirEmail(dados);
        mostrarSucesso("Quase lá! Abrimos seu aplicativo de e-mail com a mensagem pronta — é só tocar em enviar.");
      })
      .then(function () {
        leadForm.reset();
        interestBtns.forEach(function (b) {
          b.classList.remove("active");
          b.setAttribute("aria-pressed", "false");
        });
        leadSubmit.disabled = false;
        leadSubmit.textContent = "Quero falar com a Dyon";
      });
  });

  /* ==================== ANO DO RODAPÉ ==================== */
  var copy = document.querySelector(".footer-copy");
  if (copy) copy.textContent = "© " + new Date().getFullYear() + " Dyon. Todos os direitos reservados.";
})();
