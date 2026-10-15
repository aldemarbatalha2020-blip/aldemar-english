// Loja: gasta as moedas ganhas em missões, estudos, histórias e desafios.
(function () {
  'use strict';
  var M = window.Mods = window.Mods || {};
  function AE() { return window.AE; }

  function tela(main) {
    var a = AE(), h = a.h, U = a.U;
    var corpo = h('div', {}, h('p', { class: 'mudo' }, 'Carregando a loja…'));
    var saldo = h('div', { class: 'saldo' });
    function topoSaldo() {
      var u = a.U, extras = [];
      if (u.congelar) extras.push('🧊 ' + u.congelar + ' proteção' + (u.congelar > 1 ? 'ões' : ''));
      if (u.xp2Ate && u.xp2Ate > Date.now() + 0) extras.push('🚀 dobro até ' + a.hora(u.xp2Ate));
      saldo.replaceChildren(h('div', { class: 'saldo-n' }, '🪙 ' + u.gemas), h('small', { class: 'mudo' }, extras.length ? extras.join(' · ') : 'Suas moedas'));
    }
    main.append(h('h2', {}, '🛍️ Loja'), h('p', { class: 'mudo peq', style: 'margin:2px 0 10px' }, 'Ganhe moedas fazendo missões, lendo materiais, histórias e cumprindo desafios.'), saldo, corpo);
    topoSaldo();

    function comprar(item, nome) {
      return a.api('POST', '/api/loja/comprar', { item: item }).then(function (u) { a.aplicar(u); a.aviso('Comprado: ' + nome); a.render(); }).catch(a.falha);
    }
    a.api('GET', '/api/loja').then(function (l) {
      var u = a.U;
      corpo.replaceChildren(h('h3', { class: 'sec-t' }, 'Itens'));
      l.itens.forEach(function (it) {
        corpo.append(h('div', { class: 'loja-item' },
          h('div', { style: 'flex:1;min-width:0' }, h('b', {}, it.nome), h('small', { class: 'mudo', style: 'display:block' }, it.desc)),
          h('button', { class: 'btn mini ouro', disabled: u.gemas < it.preco, onclick: function () { comprar(it.id, it.nome); } }, '🪙 ' + it.preco)));
      });
      corpo.append(h('h3', { class: 'sec-t' }, 'Molduras para o seu avatar'));
      var grade = h('div', { class: 'molduras' });
      var vazio = h('button', { class: 'mold' + (!l.moldura ? ' sel' : ''), onclick: function () { equipar(''); } }, a.av({ avatar: u.avatar, foto: u.foto }), h('small', {}, 'Sem moldura'));
      grade.append(vazio);
      l.molduras.forEach(function (m) {
        var tem = m.tenho;
        grade.append(h('button', { class: 'mold' + (l.moldura === m.id ? ' sel' : ''), disabled: !tem && u.gemas < m.preco, onclick: function () { tem ? equipar(m.id) : comprar(m.id, m.nome); } },
          a.av({ avatar: u.avatar, foto: u.foto, moldura: m.id }), h('small', {}, m.nome), h('small', { class: 'mudo' }, tem ? (l.moldura === m.id ? 'Em uso' : 'Usar') : '🪙 ' + m.preco)));
      });
      corpo.append(grade);
      function equipar(id) { a.api('POST', '/api/loja/equipar', { moldura: id }).then(function (r) { a.aplicar(r); a.render(); }).catch(a.falha); }
    }).catch(function (e) { corpo.replaceChildren(h('div', { class: 'card' }, e.status === 0 ? 'Conecte-se à internet para usar a loja.' : e.message)); });
  }
  M.loja = { tela: tela };
})();
