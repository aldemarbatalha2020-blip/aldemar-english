// Estudos: o livro de referência com 50 materiais explicativos.
(function () {
  'use strict';
  var M = window.Mods = window.Mods || {};
  function AE() { return window.AE; }
  var lidos = null, busca = '', cat = 'Todos';

  function carregar(cb) {
    AE().api('GET', '/api/leituras').then(function (r) { lidos = r.estudos || []; window.Mods._leit = r; cb(); }).catch(function () { lidos = lidos || []; cb(); });
  }

  function tela(main) {
    var a = AE(), h = a.h, lista = window.ESTUDOS || [];
    var cats = ['Todos'];
    lista.forEach(function (e) { if (cats.indexOf(e.cat) < 0) cats.push(e.cat); });
    var corpo = h('div', { class: 'est-lista' });
    var prog = h('div', { class: 'est-prog' });
    var campo = h('input', { type: 'search', placeholder: 'Buscar no livro (ex.: verbo, there is, plural)', value: busca, 'aria-label': 'Buscar material' });
    campo.addEventListener('input', function () { busca = campo.value; desenhar(); });
    var chips = h('div', { class: 'chips-f rolagem' });
    function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
    function desenhar() {
      var feitos = lista.filter(function (e) { return lidos && lidos.indexOf(e.id) >= 0; }).length;
      prog.replaceChildren(h('div', { class: 'linha-p' }, h('b', {}, feitos + ' de ' + lista.length + ' lidos'), h('span', { class: 'mudo peq' }, '+1 🪙 por material novo')),
        h('div', { class: 'barra' }, h('i', { style: 'width:' + Math.round(feitos / Math.max(1, lista.length) * 100) + '%' })));
      chips.replaceChildren();
      cats.forEach(function (c) { chips.append(h('button', { class: 'chip-f' + (c === cat ? ' sel' : ''), onclick: function () { cat = c; desenhar(); } }, c)); });
      corpo.replaceChildren();
      var q = norm(busca.trim());
      var vis = lista.filter(function (e) { return (cat === 'Todos' || e.cat === cat) && (!q || norm(e.t + ' ' + e.r).indexOf(q) >= 0); });
      if (!vis.length) corpo.append(h('div', { class: 'card vazio' }, 'Nenhum material encontrado. Tente outra palavra ou escolha "Todos".'));
      vis.forEach(function (e) {
        var ok = lidos && lidos.indexOf(e.id) >= 0;
        corpo.append(h('button', { class: 'est-card' + (ok ? ' lido' : ''), onclick: function () { abrir(e); } },
          h('div', { class: 'est-ic' }, e.ic),
          h('div', { class: 'est-tx' }, h('b', {}, e.t), h('small', { class: 'mudo' }, e.r), h('small', { class: 'est-cat' }, e.cat)),
          h('div', { class: 'est-ck' }, ok ? '✓' : '›')));
      });
    }
    main.append(h('h2', {}, '📚 Estudos'), h('p', { class: 'mudo peq', style: 'margin:2px 0 10px' }, 'Seu livro de referência: explicações curtas com exemplos para ouvir.'), prog, campo, chips, corpo);
    if (lidos) desenhar(); else { desenhar(); carregar(desenhar); }
  }

  function abrir(e) {
    var a = AE(), h = a.h, fechar;
    var c = h('div', { class: 'leitor' },
      h('div', { class: 'leitor-topo' }, h('span', { class: 'est-ic grande' }, e.ic), h('div', {}, h('h3', {}, e.t), h('small', { class: 'mudo' }, e.cat))),
      h('p', { class: 'resumo' }, e.r));
    e.b.forEach(function (bl) {
      var sec = h('section', { class: 'bloco' }, h('h4', {}, bl.t), h('p', {}, bl.p));
      if (bl.ex && bl.ex.length) {
        var ul = h('div', { class: 'exs' });
        bl.ex.forEach(function (x) {
          ul.append(h('button', { class: 'ex', onclick: function () { a.falar(x[0]); }, 'aria-label': 'Ouvir: ' + x[0] },
            h('span', { class: 'ex-som' }, '🔊'), h('span', {}, h('b', {}, x[0]), h('small', { class: 'mudo' }, x[1]))));
        });
        sec.append(ul);
      }
      c.append(sec);
    });
    if (e.d) c.append(h('div', { class: 'dica-b' }, h('b', {}, '💡 Dica'), h('p', {}, e.d)));
    var ja = lidos && lidos.indexOf(e.id) >= 0;
    var btn = h('button', { class: 'btn' + (ja ? ' sec' : ''), onclick: function () {
      if (ja) { fechar(); return; }
      btn.disabled = true;
      a.api('POST', '/api/estudos/lido', { id: e.id }).then(function (u) {
        a.aplicar(u); if (lidos.indexOf(e.id) < 0) lidos.push(e.id);
        if (u.ganhou && u.ganhou.moedas) a.aviso('🪙 +' + u.ganhou.moedas + ' moeda por estudar!');
        fechar(); a.render();
      }).catch(function (er) { btn.disabled = false; a.falha(er); });
    } }, ja ? 'Fechar' : 'Marcar como lido (+1 🪙)');
    c.append(btn);
    fechar = a.folha(c, 'alta');
  }

  M.estudos = { tela: tela };
})();
