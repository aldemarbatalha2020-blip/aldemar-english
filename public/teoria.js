// Teoria do capítulo: ficha de explicações com exemplos que podem ser ouvidos.
(function () {
  'use strict';
  var M = window.Mods = window.Mods || {};
  function AE() { return window.AE; }
  function vistaKey(id) { return 'ae_teoria_' + id; }

  function conteudo(capId, aoFechar, textoBotao) {
    var a = AE(), h = a.h, t = (window.TEORIA || {})[capId];
    if (!t) return null;
    var c = h('div', { class: 'teoria' }, h('h3', {}, '📖 ' + t.titulo), h('p', { class: 'mudo', style: 'margin:0 0 10px' }, t.resumo));
    (t.blocos || []).forEach(function (b) {
      var bl = h('div', { class: 'bloco-t' }, h('b', {}, b.t), h('p', {}, b.p));
      (b.ex || []).forEach(function (e) {
        bl.append(h('div', { class: 'ex-t' },
          h('button', { class: 'fala peq', 'aria-label': 'Ouvir', onclick: function () { a.falar(e[0]); } }, '🔊'),
          h('div', {}, h('div', { class: 'en' }, e[0]), h('div', { class: 'mudo peq' }, e[1]))));
      });
      c.append(bl);
    });
    if (t.cuidados && t.cuidados.length) c.append(h('div', { class: 'cuidado' }, h('b', {}, '⚠️ Cuidado!'), h('ul', {}, t.cuidados.map(function (x) { return h('li', {}, x); }))));
    c.append(h('button', { class: 'btn', onclick: aoFechar }, textoBotao || 'Entendi'));
    return c;
  }

  // abre a ficha a qualquer momento (botão do capítulo)
  function folha(capId) {
    var fechar, c = conteudo(capId, function () { fechar(); }, 'Fechar');
    if (!c) return;
    try { localStorage.setItem(vistaKey(capId), '1'); } catch (e) { /* ok */ }
    fechar = AE().folha(c);
  }
  // antes da primeira missão do capítulo: mostra uma vez e depois segue
  function antes(capId, seguir) {
    var vista = false;
    try { vista = !!localStorage.getItem(vistaKey(capId)); } catch (e) { /* ok */ }
    if (vista || !(window.TEORIA || {})[capId]) { seguir(); return; }
    var fechar, c = conteudo(capId, function () { fechar(); seguir(); }, 'Entendi, vamos praticar!');
    try { localStorage.setItem(vistaKey(capId), '1'); } catch (e) { /* ok */ }
    fechar = AE().folha(c);
  }
  M.teoria = { folha: folha, antes: antes };
})();
