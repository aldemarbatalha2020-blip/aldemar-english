// Posts: feed, reels, stories, criação (foto, vídeo até 1:30, reel, story), curtir, comentar e compartilhar.
(function () {
  'use strict';
  var M = window.Mods = window.Mods || {};
  function AE() { return window.AE; }
  var aba = 'feed'; // feed | seguindo | reels

  // ---------- compartilhar ----------
  function compartilhar(p) {
    var a = AE(), url = location.origin + '/#post-' + p.id, txt = 'Veja o post de ' + p.dono.nome + ' no Aldemar English';
    if (navigator.share) { navigator.share({ title: 'Aldemar English', text: txt, url: url }).catch(function () { /* cancelou */ }); return; }
    try { navigator.clipboard.writeText(url).then(function () { a.aviso('Link copiado! Só quem pode ver o post consegue abrir.'); }, function () { a.aviso(url); }); } catch (e) { a.aviso(url); }
  }

  // ---------- tela ----------
  function tela(main) {
    var a = AE(), h = a.h;
    var corpo = h('div'), mais = h('div');
    var seg = h('div', { class: 'abas-l' }, [['feed', 'Feed'], ['seguindo', 'Seguindo'], ['reels', 'Reels']].map(function (x) {
      return h('button', { class: aba === x[0] ? 'ativo' : '', onclick: function () { aba = x[0]; a.render(); } }, x[1]);
    }));
    main.append(h('div', { class: 'linha-t' }, h('h2', {}, 'Posts'), h('button', { class: 'btn mini criar-b', onclick: function () { folhaCriar(); } }, M.ic('plus', 18), 'Criar')),
      M.live ? M.live.faixa() : null, barraStories(), seg, corpo, mais);
    var primeiro = true, obs = null;
    if (aba === 'reels') obs = observarReels();

    function carregar(antes) {
      var url = '/api/posts?' + (antes ? 'antes=' + antes + '&' : '') + (aba === 'seguindo' ? 'filtro=seguindo' : (aba === 'reels' ? 'formato=reel' : ''));
      a.api('GET', url).then(function (r) {
        if (primeiro) { corpo.replaceChildren(); primeiro = false; }
        if (!r.posts.length && !corpo.children.length) corpo.append(h('div', { class: 'card' }, aba === 'seguindo' ? 'Você ainda não segue ninguém com posts. Visite perfis pelo Ranking e toque em Seguir.' : (aba === 'reels' ? 'Ainda não há reels. Grave o primeiro!' : 'Ainda não há posts. Seja o primeiro a postar!')));
        r.posts.forEach(function (p) { var el = cartao(p, { reel: aba === 'reels' }); corpo.append(el); if (obs && p.tipo === 'video') obs.observe(el); });
        mais.replaceChildren();
        var pub = r.posts.filter(function (p) { return p.estado === 'publicado'; });
        if (!r.fim && pub.length) mais.append(h('button', { class: 'btn sec', onclick: function () { carregar(pub[pub.length - 1].id); } }, 'Ver mais'));
      }).catch(function (e) { corpo.replaceChildren(h('div', { class: 'card' }, e.status === 0 ? 'Conecte-se à internet para ver os posts.' : e.message)); });
    }
    carregar(0);
  }

  // reels: toca só o vídeo que está na tela
  function observarReels() {
    if (!('IntersectionObserver' in window)) return null;
    return new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target.querySelector('video'); if (!v) return;
        if (e.isIntersecting && e.intersectionRatio > 0.6) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () { /* precisa de toque */ }); } else v.pause();
      });
    }, { threshold: [0, 0.6, 1] });
  }

  // ---------- cartão de post ----------
  function cartao(p, opc) {
    opc = opc || {};
    var a = AE(), h = a.h, U = a.U;
    var curtidas = p.curtidas, eu = p.euCurti, ncom = p.comentarios;
    var el = h('article', { class: 'post' + (opc.reel ? ' reel' : '') });
    var midia;
    if (p.tipo === 'video') {
      midia = h('video', { src: '/api/midia/' + p.midia, controls: opc.reel ? false : 'controls', playsinline: 'playsinline', preload: 'metadata', loop: opc.reel ? 'loop' : false, muted: opc.reel ? 'muted' : false });
      if (opc.reel) {
        midia.muted = true;
        midia.addEventListener('click', function () { midia.muted = !midia.muted; if (midia.paused) midia.play(); som.textContent = midia.muted ? '🔇' : '🔊'; });
      }
    } else midia = h('img', { src: '/api/midia/' + p.midia, alt: 'Foto de ' + p.dono.nome, loading: 'lazy' });
    var som = h('span', { class: 'som' }, '🔇');
    var coracao = h('span', { class: 'coracao-anim', hidden: 'hidden' }, M.ic('heart', 84, true)), ultToque = 0;
    function toqueDuplo() { if (!eu) btnC.click(); coracao.hidden = false; coracao.classList.remove('vai'); void coracao.offsetWidth; coracao.classList.add('vai'); setTimeout(function () { coracao.hidden = true; }, 800); }
    midia.addEventListener('click', function () { var t = Date.now(); if (t - ultToque < 320) toqueDuplo(); ultToque = t; });
    var btnC = h('button', { class: 'acao', onclick: function () {
      a.api('POST', '/api/posts/' + p.id + '/curtir').then(function (r) { curtidas = r.curtidas; eu = r.euCurti; pintar(); }).catch(a.falha);
    } });
    var btnM = h('button', { class: 'acao', onclick: function () { folhaComentarios(p, function (n) { ncom = n; pintar(); }); } });
    function pintar() { btnC.replaceChildren(M.ic('heart', 24, eu), h('span', {}, String(curtidas))); btnC.classList.toggle('on', eu); btnM.replaceChildren(M.ic('comment', 23), h('span', {}, String(ncom))); }
    pintar();
    var meu = p.dono.id === U.id;
    var rodape = [];
    if (p.estado === 'pendente') rodape.push(h('div', { class: 'pendente' }, 'Aguardando aprovação do professor. Só você vê este post por enquanto.'));
    else rodape.push(h('div', { class: 'acoes-p' }, btnC, btnM, h('button', { class: 'acao', 'aria-label': 'Compartilhar', onclick: function () { compartilhar(p); } }, M.ic('share', 23), h('span', {}, 'Enviar')), h('span', { style: 'flex:1' }),
      !meu && !U.professor ? h('button', { class: 'acao mudo', 'aria-label': 'Denunciar', onclick: function () { window.Mods.mod.folhaDenuncia('post', p.id, function () { el.remove(); }); } }, M.ic('flag', 21)) : null));
    if (meu || U.professor) rodape.push(h('button', { class: 'link', onclick: function () {
      if (confirm('Apagar este post?')) a.api('DELETE', '/api/posts/' + p.id).then(function () { el.remove(); }).catch(a.falha);
    } }, 'Apagar post'));
    a.add(el, [h('div', { class: 'post-topo' }, h('button', { class: 'semfundo', onclick: function () { a.perfil(p.dono.id); } }, a.av(p.dono)),
      h('div', {}, h('b', {}, p.dono.nome, p.dono.professor ? h('span', { class: 'etiqueta prof' }, 'PROF') : null, p.formato === 'reel' ? h('span', { class: 'etiqueta', style: 'background:var(--roxo)' }, 'REEL') : null),
        h('div', { class: 'mudo peq' }, a.dataBr(p.criado) + ' ' + a.hora(p.criado)))),
      h('div', { class: 'midia-w' }, midia, coracao, opc.reel && p.tipo === 'video' ? som : null), p.legenda ? h('p', { class: 'legenda' }, p.legenda) : null, rodape]);
    return el;
  }

  // abre um post em janela (grade do perfil, link compartilhado)
  function abrir(p) {
    var a = AE(), fechar;
    var c = a.h('div', { class: 'post-janela' }, cartao(p, {}), a.h('button', { class: 'btn sec', onclick: function () { fechar(); } }, 'Fechar'));
    fechar = a.folha(c);
  }
  function abrirPorId(id) { AE().api('GET', '/api/posts/' + id).then(abrir).catch(AE().falha); }

  // ---------- comentários ----------
  function folhaComentarios(p, aoMudar) {
    var a = AE(), h = a.h, U = a.U;
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
    a.folha(h('div', {}, h('h3', {}, '💬 Comentários'), lista, h('div', { class: 'envio' }, inp, h('button', { class: 'btn', onclick: enviar }, 'Enviar'))));
    a.api('GET', '/api/posts/' + p.id + '/comentarios').then(function (ms) {
      lista.replaceChildren(); total = ms.length;
      if (!ms.length) lista.append(h('p', { class: 'mudo' }, 'Nenhum comentário ainda.'));
      ms.forEach(function (m) { lista.append(linha(m)); });
    }).catch(a.falha);
  }

  // ---------- criar ----------
  // 1) escolhe o tipo  2) a câmera abre na hora  3) legenda e compartilhar
  var FORMATOS = [
    { id: 'foto', t: 'Publicação', ic: 'image', formato: 'post', desc: 'Foto no feed e no seu perfil', cam: { foto: true, video: false, maxLado: 1280, modo: 'foto' } },
    { id: 'reel', t: 'Reel', ic: 'film', formato: 'reel', desc: 'Vídeo curto em pé, até 1 min', cam: { foto: false, video: true, maxS: 60, modo: 'video' } },
    { id: 'story', t: 'Story', ic: 'circle', formato: 'story', desc: 'Some em 24 horas', cam: { foto: true, video: true, maxS: 30, maxLado: 1280, modo: 'foto' } },
    { id: 'video', t: 'Vídeo', ic: 'video', formato: 'post', desc: 'Vídeo no feed, até 1 min 30 s', cam: { foto: false, video: true, maxS: 90, modo: 'video' } }];
  function folhaCriar(inicial) {
    var a = AE(), h = a.h, fechar;
    if (typeof inicial === 'string') { var f0 = FORMATOS.filter(function (f) { return f.id === inicial; })[0]; if (f0) { capturar(f0); return; } }
    fechar = a.folha(h('div', { class: 'criar' }, h('h3', {}, 'Criar'), h('p', { class: 'mudo peq', style: 'margin:0 0 12px' }, 'Escolha o que você quer compartilhar. A câmera abre em seguida.'),
      h('div', { class: 'criar-grade' }, FORMATOS.map(function (f) {
        return h('button', { class: 'criar-op', onclick: function () { fechar(); capturar(f); } }, h('span', { class: 'criar-ic' }, M.ic(f.ic, 26)), h('b', {}, f.t), h('small', { class: 'mudo' }, f.desc));
      }))));
  }
  function capturar(fmt) {
    var a = AE();
    M.camera.abrir(Object.assign({ titulo: fmt.t }, fmt.cam)).then(function (r) { if (r) compor(fmt, r); }).catch(a.falha);
  }
  function compor(fmt, r) {
    var a = AE(), h = a.h, mid = M.midia, fechar, url = URL.createObjectURL(r.blob);
    var previa = h('div', { class: 'previa-np' }, r.tipo === 'video' ? h('video', { src: url, controls: 'controls', playsinline: 'playsinline' }) : h('img', { src: url, alt: 'Prévia' }));
    var legenda = h('textarea', { rows: '2', maxlength: '200', placeholder: 'Escreva uma legenda… (em inglês, para praticar)' });
    var estado = h('p', { class: 'mudo peq', style: 'min-height:18px;margin:6px 0' });
    var publicar = h('button', { class: 'btn' }, 'Compartilhar');
    publicar.addEventListener('click', function () {
      publicar.disabled = true; estado.textContent = 'Enviando…';
      mid.enviar(r.tipo, r.blob).then(function (m) { return a.api('POST', '/api/posts', { midia: m.id, legenda: legenda.value, formato: fmt.formato }); })
        .then(function (p) { URL.revokeObjectURL(url); fechar(); a.aviso(p.estado === 'publicado' ? 'Publicado!' : 'Enviado! O professor aprova antes de aparecer para a turma.'); a.render(); })
        .catch(function (e) { publicar.disabled = false; estado.textContent = e.message; });
    });
    fechar = a.folha(h('div', { class: 'criar' }, h('h3', {}, fmt.t), previa, legenda, estado,
      h('div', { class: 'opcoes-f', style: 'grid-template-columns:1fr 1fr' }, h('button', { class: 'btn sec', onclick: function () { URL.revokeObjectURL(url); fechar(); capturar(fmt); } }, 'Refazer'), publicar),
      h('p', { class: 'mudo peq', style: 'margin:10px 0 0' }, 'O professor aprova antes de aparecer (alunos de confiança publicam direto). Sem nudez, violência, ofensas ou dados pessoais.')));
  }

  // ---------- stories ----------
  function vistos() { try { return JSON.parse(localStorage.getItem('ae_stories') || '{}'); } catch (e) { return {}; } }
  function marcarVisto(id) { var v = vistos(); v[id] = 1; var ks = Object.keys(v); if (ks.length > 300) delete v[ks[0]]; try { localStorage.setItem('ae_stories', JSON.stringify(v)); } catch (e) { /* ok */ } }
  function barraStories() {
    var a = AE(), h = a.h, U = a.U;
    var barra = h('div', { class: 'stories' });
    var meu = h('button', { class: 'story-b', onclick: function () { folhaCriar('story'); } }, h('div', { class: 'anel novo' }, a.av(U), h('span', { class: 'mais' }, M.ic('plus', 12))), h('small', {}, 'Seu story'));
    barra.append(meu);
    a.api('GET', '/api/stories').then(function (gs) {
      var v = vistos();
      gs.forEach(function (g, i) {
        var todos = g.itens.every(function (it) { return v[it.id]; });
        var b = h('button', { class: 'story-b', onclick: function () { visualizar(gs, i); } }, h('div', { class: 'anel' + (todos ? ' visto' : '') }, a.av(g.dono)), h('small', {}, g.dono.id === U.id ? 'Você' : g.dono.nome));
        if (g.dono.id === U.id) { meu.replaceWith(b); b.querySelector('.anel').append(h('span', { class: 'mais', onclick: function (e) { e.stopPropagation(); folhaCriar('story'); } }, '+')); } else barra.append(b);
      });
    }).catch(function () { /* sem stories */ });
    return barra;
  }
  function visualizar(grupos, gi, ii) {
    var a = AE(), h = a.h, U = a.U;
    var g = grupos[gi], idx = ii || 0, timer = null, fim = false;
    var cont = h('div', { class: 'story-v' });
    document.body.append(cont); document.body.style.overflow = 'hidden';
    function fechar() { fim = true; clearTimeout(timer); cont.remove(); document.body.style.overflow = ''; if (!document.querySelector('.licao')) a.render(); }
    function proximo() { if (idx + 1 < g.itens.length) { idx++; mostrar(); } else if (gi + 1 < grupos.length) { cont.remove(); document.body.style.overflow = ''; visualizar(grupos, gi + 1, 0); fim = true; } else fechar(); }
    function anterior() { if (idx > 0) { idx--; mostrar(); } else if (gi > 0) { cont.remove(); document.body.style.overflow = ''; visualizar(grupos, gi - 1, 0); fim = true; } else mostrar(); }
    function mostrar() {
      clearTimeout(timer); if (fim) return;
      var it = g.itens[idx]; marcarVisto(it.id);
      cont.replaceChildren();
      var barras = h('div', { class: 'story-barras' }, g.itens.map(function (_, k) { return h('i', { class: k < idx ? 'f' : (k === idx ? 'a' : '') }); }));
      var midia;
      if (it.tipo === 'video') {
        midia = h('video', { src: '/api/midia/' + it.midia, playsinline: 'playsinline', autoplay: 'autoplay' });
        midia.addEventListener('ended', proximo);
        midia.addEventListener('error', function () { timer = setTimeout(proximo, 800); });
        var pr = midia.play(); if (pr && pr.catch) pr.catch(function () { midia.muted = true; midia.play().catch(function () { /* ok */ }); });
      } else {
        midia = h('img', { src: '/api/midia/' + it.midia, alt: 'story' });
        barras.children[idx].style.animationDuration = '5s';
        timer = setTimeout(proximo, 5000);
      }
      var acoes = [];
      if (g.dono.id === U.id || U.professor) acoes.push(h('button', { class: 'story-x', onclick: function () { if (confirm('Apagar este story?')) a.api('DELETE', '/api/posts/' + it.id).then(function () { fechar(); }).catch(a.falha); } }, '🗑️'));
      else acoes.push(h('button', { class: 'story-x', onclick: function () { clearTimeout(timer); window.Mods.mod.folhaDenuncia('post', it.id); } }, '🚩'));
      a.add(cont, [h('div', { class: 'story-topo' }, barras, h('div', { class: 'story-quem' }, a.av(g.dono), h('b', {}, g.dono.nome), h('small', {}, a.hora(it.criado)), h('span', { style: 'flex:1' }), acoes, h('button', { class: 'story-x', 'aria-label': 'Fechar', onclick: fechar }, '✕'))),
        h('div', { class: 'story-midia' }, midia), it.legenda ? h('div', { class: 'story-leg' }, it.legenda) : null,
        h('button', { class: 'story-nav esq', 'aria-label': 'Anterior', onclick: anterior }), h('button', { class: 'story-nav dir', 'aria-label': 'Próximo', onclick: proximo })]);
    }
    mostrar();
  }

  M.posts = { tela: tela, cartao: cartao, abrir: abrir, abrirPorId: abrirPorId, criar: folhaCriar, compartilhar: compartilhar, stories: visualizar };
})();
