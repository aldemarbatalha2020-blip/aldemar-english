// Seção de posts: fotos e vídeos curtos (reels) com curtidas e comentários.
(function () {
  'use strict';
  var M = window.Mods = window.Mods || {};
  function AE() { return window.AE; }

  function tela(main) {
    var a = AE(), h = a.h;
    var feed = h('div', { class: 'feed' }, h('p', { class: 'mudo' }, 'Carregando…'));
    var mais = h('div');
    main.append(h('div', { class: 'linha-t' }, h('h2', {}, '📸 Posts'), h('button', { class: 'btn mini', onclick: novoPost }, '+ Novo post')),
      h('p', { class: 'mudo peq', style: 'margin-top:0' }, 'Mostre sua rotina de estudo, fotos e vídeos de até 30 segundos. O professor aprova cada post antes de aparecer.'),
      feed, mais);
    var primeiro = true;

    function carregar(antes) {
      a.api('GET', '/api/posts' + (antes ? '?antes=' + antes : '')).then(function (r) {
        if (primeiro) { feed.replaceChildren(); primeiro = false; }
        if (!r.posts.length && !feed.children.length) feed.append(h('div', { class: 'card' }, 'Ainda não há posts. Seja o primeiro a postar!'));
        r.posts.forEach(function (p) { feed.append(cartao(p)); });
        mais.replaceChildren();
        var pub = r.posts.filter(function (p) { return p.estado === 'publicado'; });
        if (!r.fim && pub.length) mais.append(h('button', { class: 'btn sec', onclick: function () { carregar(pub[pub.length - 1].id); } }, 'Ver mais'));
      }).catch(function (e) { feed.replaceChildren(h('div', { class: 'card' }, e.status === 0 ? 'Conecte-se à internet para ver os posts.' : e.message)); });
    }
    carregar(0);
  }

  function cartao(p) {
    var a = AE(), h = a.h, U = a.U;
    var curtidas = p.curtidas, eu = p.euCurti, ncom = p.comentarios;
    var el = h('article', { class: 'post' });
    var midia = p.tipo === 'video'
      ? h('video', { src: '/api/midia/' + p.midia, controls: 'controls', playsinline: 'playsinline', preload: 'metadata', loop: 'loop' })
      : h('img', { src: '/api/midia/' + p.midia, alt: 'Foto de ' + p.dono.nome, loading: 'lazy' });
    var btnC = h('button', { class: 'acao' + (eu ? ' on' : ''), onclick: function () {
      a.api('POST', '/api/posts/' + p.id + '/curtir').then(function (r) { curtidas = r.curtidas; eu = r.euCurti; pintar(); }).catch(a.falha);
    } });
    var btnM = h('button', { class: 'acao', onclick: function () { folhaComentarios(p, function (n) { ncom = n; pintar(); }); } });
    function pintar() { btnC.textContent = (eu ? '❤️ ' : '🤍 ') + curtidas; btnC.classList.toggle('on', eu); btnM.textContent = '💬 ' + ncom; }
    pintar();
    var meu = p.dono.id === U.id;
    var rodape = [];
    if (p.estado === 'pendente') rodape.push(h('div', { class: 'pendente' }, '⏳ Aguardando aprovação do professor. Só você vê este post por enquanto.'));
    else rodape.push(h('div', { class: 'acoes-p' }, btnC, btnM, h('span', { style: 'flex:1' }),
      !meu && !U.professor ? h('button', { class: 'acao mudo', onclick: function () { window.Mods.mod.folhaDenuncia('post', p.id, function () { el.remove(); }); } }, '🚩 Denunciar') : null));
    if (meu || U.professor) rodape.push(h('button', { class: 'link', onclick: function () {
      if (confirm('Apagar este post?')) a.api('DELETE', '/api/posts/' + p.id).then(function () { el.remove(); }).catch(a.falha);
    } }, 'Apagar post'));
    a.add(el, [h('div', { class: 'post-topo' }, h('button', { class: 'semfundo', onclick: function () { a.pessoa(p.dono.id); } }, a.av(p.dono)),
      h('div', {}, h('b', {}, p.dono.nome, p.dono.professor ? h('span', { class: 'etiqueta prof' }, 'PROF') : null), h('div', { class: 'mudo peq' }, a.dataBr(p.criado) + ' ' + a.hora(p.criado)))),
      midia, p.legenda ? h('p', { class: 'legenda' }, p.legenda) : null, rodape]);
    return el;
  }

  function folhaComentarios(p, aoMudar) {
    var a = AE(), h = a.h, U = a.U, fechar;
    var lista = h('div', { class: 'comentarios' }, h('p', { class: 'mudo' }, 'Carregando…'));
    var inp = h('input', { type: 'text', placeholder: 'Escreva um comentário…', maxlength: '200', autocomplete: 'off' });
    var total = 0;
    function linha(m) {
      var el = h('div', { class: 'coment' }, a.av(m.de), h('div', { style: 'flex:1;min-width:0' }, h('b', {}, m.de.nome), h('div', {}, m.texto)),
        m.de.id === U.id || U.professor
          ? h('button', { class: 'link', onclick: function () { a.api('DELETE', '/api/comentarios/' + m.id).then(function () { el.remove(); total--; aoMudar(total); }).catch(a.falha); } }, 'apagar')
          : h('button', { class: 'link', onclick: function () { window.Mods.mod.folhaDenuncia('comentario', m.id, function () { el.remove(); }); } }, 'denunciar'));
      return el;
    }
    function enviar() {
      var t = inp.value.trim(); if (!t) return; inp.value = '';
      a.api('POST', '/api/posts/' + p.id + '/comentarios', { texto: t }).then(function (m) {
        if (!total) lista.replaceChildren(); total++; lista.append(linha(m)); aoMudar(total);
      }).catch(function (e) { inp.value = t; a.falha(e); });
    }
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') enviar(); });
    fechar = a.folha(h('div', {}, h('h3', {}, '💬 Comentários'), lista, h('div', { class: 'envio' }, inp, h('button', { class: 'btn', onclick: enviar }, 'Enviar'))));
    a.api('GET', '/api/posts/' + p.id + '/comentarios').then(function (ms) {
      lista.replaceChildren(); total = ms.length;
      if (!ms.length) lista.append(h('p', { class: 'mudo' }, 'Nenhum comentário ainda.'));
      ms.forEach(function (m) { lista.append(linha(m)); });
    }).catch(a.falha);
  }

  function novoPost() {
    var a = AE(), h = a.h, mid = window.Mods.midia, fechar, blob = null, tipo = '';
    var arq = h('input', { type: 'file', accept: 'image/*,video/*', style: 'display:none' });
    var previa = h('div', { class: 'previa-np' }, h('p', { class: 'mudo peq' }, 'Escolha uma foto ou um vídeo de até 30 segundos.'));
    var legenda = h('textarea', { rows: '2', maxlength: '200', placeholder: 'Legenda (opcional) — escreva em inglês para praticar!' });
    var estado = h('p', { class: 'mudo peq' });
    var publicar = h('button', { class: 'btn', disabled: true }, 'Enviar para aprovação');
    arq.addEventListener('change', function () {
      var f = arq.files && arq.files[0]; if (!f) return;
      blob = null; publicar.disabled = true; previa.replaceChildren(); estado.textContent = 'Preparando…';
      var video = /^video\//.test(f.type);
      if (!video && !/^image\//.test(f.type)) { estado.textContent = 'Escolha uma foto ou um vídeo.'; return; }
      (video ? mid.processarVideo(f, function (x) { estado.textContent = 'Reduzindo o vídeo… ' + Math.round(x * 100) + '%'; }) : mid.processarImagem(f, 1280, false, 0.8))
        .then(function (b) {
          blob = b; tipo = video ? 'video' : 'foto'; estado.textContent = '';
          var url = URL.createObjectURL(b);
          previa.append(video ? h('video', { src: url, controls: 'controls', playsinline: 'playsinline' }) : h('img', { src: url, alt: 'prévia' }));
          publicar.disabled = false;
        }).catch(function (e) { estado.textContent = e.message; });
    });
    publicar.addEventListener('click', function () {
      if (!blob) return; publicar.disabled = true; estado.textContent = 'Enviando…';
      mid.enviar(tipo, blob).then(function (r) { return a.api('POST', '/api/posts', { midia: r.id, legenda: legenda.value }); })
        .then(function (p) {
          fechar();
          a.aviso(p.estado === 'publicado' ? 'Post publicado!' : 'Enviado! O professor vai aprovar antes de aparecer para a turma.');
          a.render();
        }).catch(function (e) { publicar.disabled = false; estado.textContent = e.message; });
    });
    fechar = a.folha(h('div', {}, h('h3', {}, '📸 Novo post'), arq, previa,
      h('button', { class: 'btn sec', onclick: function () { arq.click(); } }, '🖼️ Escolher foto ou vídeo'), h('div', { class: 'espaco' }), legenda, estado,
      h('p', { class: 'mudo peq' }, 'Sem nudez, violência, ofensas ou dados pessoais. Posts fora das regras são recusados e podem levar a silenciamento.'),
      publicar));
  }

  M.posts = { tela: tela };
})();
