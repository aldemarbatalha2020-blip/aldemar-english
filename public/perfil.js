// Perfil estilo rede social: bio, seguidores, perfil público/privado, grade de posts, presentes e chamadas.
(function () {
  'use strict';
  var M = window.Mods = window.Mods || {};
  function AE() { return window.AE; }

  function montar(caixa, id) {
    var a = AE(), h = a.h, U = a.U, eu = id === U.id;
    caixa.replaceChildren(h('p', { class: 'mudo' }, 'Carregando…'));
    a.api('GET', '/api/perfil/' + id).then(function (p) { desenhar(caixa, p, eu); }).catch(function (e) { caixa.replaceChildren(h('div', { class: 'card' }, e.status === 0 ? 'Conecte-se à internet para ver o perfil.' : e.message)); });
  }

  function numero(n, rotulo, aoClicar) {
    var h = AE().h;
    return h('button', { class: 'conta', onclick: aoClicar || null, disabled: !aoClicar }, h('b', {}, String(n)), h('small', {}, rotulo));
  }

  function desenhar(caixa, p, eu) {
    var a = AE(), h = a.h, U = a.U;
    var recarregar = function () { montar(caixa, p.id); };
    var avatar = h('button', { class: 'semfundo', 'aria-label': 'Ver story', onclick: function () {
      if (!p.temStory) { if (eu) M.midia.folhaFoto(); return; }
      a.api('GET', '/api/stories').then(function (gs) { var i = gs.map(function (g) { return g.dono.id; }).indexOf(p.id); if (i >= 0) M.posts.stories(gs, i); }).catch(a.falha);
    } }, h('div', { class: 'anel grande' + (p.temStory ? '' : ' sem') }, a.av(p, 'grande')));
    var cab = h('div', { class: 'perfil-cab' }, avatar,
      h('div', { class: 'perfil-contas' },
        numero(p.posts, 'posts'),
        numero(p.seguidores, 'seguidores', p.podeVer ? function () { lista(p, 'seguidores'); } : null),
        numero(p.seguindo, 'seguindo', p.podeVer ? function () { lista(p, 'seguindo'); } : null)));
    var nome = h('div', { class: 'perfil-nome' }, h('h3', { style: 'margin:0' }, p.nome, p.pro ? h('span', { class: 'etiqueta' }, 'PRO') : null, p.professor ? h('span', { class: 'etiqueta prof' }, 'PROFESSOR') : null),
      h('div', { class: 'mudo peq' }, (p.privado ? '🔒 Perfil privado · ' : '🌎 Perfil público · ') + p.xp + ' pontos · 🔥 ' + p.streak + ' · ' + p.missoes + ' missões'),
      p.bio ? h('p', { class: 'bio' }, p.bio) : (eu ? h('p', { class: 'mudo peq' }, 'Adicione uma bio em “Editar perfil”.') : null));
    var botoes = h('div', { class: 'perfil-botoes' });
    if (eu) {
      botoes.append(h('button', { class: 'btn sec mini', onclick: function () { editar(p, recarregar); } }, '✏️ Editar perfil'), h('button', { class: 'btn mini', onclick: function () { M.posts.criar(); } }, '+ Criar'));
    } else {
      var seg = h('button', { class: 'btn mini' + (p.relacao === 'nenhuma' ? '' : ' sec'), onclick: function () {
        var acao = p.relacao === 'nenhuma' ? a.api('POST', '/api/seguir/' + p.id) : (confirm(p.relacao === 'pedido' ? 'Cancelar pedido?' : 'Deixar de seguir ' + p.nome + '?') ? a.api('DELETE', '/api/seguir/' + p.id) : null);
        if (acao) acao.then(function (r) { if (r.relacao === 'pedido') a.aviso('Pedido enviado. ' + p.nome + ' precisa aceitar.'); recarregar(); }).catch(a.falha);
      } }, p.relacao === 'seguindo' ? 'Seguindo ✓' : (p.relacao === 'pedido' ? 'Pedido enviado' : (p.segueVoce ? 'Seguir de volta' : 'Seguir')));
      botoes.append(seg, h('button', { class: 'btn sec mini', onclick: function () { a.conversar(p); } }, '💬 Mensagem'), h('button', { class: 'btn sec mini', onclick: function () { presentear(p); } }, '🎁 Presentear'));
      var mutuo = (p.relacao === 'seguindo' && p.segueVoce) || p.professor || U.professor;
      if (mutuo && window.Mods.chamada) botoes.append(h('button', { class: 'btn sec mini', 'aria-label': 'Chamada de áudio', onclick: function () { M.chamada.ligar(p, 'audio'); } }, '📞'), h('button', { class: 'btn sec mini', 'aria-label': 'Chamada de vídeo', onclick: function () { M.chamada.ligar(p, 'video'); } }, '🎥'));
      if (U.professor && !p.professor) botoes.append(h('button', { class: 'btn sec mini', onclick: function () { a.api('POST', '/api/professor/confiavel', { id: p.id, confiavel: !p.confiavel }).then(function () { a.aviso(p.confiavel ? 'Aluno deixou de ser de confiança.' : 'Aluno de confiança: posts sem aprovação prévia.'); recarregar(); }).catch(a.falha); } }, p.confiavel ? '⭐ Confiável' : '☆ Confiável'));
    }
    var corpo = h('div', { class: 'perfil-grade' });
    caixa.replaceChildren(cab, nome, botoes);
    if (eu) {
      var nivel = h('div', { class: 'barra', style: 'margin:10px 0 4px' }, h('i', { style: 'width:' + (U.xp % 100) + '%' }));
      caixa.append(h('div', { class: 'mudo peq' }, 'Nível ' + (Math.floor(U.xp / 100) + 1) + ' · ' + (U.xp % 100) + '/100 para o próximo' + (U.fotoPend ? ' · ⏳ foto aguardando aprovação' : '')), nivel);
      pedidos(caixa, recarregar);
    } else if (p.foto && !p.professor) caixa.append(h('button', { class: 'link', onclick: function () { M.mod.folhaDenuncia('perfil', p.id); } }, '🚩 Denunciar esta foto de perfil'));
    caixa.append(h('h3', { class: 'perfil-h' }, 'Posts'), corpo);
    grade(corpo, p, eu);
  }

  function grade(corpo, p, eu) {
    var a = AE(), h = a.h;
    if (!p.podeVer) { corpo.replaceChildren(h('div', { class: 'privado-aviso' }, h('div', { style: 'font-size:34px' }, '🔒'), h('b', {}, 'Este perfil é privado'), h('p', { class: 'mudo peq' }, 'Siga ' + p.nome + ' e espere a aprovação para ver os posts.'))); return; }
    var mais = h('div');
    var grid = h('div', { class: 'grade-p' });
    corpo.replaceChildren(grid, mais);
    function carregar(antes) {
      a.api('GET', '/api/usuario/' + p.id + '/posts' + (antes ? '?antes=' + antes : '')).then(function (r) {
        if (!r.posts.length && !grid.children.length) { grid.replaceWith(h('p', { class: 'mudo' }, eu ? 'Você ainda não postou. Toque em “+ Criar”!' : 'Sem posts ainda.')); return; }
        r.posts.forEach(function (x) {
          var m = x.tipo === 'video' ? h('video', { src: '/api/midia/' + x.midia + '#t=0.1', preload: 'metadata', muted: 'muted', playsinline: 'playsinline' }) : h('img', { src: '/api/midia/' + x.midia, alt: 'post', loading: 'lazy' });
          grid.append(h('button', { class: 'mini-p', onclick: function () { M.posts.abrir(x); } }, m, x.tipo === 'video' ? h('span', { class: 'sel-ic' }, x.formato === 'reel' ? '🎬' : '▶') : null, x.estado === 'pendente' ? h('span', { class: 'sel-pend' }, '⏳') : null));
        });
        mais.replaceChildren();
        if (!r.fim && r.posts.length) mais.append(h('button', { class: 'btn sec', onclick: function () { carregar(r.posts[r.posts.length - 1].id); } }, 'Ver mais'));
      }).catch(function (e) { corpo.replaceChildren(h('p', { class: 'mudo' }, e.message)); });
    }
    carregar(0);
  }

  function pedidos(caixa, recarregar) {
    var a = AE(), h = a.h;
    a.api('GET', '/api/pedidos').then(function (ps) {
      if (!ps.length) return;
      var c = h('div', { class: 'card' }, h('h3', {}, '🙋 Pedidos para te seguir (' + ps.length + ')'));
      ps.forEach(function (p) {
        c.append(h('div', { class: 'tabela-p' }, h('button', { class: 'semfundo', onclick: function () { a.perfil(p.id); } }, a.av(p)), h('div', { class: 'info' }, h('b', {}, p.nome)),
          h('div', { class: 'acoes' },
            h('button', { class: 'btn ciano mini', onclick: function () { a.api('POST', '/api/pedidos/' + p.id, { aceitar: true }).then(recarregar).catch(a.falha); } }, 'Aceitar'),
            h('button', { class: 'btn sec mini', onclick: function () { a.api('POST', '/api/pedidos/' + p.id, { aceitar: false }).then(recarregar).catch(a.falha); } }, 'Recusar'))));
      });
      var ref = caixa.querySelector('.perfil-h'); if (ref) caixa.insertBefore(c, ref); else caixa.append(c);
    }).catch(function () { /* sem pedidos */ });
  }

  function lista(p, tipo) {
    var a = AE(), h = a.h, fechar;
    var corpo = h('div', {}, h('p', { class: 'mudo' }, 'Carregando…'));
    fechar = a.folha(h('div', {}, h('h3', {}, tipo === 'seguidores' ? 'Seguidores' : 'Seguindo'), corpo));
    a.api('GET', '/api/usuario/' + p.id + '/lista?tipo=' + tipo).then(function (ps) {
      corpo.replaceChildren();
      if (!ps.length) corpo.append(h('p', { class: 'mudo' }, 'Ninguém por aqui ainda.'));
      ps.forEach(function (x) { corpo.append(h('button', { class: 'conv', onclick: function () { fechar(); a.perfil(x.id); } }, a.av(x), h('div', {}, h('b', {}, x.nome), h('div', { class: 'ult' }, x.xp + ' pontos')))); });
    }).catch(function (e) { corpo.replaceChildren(h('p', { class: 'mudo' }, e.message)); });
  }

  function editar(p, depois) {
    var a = AE(), h = a.h, fechar;
    var bio = h('textarea', { rows: '3', maxlength: '120', placeholder: 'Conte algo sobre você (em inglês, se quiser!)' }); bio.value = p.bio || '';
    var priv = h('input', { type: 'checkbox' }); priv.checked = !!p.privado;
    var erro = h('div', { class: 'erro' });
    fechar = a.folha(h('div', {}, h('h3', {}, '✏️ Editar perfil'),
      h('button', { class: 'btn sec', onclick: function () { fechar(); M.midia.folhaFoto(); } }, '📷 Trocar foto ou avatar'), h('div', { class: 'espaco' }),
      h('label', { class: 'mudo peq' }, 'Bio (até 120 letras)'), bio,
      h('label', { class: 'aceite' }, priv, h('span', {}, '🔒 Perfil privado: só seguidores que eu aceitar veem meus posts e stories.')),
      h('p', { class: 'mudo peq', style: 'margin-top:0' }, 'Perfil público: qualquer colega da turma pode ver e seguir na hora. O professor sempre pode ver os posts, por segurança.'),
      erro, h('button', { class: 'btn', onclick: function () {
        a.api('POST', '/api/perfil/config', { bio: bio.value, privado: priv.checked }).then(function (u) { a.aplicar(u); fechar(); a.aviso('Perfil atualizado!'); depois(); }).catch(function (e) { erro.textContent = e.message; });
      } }, 'Salvar')));
  }

  function presentear(p) {
    var a = AE(), h = a.h, fechar;
    var moedas = h('select', {}, [5, 10, 25, 50].map(function (n) { return h('option', { value: n }, n + ' moedas'); }));
    fechar = a.folha(h('div', {}, h('h3', {}, '🎁 Presentear ' + p.nome),
      h('div', { class: 'opcoes-f' },
        h('button', { class: 'btn ouro', disabled: p.pro, onclick: function () {
          a.api('POST', '/api/presente', { para: p.id, tipo: 'energia' }).then(function (u) { a.aplicar(u); fechar(); a.render(); a.aviso('⚡ Energia enviada para ' + p.nome + '!'); }).catch(a.falha);
        } }, p.pro ? 'Aluno Pro já tem energia ilimitada' : '⚡ Dar 1 de energia (10 🪙)'),
        h('div', { style: 'display:flex;gap:8px' }, moedas, h('button', { class: 'btn ciano mini', style: 'white-space:nowrap', onclick: function () {
          a.api('POST', '/api/presente', { para: p.id, tipo: 'moedas', qtd: Number(moedas.value) }).then(function (u) { a.aplicar(u); fechar(); a.render(); a.aviso('🪙 Moedas enviadas para ' + p.nome + '!'); }).catch(a.falha);
        } }, 'Dar moedas')))));
  }

  // tela completa de visita
  function tela(main, id, voltar) {
    var a = AE(), h = a.h, caixa = h('div');
    main.append(h('button', { class: 'voltar', onclick: voltar }, '← Voltar'), caixa);
    montar(caixa, id);
  }

  M.perfil = { montar: montar, tela: tela };
})();
