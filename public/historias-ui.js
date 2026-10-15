// História: pequenas histórias do dia a dia para ler, ouvir e entender, com 3 perguntas no final.
(function () {
  'use strict';
  var M = window.Mods = window.Mods || {};
  function AE() { return window.AE; }
  var feitas = null; // { id: acertos }

  function carregar(cb) {
    AE().api('GET', '/api/leituras').then(function (r) { feitas = r.historias || {}; cb(); }).catch(function () { feitas = feitas || {}; cb(); });
  }
  function estrelas(n) { return n === 3 ? '⭐⭐⭐' : n === 2 ? '⭐⭐' : n === 1 ? '⭐' : '✓'; }

  function tela(main) {
    var a = AE(), h = a.h, lista = window.HISTORIAS || [];
    var corpo = h('div', { class: 'hist-grade' });
    function desenhar() {
      var n = lista.filter(function (s) { return feitas && feitas[s.id] != null; }).length;
      corpo.replaceChildren();
      lista.forEach(function (s) {
        var f = feitas && feitas[s.id] != null ? feitas[s.id] : null;
        corpo.append(h('button', { class: 'hist-card' + (f != null ? ' lido' : ''), onclick: function () { ler(s); } },
          h('div', { class: 'hist-em' }, s.ic),
          h('b', {}, s.t),
          h('small', { class: 'mudo' }, s.n + ' · ' + s.min + ' min'),
          h('small', { class: 'hist-st' }, f != null ? estrelas(f) : 'Nova')));
      });
      resumo.textContent = n + ' de ' + lista.length + ' histórias concluídas';
    }
    var resumo = h('b', {}, '');
    main.append(h('h2', {}, '📖 História'),
      h('p', { class: 'mudo peq', style: 'margin:2px 0 10px' }, 'Situações do dia a dia, curtas e diretas. Leia, ouça e responda 3 perguntas.'),
      h('div', { class: 'linha-p' }, resumo, h('span', { class: 'mudo peq' }, '+3 🪙 (+2 se acertar tudo)')), corpo);
    if (feitas) desenhar(); else { desenhar(); carregar(desenhar); }
  }

  function ler(s) {
    var a = AE(), h = a.h, fechar;
    var traduz = false, tocando = false, parar = false, vel = 0.85;
    var frases = [];
    var texto = h('div', { class: 'hist-texto' });
    s.f.forEach(function (f, i) {
      var en = h('span', { class: 'en' }, f[0] + ' '), pt = h('span', { class: 'pt' }, f[1]);
      var el = h('p', { class: 'frase', onclick: function () { parar = true; dizer(i, true); } }, en, pt);
      frases.push(el); texto.append(el);
    });
    function marcar(i) { frases.forEach(function (f, k) { f.classList.toggle('lendo', k === i); }); }
    function dizer(i, uma) {
      if (!('speechSynthesis' in window)) { a.aviso('Seu aparelho não tem voz para ouvir. Leia no texto.', true); return; }
      try {
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(s.f[i][0]); u.lang = 'en-US'; u.rate = vel;
        marcar(i);
        u.onend = function () { if (!uma && !parar && i + 1 < s.f.length) dizer(i + 1, false); else { tocando = false; marcar(-1); atualizar(); } };
        u.onerror = function () { tocando = false; marcar(-1); atualizar(); };
        if (uma) { tocando = false; atualizar(); }
        speechSynthesis.speak(u);
      } catch (e) { /* sem voz */ }
    }
    var bOuvir = h('button', { class: 'btn mini', onclick: function () {
      if (tocando) { parar = true; tocando = false; try { speechSynthesis.cancel(); } catch (e) { /* ok */ } marcar(-1); atualizar(); return; }
      parar = false; tocando = true; atualizar(); dizer(0, false);
    } }, '');
    var bVel = h('button', { class: 'btn sec mini', onclick: function () { vel = vel === 0.85 ? 0.65 : 0.85; atualizar(); } }, '');
    var bTrad = h('button', { class: 'btn sec mini', onclick: function () { traduz = !traduz; texto.classList.toggle('com-pt', traduz); atualizar(); } }, '');
    function atualizar() {
      bOuvir.textContent = tocando ? '⏹ Parar' : '▶ Ouvir tudo';
      bVel.textContent = vel === 0.85 ? '🐇 Normal' : '🐢 Lento';
      bTrad.textContent = traduz ? '🇧🇷 Ocultar tradução' : '🇧🇷 Ver tradução';
    }
    atualizar();
    var vocab = h('div', { class: 'vocab' }, s.v.map(function (v) {
      return h('button', { class: 'vc', onclick: function () { a.falar(v[0]); } }, h('b', {}, '🔊 ' + v[0]), h('small', { class: 'mudo' }, v[1]));
    }));
    var area = h('div', {});
    var c = h('div', { class: 'leitor' },
      h('div', { class: 'leitor-topo' }, h('span', { class: 'est-ic grande' }, s.ic), h('div', {}, h('h3', {}, s.t), h('small', { class: 'mudo' }, s.n + ' · ' + s.min + ' min'))),
      h('div', { class: 'ferr' }, bOuvir, bVel, bTrad),
      h('p', { class: 'mudo peq', style: 'margin:0 0 8px' }, 'Toque numa frase para ouvi-la.'),
      texto, h('h4', { style: 'margin:14px 0 6px' }, 'Palavras da história'), vocab, area);

    function fechaTudo() { parar = true; try { speechSynthesis.cancel(); } catch (e) { /* ok */ } fechar(); }
    area.append(h('button', { class: 'btn', style: 'margin-top:14px', onclick: function () { parar = true; try { speechSynthesis.cancel(); } catch (e) { /* ok */ } quiz(); } }, 'Responder às 3 perguntas'));

    function quiz() {
      var i = 0, acertos = 0;
      function passo() {
        area.replaceChildren();
        if (i >= s.q.length) return fim();
        var q = s.q[i], travado = false;
        area.append(h('h4', { style: 'margin:16px 0 8px' }, 'Pergunta ' + (i + 1) + ' de ' + s.q.length), h('p', { class: 'perg' }, q.p));
        var ops = h('div', { class: 'ops' });
        q.o.forEach(function (o, k) {
          var b = h('button', { class: 'op', onclick: function () {
            if (travado) return; travado = true;
            var ok = k === q.c; if (ok) acertos++;
            b.classList.add(ok ? 'certo' : 'errado');
            if (!ok) ops.children[q.c].classList.add('certo');
            setTimeout(function () { i++; passo(); }, 900);
          } }, o);
          ops.append(b);
        });
        area.append(ops);
        area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      function fim() {
        area.append(h('p', { class: 'mudo' }, 'Salvando…'));
        a.api('POST', '/api/historia/concluir', { id: s.id, acertos: acertos }).then(function (u) {
          a.aplicar(u); if (!feitas) feitas = {};
          if (feitas[s.id] == null || acertos > feitas[s.id]) feitas[s.id] = acertos;
          var g = u.ganhou && u.ganhou.moedas;
          area.replaceChildren(h('div', { class: 'resultado' }, h('div', { class: 'big' }, estrelas(acertos)),
            h('h3', {}, acertos + ' de ' + s.q.length + ' certas'),
            h('p', { class: 'mudo' }, g ? '🪙 +' + g + ' moedas pela história!' : 'Você já tinha concluído esta história — o ganho de moedas é só na primeira vez.'),
            h('button', { class: 'btn', onclick: function () { fechaTudo(); a.render(); } }, 'Voltar às histórias')));
        }).catch(function (e) { a.falha(e); area.replaceChildren(h('button', { class: 'btn', onclick: fim }, 'Tentar salvar de novo')); });
      }
      passo();
    }
    fechar = a.folha(c);
    // fechar a folha por fora também interrompe a voz
    var obs = new MutationObserver(function () { if (!document.body.contains(c)) { parar = true; try { speechSynthesis.cancel(); } catch (e) { /* ok */ } obs.disconnect(); } });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  M.historias = { tela: tela };
})();
