/* ==========================================================================
   DYON — Landing page
   ========================================================================== */
(function () {
  "use strict";

  var WHATSAPP_NUMBER = "5535999755191";
  var CONTACT_EMAIL = "contato_dyon@hotmail.com";

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

  /* ==================== NAV: SEÇÃO ATIVA ==================== */
  var navMap = {};
  navLinks.querySelectorAll('a[href^="#"]').forEach(function (a) {
    var id = a.getAttribute("href").slice(1);
    if (document.getElementById(id)) navMap[id] = a;
  });

  var sectionObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      Object.keys(navMap).forEach(function (id) {
        navMap[id].classList.toggle("active", id === entry.target.id);
      });
    });
  }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });

  Object.keys(navMap).forEach(function (id) {
    sectionObserver.observe(document.getElementById(id));
  });

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

  /* ==================== FORMULÁRIO DE LEADS ==================== */
  var leadForm = document.getElementById("leadForm");
  var leadSuccess = document.getElementById("leadSuccess");

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

  leadForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) return;

    var val = function (id) { return document.getElementById(id).value.trim(); };
    var interests = Array.prototype.filter.call(interestBtns, function (b) {
      return b.classList.contains("active");
    }).map(function (b) { return b.dataset.interest; });

    var subject = encodeURIComponent("Novo contato pelo site — " + val("fName"));
    var body = encodeURIComponent(
      "Nome: " + val("fName") +
      "\nEmpresa: " + (val("fCompany") || "-") +
      "\nE-mail: " + val("fEmail") +
      "\nWhatsApp: " + val("fWhats") +
      "\nPerfil: " + document.getElementById("fProfile").value +
      "\nInteresse: " + (interests.length ? interests.join(" | ") : "-") +
      "\n\nMensagem:\n" + (val("fMsg") || "-")
    );

    /* Abre o e-mail já preenchido com os dados do lead para a equipe Dyon */
    window.location.href = "mailto:" + CONTACT_EMAIL + "?subject=" + subject + "&body=" + body;

    leadForm.reset();
    interestBtns.forEach(function (b) {
      b.classList.remove("active");
      b.setAttribute("aria-pressed", "false");
    });
    leadForm.style.display = "none";
    leadSuccess.classList.add("show");
  });

  /* ==================== ANO DO RODAPÉ ==================== */
  var copy = document.querySelector(".footer-copy");
  if (copy) copy.textContent = "© " + new Date().getFullYear() + " Dyon. Todos os direitos reservados.";
})();
