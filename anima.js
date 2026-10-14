/* ==========================================================================
   DYON — camada de animação
   --------------------------------------------------------------------------
   Este arquivo é decorativo por definição. Nada aqui pode ser necessário para
   ler, entender ou usar o site:

   • Os números já estão escritos no HTML com o valor final. A contagem só
     substitui o texto durante a animação e devolve o valor original no fim —
     então buscador, leitor de tela e navegador sem JavaScript veem o número
     certo.
   • Tudo roda dentro de try/catch. Se qualquer parte falhar, a página fica
     igual ao que é hoje, sem erro visível.
   • Quem pediu menos movimento no sistema (prefers-reduced-motion) recebe o
     estado final na hora, sem animação nenhuma.

   Carregue sempre ANTES do script.js, com defer.
   ========================================================================== */
(function () {
  "use strict";

  var MENOS_MOVIMENTO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TOQUE = window.matchMedia('(pointer: coarse)').matches;

  /** Executa sem nunca derrubar o resto da página. */
  function seguro(nome, fn) {
    try { fn(); } catch (e) {
      if (window.console && console.warn) console.warn('[dyon] ' + nome + ' não pôde iniciar:', e);
    }
  }

  var EASE = function (t) { return 1 - Math.pow(1 - t, 3); };   // desacelera no fim

  /* ====================================================================
     1. CONTAGEM CRESCENTE
     Lê o número que já está no HTML, zera, e conta até ele quando a
     pessoa chega na seção. Formato brasileiro: 140,9 / 47.262.
     ==================================================================== */
  var RE_NUMERO = /^(\D*?)([\d.]+(?:,\d+)?)(\D*)$/;

  function interpretar(texto) {
    var m = RE_NUMERO.exec(texto.trim());
    if (!m) return null;
    var bruto = m[2];
    var casas = bruto.indexOf(',') >= 0 ? bruto.split(',')[1].length : 0;
    var valor = parseFloat(bruto.replace(/\./g, '').replace(',', '.'));
    if (!isFinite(valor)) return null;
    return { prefixo: m[1], sufixo: m[3], valor: valor, casas: casas, original: texto };
  }

  function formatar(n, casas) {
    return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  }

  function contar(el, dados) {
    var inicio = null;
    var duracao = 1500;

    function passo(agora) {
      if (inicio === null) inicio = agora;
      var t = Math.min((agora - inicio) / duracao, 1);
      el.textContent = dados.prefixo + formatar(dados.valor * EASE(t), dados.casas) + dados.sufixo;
      if (t < 1) requestAnimationFrame(passo);
      else el.textContent = dados.original;   // devolve exatamente o que estava no HTML
    }
    requestAnimationFrame(passo);
  }

  seguro('contagem', function () {
    var alvos = document.querySelectorAll('.stat-num, .gap-value, .gap-big, .app-num');
    if (!alvos.length || !('IntersectionObserver' in window)) return;
    if (MENOS_MOVIMENTO) return;   // o HTML já mostra o valor final

    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        observador.unobserve(entrada.target);
        var dados = entrada.target.__num;
        if (dados) contar(entrada.target, dados);
      });
    }, { threshold: 0.6 });

    alvos.forEach(function (el) {
      var dados = interpretar(el.textContent);
      if (!dados) return;
      el.__num = dados;
      // Trava a largura antes de zerar, senão o cartão "pula" durante a contagem.
      el.style.minWidth = el.getBoundingClientRect().width + 'px';
      el.textContent = dados.prefixo + formatar(0, dados.casas) + dados.sufixo;
      observador.observe(el);
    });
  });

  /* ====================================================================
     2. GRÁFICO DE CRESCIMENTO PRESO À ROLAGEM
     As duas barras crescem conforme a seção atravessa a tela. São dois
     pontos reais de dados — 2019 e abril de 2025. Nenhum ano intermediário
     é desenhado, porque esse dado não existe.
     ==================================================================== */
  seguro('grafico', function () {
    var secao = document.getElementById('descompasso');
    if (!secao) return;
    var barras = secao.querySelectorAll('.grafico-barra > span');
    if (!barras.length) return;

    if (MENOS_MOVIMENTO) {
      barras.forEach(function (b) { b.style.transform = 'scaleY(1)'; });
      return;
    }

    var pendente = false;

    function desenhar() {
      pendente = false;
      var r = secao.getBoundingClientRect();
      var altura = window.innerHeight || document.documentElement.clientHeight;
      // 0 quando a seção encosta embaixo, 1 quando já subiu um terço da tela
      var p = (altura - r.top) / (altura * 0.75);
      p = Math.max(0, Math.min(1, p));
      barras.forEach(function (b) { b.style.transform = 'scaleY(' + EASE(p).toFixed(3) + ')'; });
    }

    function aoRolar() {
      if (!pendente) { pendente = true; requestAnimationFrame(desenhar); }
    }

    // Só escuta a rolagem enquanto a seção está por perto.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) window.addEventListener('scroll', aoRolar, { passive: true });
          else window.removeEventListener('scroll', aoRolar);
        });
      }, { rootMargin: '200px 0px' }).observe(secao);
    } else {
      window.addEventListener('scroll', aoRolar, { passive: true });
    }
    desenhar();
  });

  /* ====================================================================
     3. REDE DE PARTÍCULAS DO TOPO
     As partículas entram espalhadas, se juntam no losango da marca, e
     depois soltam e ficam à deriva, ligadas por linhas finas. Ao rolar,
     a formação se abre.

     O logotipo em si continua no HTML, intacto — isto é só o fundo.
     ==================================================================== */
  seguro('particulas', function () {
    var tela = document.getElementById('heroRede');
    var hero = document.getElementById('inicio');
    if (!tela || !hero || !tela.getContext) return;
    if (MENOS_MOVIMENTO) { tela.style.display = 'none'; return; }

    var ctx = tela.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var L = 0, A = 0;
    var particulas = [];
    var QUANTAS = TOQUE ? 34 : 88;
    var DISTANCIA = TOQUE ? 98 : 136;
    var nascimento = null;
    var rodando = false;
    var pedido = null;
    var espalhar = 0;

    var estilo = getComputedStyle(document.documentElement);
    var COR_PONTO = (estilo.getPropertyValue('--gold') || '#C9A876').trim();
    var COR_LINHA = (estilo.getPropertyValue('--violet-400') || '#A78BFA').trim();

    /** Pontos distribuídos pelo contorno do losango da marca. */
    function alvoLosango(i, total) {
      var lado = Math.floor(i / (total / 4)) % 4;
      var t = (i % (total / 4)) / (total / 4);
      var r = Math.min(L, A) * 0.17;
      var cx = L * 0.5, cy = A * 0.46;
      var cantos = [[0, -r], [r, 0], [0, r], [-r, 0]];
      var de = cantos[lado], para = cantos[(lado + 1) % 4];
      return { x: cx + de[0] + (para[0] - de[0]) * t, y: cy + de[1] + (para[1] - de[1]) * t };
    }

    function medir() {
      // Quem dimensiona é o CSS (inset:0). Fixar largura em pixels aqui fazia
      // a tela manter o tamanho antigo ao girar o celular — um canvas de
      // desktop sobrando numa tela de 375px. Aqui só ajustamos a resolução
      // interna, que é o que o canvas precisa para não sair borrado.
      L = tela.clientWidth; A = tela.clientHeight;
      if (!L || !A) { var r = hero.getBoundingClientRect(); L = r.width; A = r.height; }
      tela.width = Math.round(L * dpr);
      tela.height = Math.round(A * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particulas.forEach(function (p, i) {
        var alvo = alvoLosango(i, QUANTAS);
        p.ax = alvo.x; p.ay = alvo.y;
      });
    }

    function criar() {
      particulas = [];
      for (var i = 0; i < QUANTAS; i++) {
        particulas.push({
          x: Math.random() * L, y: Math.random() * A,
          vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
          ax: 0, ay: 0, r: Math.random() * 1.4 + 0.7
        });
      }
      medir();
    }

    function quadro(agora) {
      if (nascimento === null) nascimento = agora;
      var vida = (agora - nascimento) / 1000;
      // 0 → 1 durante a formação (2,4s), depois volta a 0 e as partículas soltam
      var atracao = vida < 2.4 ? EASE(Math.min(vida / 1.6, 1)) * (1 - Math.max(0, (vida - 1.8) / 0.6)) : 0;

      ctx.clearRect(0, 0, L, A);

      for (var i = 0; i < particulas.length; i++) {
        var p = particulas[i];
        if (atracao > 0.001) {
          p.x += (p.ax - p.x) * 0.045 * atracao;
          p.y += (p.ay - p.y) * 0.045 * atracao;
        }
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > L) p.vx *= -1;
        if (p.y < 0 || p.y > A) p.vy *= -1;

        // ao rolar, a formação se abre a partir do centro
        var dx = (p.x - L / 2) * espalhar * 0.22;
        var dy = (p.y - A / 2) * espalhar * 0.22;
        var px = p.x + dx, py = p.y + dy;
        p.px = px; p.py = py;

        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, 6.2832);
        ctx.fillStyle = COR_PONTO;
        ctx.globalAlpha = 0.62;
        ctx.fill();
      }

      for (var a = 0; a < particulas.length; a++) {
        for (var b = a + 1; b < particulas.length; b++) {
          var ux = particulas[a].px - particulas[b].px;
          var uy = particulas[a].py - particulas[b].py;
          var d = Math.sqrt(ux * ux + uy * uy);
          if (d > DISTANCIA) continue;
          ctx.beginPath();
          ctx.moveTo(particulas[a].px, particulas[a].py);
          ctx.lineTo(particulas[b].px, particulas[b].py);
          ctx.strokeStyle = COR_LINHA;
          ctx.globalAlpha = (1 - d / DISTANCIA) * 0.3;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      pedido = requestAnimationFrame(quadro);
    }

    function ligar() {
      if (rodando) return;
      rodando = true;
      pedido = requestAnimationFrame(quadro);
    }
    function desligar() {
      rodando = false;
      if (pedido) cancelAnimationFrame(pedido);
      pedido = null;
    }

    criar();
    ligar();

    // economiza bateria: nada roda com a aba escondida ou o topo fora da tela
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) desligar(); else ligar();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) ligar(); else desligar(); });
      }).observe(hero);
    }

    var redimensionando;
    window.addEventListener('resize', function () {
      clearTimeout(redimensionando);
      redimensionando = setTimeout(medir, 180);
    });

    var aguardando = false;
    window.addEventListener('scroll', function () {
      if (aguardando) return;
      aguardando = true;
      requestAnimationFrame(function () {
        aguardando = false;
        var y = window.scrollY || 0;
        espalhar = Math.max(0, Math.min(1, y / (A || 700)));
      });
    }, { passive: true });
  });

  /* ====================================================================
     4. O NOTEBOOK SE ENDIREITA
     Entra inclinado e vai ficando de frente conforme sobe a tela, como se a
     câmera se alinhasse com ele. Sem JavaScript fica na inclinação do CSS.
     ==================================================================== */
  seguro('notebook', function () {
    var fig = document.querySelector('.plataforma');
    var tela = fig && fig.querySelector('.laptop-tela');
    if (!tela || MENOS_MOVIMENTO) return;
    if (window.matchMedia('(max-width:520px)').matches) return;  // no celular fica reto

    var pendente = false;

    function ajustar() {
      pendente = false;
      var r = fig.getBoundingClientRect();
      var altura = window.innerHeight || document.documentElement.clientHeight;
      var p = (altura - r.top) / (altura * 0.85);
      p = Math.max(0, Math.min(1, p));
      var grau = (1 - EASE(p)) * 11;
      tela.style.transform = 'rotateX(' + grau.toFixed(2) + 'deg)';
    }

    function aoRolar() {
      if (!pendente) { pendente = true; requestAnimationFrame(ajustar); }
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) window.addEventListener('scroll', aoRolar, { passive: true });
          else window.removeEventListener('scroll', aoRolar);
        });
      }, { rootMargin: '250px 0px' }).observe(fig);
    }
    ajustar();
  });

  /* ====================================================================
     5. MICROINTERAÇÃO NOS CARTÕES
     Inclinação muito leve seguindo o ponteiro. Só em quem tem mouse —
     no celular não existe "passar por cima", e o efeito só atrapalharia.
     ==================================================================== */
  seguro('cartoes', function () {
    if (TOQUE || MENOS_MOVIMENTO) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var cartoes = document.querySelectorAll('.pillar-card, .stat-card, .audience-card');

    // O transform vai direto no elemento, e não por classe: os cartões já usam
    // transform no reveal e no hover, e três regras disputando a mesma
    // propriedade acabam uma anulando a outra. Ao sair, o estilo é devolvido
    // ao CSS, que retoma o hover normal.
    cartoes.forEach(function (c) {
      var lift = c.classList.contains('pillar-card') ? -5 : -4;

      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        var gx = ((e.clientY - r.top) / r.height - 0.5) * -3;
        var gy = ((e.clientX - r.left) / r.width - 0.5) * 3;
        c.style.transform = 'perspective(900px) rotateX(' + gx.toFixed(2) + 'deg) rotateY(' +
          gy.toFixed(2) + 'deg) translateY(' + lift + 'px)';
      });

      c.addEventListener('pointerleave', function () {
        c.style.transform = '';
      });
    });
  });
})();
