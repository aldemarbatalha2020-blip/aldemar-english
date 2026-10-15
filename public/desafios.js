// Desafios e metas: do dia, da semana e os criados pelo professor. Cada um dá moedas.
(function () {
  'use strict';
  var M = window.Mods = window.Mods || {};
  function AE() { return window.AE; }
  var ICONE = { dia: '☀️', semana: '📅', professor: '🎓' };

  function cartao() {
    var a = AE(), h = a.h;
    var c = h('div', { class: 'card desafios' }, h('h3', { style: 'margin-bottom:8px' }, '🎯 Desafios de hoje'), h('p', { class: 'mudo peq', style: 'margin:0' }, 'Carregando…'));
    function carregar() {
      a.api('GET', '/api/desafios').then(function (ds) {
        c.replaceChildren(h('h3', { style: 'margin-bottom:8px' }, '🎯 Desafios de hoje'), h('p', { class: 'mudo peq', style: 'margin:0 0 4px' }, 'Valem por 24 h: renovam em ' + a.contagem(ds.length ? Math.min.apply(null, ds.filter(function (x) { return x.tipo === 'dia'; }).map(function (x) { return x.fim; }).concat([Date.now() + 864e5])) - Date.now() : 0) + '.'));
        var prontos = ds.filter(function (d) { return d.progresso >= d.meta && !d.resgatado; }).length;
        if (prontos) c.append(h('div', { class: 'pendente', style: 'margin:0 0 8px' }, '🎉 Você tem ' + prontos + ' recompensa' + (prontos > 1 ? 's' : '') + ' para resgatar!'));
        ds.forEach(function (d) {
          var pronto = d.progresso >= d.meta;
          var linha = h('div', { class: 'desafio' + (d.resgatado ? ' feito' : '') },
            h('div', { class: 'd-ic' }, ICONE[d.tipo] || '🎯'),
            h('div', { style: 'flex:1;min-width:0' }, h('b', {}, d.titulo),
              h('div', { class: 'barra', style: 'margin:6px 0 2px' }, h('i', { style: 'width:' + Math.round(d.progresso / d.meta * 100) + '%' })),
              h('small', { class: 'mudo' }, d.progresso + '/' + d.meta + ' ' + d.unidade + ' · 🪙 ' + d.moedas + (d.tipo === 'professor' && !d.resgatado ? ' · ⏳ ' + a.contagem(d.fim - Date.now()) : ''))),
            d.resgatado ? h('span', { class: 'mudo peq' }, '✓') : h('button', { class: 'btn mini ' + (pronto ? 'ouro' : 'sec'), disabled: !pronto, onclick: function () {
              a.api('POST', '/api/desafios/resgatar', { chave: d.chave }).then(function (u) { a.aplicar(u); a.aviso('🪙 +' + d.moedas + ' moedas!'); a.render(); }).catch(a.falha);
            } }, pronto ? 'Resgatar' : '🔒'));
          c.append(linha);
        });
      }).catch(function () { c.replaceChildren(); c.style.display = 'none'; });
    }
    carregar();
    return c;
  }

  // criação pelo professor (painel)
  function cartaoProfessor() {
    var a = AE(), h = a.h;
    var titulo = h('input', { type: 'text', placeholder: 'Ex.: Poste 3 stories em inglês', maxlength: '60' });
    var metrica = h('select', {}, [['historia', 'histórias lidas'], ['estudo', 'materiais de estudo lidos'], ['post', 'posts/stories/reels publicados'], ['comentario', 'comentários'], ['missao', 'missões'], ['xp', 'pontos'], ['curtida', 'curtidas dadas'], ['seguir', 'pessoas seguidas']].map(function (x) { return h('option', { value: x[0] }, x[1]); }));
    var meta = h('input', { type: 'number', min: '1', value: '3', placeholder: 'Meta' });
    var dias = h('select', {}, [[1, '24 horas'], [2, '2 dias'], [3, '3 dias'], [7, '7 dias']].map(function (x) { return h('option', { value: x[0], selected: x[0] === 1 ? 'selected' : false }, x[1]); }));
    var moedas = h('input', { type: 'number', min: '1', max: '200', value: '15', placeholder: 'Moedas' });
    var lista = h('div');
    var c = h('div', { class: 'card' }, h('h3', {}, '🎯 Criar desafio para a turma'),
      h('p', { class: 'mudo peq', style: 'margin-top:0' }, 'Todo aluno que cumprir a meta resgata as moedas (até 200). Os desafios do dia (24 h) já existem sozinhos.'),
      titulo, h('div', { class: 'espaco' }), metrica, h('div', { class: 'espaco' }),
      h('div', { style: 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px' }, meta, dias, moedas), h('div', { class: 'espaco' }),
      h('button', { class: 'btn', onclick: function () {
        a.api('POST', '/api/professor/desafio', { titulo: titulo.value, metrica: metrica.value, meta: Number(meta.value), dias: Number(dias.value), moedas: Number(moedas.value) })
          .then(function () { a.aviso('Desafio criado!'); titulo.value = ''; ver(); }).catch(a.falha);
      } }, 'Criar desafio'), lista);
    function ver() {
      a.api('GET', '/api/desafios').then(function (ds) {
        lista.replaceChildren();
        ds.filter(function (d) { return d.tipo === 'professor'; }).forEach(function (d) {
          lista.append(h('div', { class: 'tabela-p' }, h('div', { class: 'info' }, h('b', {}, d.titulo), h('div', { class: 'mudo peq' }, 'meta ' + d.meta + ' ' + d.unidade + ' · 🪙 ' + d.moedas + ' · até ' + a.dataBr(d.fim))),
            h('button', { class: 'btn coral mini', onclick: function () { a.api('DELETE', '/api/professor/desafio/' + d.id).then(ver).catch(a.falha); } }, 'Encerrar')));
        });
      }).catch(function () { /* ok */ });
    }
    ver();
    return c;
  }
  M.desafios = { cartao: cartao, cartaoProfessor: cartaoProfessor };
})();
