// Chat profissional (sala da turma e conversas): bolhas agrupadas, data, player de áudio com onda,
// gravação segurando o botão (deslize para cancelar / para cima para travar), foto pela câmera, menu de ações.
(function () {
  'use strict';
  var M = window.Mods = window.Mods || {};
  function AE() { return window.AE; }
  var ic = function (n, t, c) { return M.ic(n, t, c); };

  function diaRotulo(ms) {
    var d = new Date(ms), h = new Date(); h.setHours(0, 0, 0, 0);
    var dif = Math.round((h - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
    if (dif === 0) return 'Hoje'; if (dif === 1) return 'Ontem';
    return AE().dataBr(ms);
  }
  function mm(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  var CORES_NOME = ['#35a7ff', '#a56bff', '#2dd4bf', '#ffd45a', '#ff8a5c', '#ff5575', '#7bd88f', '#f08fd0'];
  function corNome(id) { return CORES_NOME[Math.abs(id) % CORES_NOME.length]; }

  // ---------- player de áudio ----------
  var tocando = null; // só um áudio por vez
  function playerAudio(src, seed, minha) {
    var a = AE(), h = a.h;
    var au = new Audio(); au.preload = 'metadata'; au.src = src;
    var barras = [], N = 30, r = seed * 9301 + 49297;
    for (var i = 0; i < N; i++) { r = (r * 9301 + 49297) % 233280; barras.push(h('i', { style: 'height:' + (22 + Math.round(r / 233280 * 78)) + '%' })); }
    var onda = h('div', { class: 'onda' }, barras);
    var botao = h('button', { class: 'aud-play', 'aria-label': 'Tocar áudio' }, ic('play', 20, true));
    var tempo = h('span', { class: 'aud-t' }, '0:00');
    var vel = h('button', { class: 'aud-v', 'aria-label': 'Velocidade' }, '1x');
    var erro = h('span', { class: 'aud-erro', hidden: 'hidden' }, 'Áudio expirado (apagado após 30 dias).');
    var dur = 0;
    function pintar() {
      var f = dur ? au.currentTime / dur : 0;
      barras.forEach(function (b, k) { b.className = k / N < f ? 'on' : ''; });
      tempo.textContent = au.paused && !au.currentTime ? mm(dur) : mm(au.currentTime);
    }
    au.addEventListener('loadedmetadata', function () {
      if (au.duration === Infinity || isNaN(au.duration)) { // webm gravado no navegador não traz a duração
        au.currentTime = 1e101;
        au.addEventListener('timeupdate', function f() { au.removeEventListener('timeupdate', f); dur = au.duration; au.currentTime = 0; pintar(); });
      } else { dur = au.duration; pintar(); }
    });
    au.addEventListener('timeupdate', function () { if (isFinite(au.duration) && au.duration > 0) dur = au.duration; pintar(); });
    au.addEventListener('ended', function () { au.currentTime = 0; botao.replaceChildren(ic('play', 20, true)); pintar(); });
    au.addEventListener('pause', function () { botao.replaceChildren(ic('play', 20, true)); });
    au.addEventListener('play', function () { botao.replaceChildren(ic('pause', 20, true)); });
    au.addEventListener('error', function () { erro.hidden = false; onda.style.display = 'none'; botao.disabled = true; tempo.style.display = 'none'; vel.style.display = 'none'; });
    botao.addEventListener('click', function () {
      if (au.paused) { if (tocando && tocando !== au) tocando.pause(); tocando = au; var p = au.play(); if (p && p.catch) p.catch(function () { /* ok */ }); } else au.pause();
    });
    onda.addEventListener('click', function (e) { if (!dur) return; var rc = onda.getBoundingClientRect(); au.currentTime = Math.max(0, Math.min(1, (e.clientX - rc.left) / rc.width)) * dur; pintar(); });
    vel.addEventListener('click', function () { var v = au.playbackRate === 1 ? 1.5 : (au.playbackRate === 1.5 ? 2 : 1); au.playbackRate = v; vel.textContent = (v === 1.5 ? '1.5' : v) + 'x'; });
    var el = h('div', { class: 'aud' }, botao, h('div', { class: 'aud-meio' }, onda, tempo), vel, erro);
    el.parar = function () { au.pause(); };
    return el;
  }

  function visualizar(src) {
    var a = AE(), h = a.h;
    var ov = h('div', { class: 'foto-ov', onclick: function (e) { if (e.target === ov) ov.remove(); } }, h('img', { src: src, alt: 'Foto' }),
      h('button', { class: 'foto-ov-x', 'aria-label': 'Fechar', onclick: function () { ov.remove(); } }, ic('close', 24)));
    document.body.append(ov);
  }

  // ---------- chat ----------
  // opc: { urlGet, urlPost, grupo, cab: { titulo, sub, pessoa, voltar, acoes: [...] } }
  function montar(main, opc) {
    var a = AE(), h = a.h, U = a.U, mid = M.midia;
    var msgs = h('div', { class: 'cht-msgs', role: 'log', 'aria-live': 'polite' }, h('div', { class: 'cht-vazio' }, 'Carregando…'));
    var raiz = h('div', { class: 'cht' + (opc.grupo ? ' grupo' : ' dm') });
    var vistos = {}, ultimo = 0, vazio = true, ultimaBolha = null, ultimoDia = '', novas = 0, limpezas = [], pendentes = 0;

    // cabeçalho
    if (opc.cab) {
      var c = opc.cab;
      raiz.append(h('div', { class: 'cht-cab' },
        c.voltar ? h('button', { class: 'cht-ib', 'aria-label': 'Voltar', onclick: c.voltar }, ic('back', 24)) : null,
        c.pessoa ? h('button', { class: 'semfundo cht-pessoa', onclick: function () { a.perfil(c.pessoa.id); } }, a.av(c.pessoa), h('span', { class: 'cht-tit' }, h('b', {}, c.titulo), c.sub ? h('small', {}, c.sub) : null))
          : h('div', { class: 'cht-pessoa' }, h('span', { class: 'cht-grupo' }, ic('users', 22)), h('span', { class: 'cht-tit' }, h('b', {}, c.titulo), c.sub ? h('small', {}, c.sub) : null)),
        h('span', { style: 'flex:1' }), c.acoes || null));
    }
    var fab = h('button', { class: 'cht-fab', hidden: 'hidden', 'aria-label': 'Ir para as mensagens mais novas', onclick: function () { rolar(true); } }, ic('chevup', 20));
    fab.style.transform = 'rotate(180deg)';
    raiz.append(h('div', { class: 'cht-corpo' }, msgs, fab));

    function perto() { return msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 120; }
    function rolar(forcar) { if (forcar || perto()) { msgs.scrollTop = msgs.scrollHeight; novas = 0; fab.hidden = true; } }
    msgs.addEventListener('scroll', function () { if (perto()) { fab.hidden = true; novas = 0; } });

    // menu de ações da mensagem
    function acoes(m, minha, el) {
      var fechar, itens = [];
      if (m.tipo === 'texto' || !m.tipo) itens.push(['copy', 'Copiar', function () { try { navigator.clipboard.writeText(m.texto); a.aviso('Copiado'); } catch (e) { a.aviso('Não foi possível copiar', true); } }]);
      if (minha || U.professor) itens.push(['trash', 'Apagar', function () { a.api('DELETE', '/api/mensagem/' + m.id).then(function () { el.remove(); }).catch(a.falha); }, true]);
      else itens.push(['flag', 'Denunciar', function () { M.mod.folhaDenuncia('msg', m.id, function () { el.remove(); }); }, true]);
      fechar = a.folha(h('div', { class: 'menu-acoes' }, h('div', { class: 'ma-pre' }, m.tipo === 'audio' ? 'Mensagem de voz' : (m.tipo === 'foto' ? 'Foto' : m.texto.slice(0, 80))),
        itens.map(function (it) { return h('button', { class: 'ma-item' + (it[3] ? ' perigo' : ''), onclick: function () { fechar(); it[2](); } }, ic(it[0], 20), it[1]); }),
        h('button', { class: 'ma-item sec', onclick: function () { fechar(); } }, 'Cancelar')));
    }

    function bolha(m, agrupar) {
      var minha = m.de.id === U.id, hora = a.hora(m.criado);
      var corpo;
      if (m.tipo === 'audio') corpo = playerAudio('/api/midia/' + m.midia, m.id || 1, minha);
      else if (m.tipo === 'foto') {
        var im = h('img', { src: '/api/midia/' + m.midia, alt: 'Foto', loading: 'lazy' });
        var env = h('div', { class: 'cht-foto' + (minha ? '' : ' borrada') }, im, minha ? null : h('span', { class: 'ver' }, ic('image', 22), 'Toque para ver'));
        env.addEventListener('click', function () { if (env.classList.contains('borrada')) env.classList.remove('borrada'); else visualizar(im.src); });
        im.addEventListener('error', function () { env.replaceChildren(h('div', { class: 'mudo peq', style: 'padding:14px' }, 'Foto removida.')); });
        corpo = env;
      } else corpo = h('div', { class: 'cht-txt' }, m.texto);
      var el = h('div', { class: 'cht-b' + (minha ? ' minha' : '') + (agrupar ? ' junto' : '') + ' t-' + (m.tipo || 'texto'), 'data-de': String(m.de.id) });
      var quem = (!minha && opc.grupo && !agrupar) ? h('div', { class: 'cht-quem', style: 'color:' + corNome(m.de.id) }, m.de.nome, m.de.pro ? h('span', { class: 'etiqueta' }, 'PRO') : null, m.de.professor ? h('span', { class: 'etiqueta prof' }, 'PROF') : null) : null;
      var bal = h('div', { class: 'cht-bal' }, quem, corpo, h('span', { class: 'cht-h' }, hora),
        h('button', { class: 'cht-mais', 'aria-label': 'Opções da mensagem', onclick: function () { acoes(m, minha, el); } }, ic('chevup', 16)));
      bal.querySelector('.cht-mais svg').style.transform = 'rotate(180deg)';
      if (opc.grupo && !minha) {
        el.append(agrupar ? h('span', { class: 'cht-av vazio' }) : h('button', { class: 'semfundo cht-av', onclick: function () { a.perfil(m.de.id); }, 'aria-label': m.de.nome }, a.av(m.de)));
      }
      el.append(bal);
      return el;
    }

    function receber(lista, rolarFim) {
      if (!lista.length) { if (vazio) msgs.replaceChildren(h('div', { class: 'cht-vazio' }, h('div', { class: 'cht-vazio-ic' }, ic('comment', 30)), h('b', {}, 'Nenhuma mensagem ainda'), h('span', {}, opc.grupo ? 'Diga "Hello!" para a turma.' : 'Diga "Hello!" e comece a conversa.'))); return; }
      if (vazio) { msgs.replaceChildren(); vazio = false; }
      var perto0 = perto();
      lista.forEach(function (m) {
        if (m.id > ultimo) ultimo = m.id;
        if (vistos[m.id]) return; vistos[m.id] = 1;
        var d = diaRotulo(m.criado);
        if (d !== ultimoDia) { msgs.append(h('div', { class: 'cht-dia' }, h('span', {}, d))); ultimoDia = d; ultimaBolha = null; }
        var agrupar = !!ultimaBolha && ultimaBolha.de === m.de.id && m.criado - ultimaBolha.t < 5 * 60000;
        msgs.append(bolha(m, agrupar)); ultimaBolha = { de: m.de.id, t: m.criado };
        if (m.de.id !== U.id && !perto0 && !rolarFim) novas++;
      });
      if (rolarFim || perto0) rolar(true); else { fab.hidden = false; }
    }

    // ---------- barra de envio ----------
    var campo = h('textarea', { class: 'cht-campo', rows: '1', maxlength: '300', placeholder: 'Mensagem', 'aria-label': 'Escreva sua mensagem', enterkeyhint: 'send' });
    var acao = h('button', { class: 'cht-acao', 'aria-label': 'Gravar áudio' }, ic('mic', 22));
    var arqGal = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    var btnAnexo = h('button', { class: 'cht-ib', 'aria-label': 'Enviar foto', onclick: menuFoto }, ic('camera', 24));
    var pill = h('div', { class: 'cht-pill' }, campo);
    var barraRec = h('div', { class: 'cht-rec', hidden: 'hidden' });
    var comp = h('div', { class: 'cht-comp' }, h('div', { class: 'cht-linha' }, pill, btnAnexo, acao), barraRec, arqGal);
    raiz.append(comp);

    function atualizarAcao() {
      var tem = campo.value.trim().length > 0;
      acao.classList.toggle('enviar', tem); acao.setAttribute('aria-label', tem ? 'Enviar mensagem' : 'Gravar áudio');
      acao.replaceChildren(ic(tem ? 'send' : 'mic', 22, tem));
      btnAnexo.style.display = tem ? 'none' : '';
    }
    function crescer() { campo.style.height = 'auto'; campo.style.height = Math.min(campo.scrollHeight, 110) + 'px'; }
    campo.addEventListener('input', function () { atualizarAcao(); crescer(); });
    var teclado = !window.matchMedia || window.matchMedia('(pointer: fine)').matches;
    campo.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && teclado) { e.preventDefault(); enviarTexto(); } });
    function enviarTexto() {
      var t = campo.value.trim(); if (!t) return;
      campo.value = ''; crescer(); atualizarAcao();
      a.api('POST', opc.urlPost, { texto: t }).then(function (m) { receber([m], true); }).catch(function (e) { campo.value = t; atualizarAcao(); crescer(); a.falha(e); });
    }
    function enviarMidia(tipoUp, blob, tipoMsg) {
      pendentes++; var fantasma = h('div', { class: 'cht-b minha pend' }, h('div', { class: 'cht-bal' }, h('div', { class: 'cht-txt' }, tipoMsg === 'audio' ? 'Enviando áudio…' : 'Enviando foto…')));
      if (vazio) { msgs.replaceChildren(); vazio = false; }
      msgs.append(fantasma); rolar(true);
      return mid.enviar(tipoUp, blob).then(function (r) { return a.api('POST', opc.urlPost, { tipo: tipoMsg, midia: r.id }); })
        .then(function (m) { fantasma.remove(); receber([m], true); }).catch(function (e) { fantasma.remove(); a.falha(e); }).then(function () { pendentes--; });
    }

    // foto: câmera do app ou galeria
    function menuFoto() {
      var fechar = a.folha(h('div', { class: 'menu-acoes' }, h('div', { class: 'ma-pre' }, 'Enviar foto'),
        h('button', { class: 'ma-item', onclick: function () { fechar(); tirar(); } }, ic('camera', 20), 'Câmera'),
        h('button', { class: 'ma-item', onclick: function () { fechar(); arqGal.click(); } }, ic('image', 20), 'Galeria'),
        h('button', { class: 'ma-item sec', onclick: function () { fechar(); } }, 'Cancelar')));
    }
    function reduzir(b) { return b.size <= 880 * 1024 ? Promise.resolve(b) : mid.processarImagem(b, 900, false, 0.7); }
    function tirar() { M.camera.abrir({ foto: true, video: false, maxLado: 1024, titulo: 'Enviar foto' }).then(function (r) { if (r) return reduzir(r.blob).then(function (b) { return enviarMidia('chatfoto', b, 'foto'); }); }).catch(a.falha); }
    arqGal.addEventListener('change', function () {
      var f = arqGal.files && arqGal.files[0]; arqGal.value = ''; if (!f) return;
      mid.processarImagem(f, 1024, false, 0.78).then(reduzir).then(function (b) { return enviarMidia('chatfoto', b, 'foto'); }).catch(a.falha);
    });

    // ---------- gravação de áudio (segurar) ----------
    var rec = null, fluxo = null, partes = [], t0 = 0, tmrRec = null, estado = 'ocioso', soltou = false, travado = false, cancelado = false, x0 = 0, y0 = 0, tipoAud = '';
    function pararFluxo() { if (fluxo) fluxo.getTracks().forEach(function (t) { t.stop(); }); fluxo = null; clearInterval(tmrRec); }
    function mostrarRec() {
      var tempo = h('span', { class: 'rec-t' }, '0:00'), dica = h('span', { class: 'rec-dica' }, ic('chevleft', 16), 'Deslize para cancelar'), cima = h('span', { class: 'rec-cima' }, ic('lock', 16), ic('chevup', 14));
      barraRec.className = 'cht-rec'; barraRec.hidden = false; barraRec.replaceChildren(h('span', { class: 'rec-ponto' }), tempo, dica, cima);
      comp.classList.add('gravando');
      tmrRec = setInterval(function () { var s = (Date.now() - t0) / 1000; tempo.textContent = mm(s); if (s >= 120) finalizar(true); }, 200);
      barraRec._t = tempo; barraRec._dica = dica; barraRec._cima = cima;
    }
    function travar() {
      travado = true; barraRec.classList.add('trava');
      var tempo = barraRec._t;
      barraRec.replaceChildren(h('span', { class: 'rec-ponto' }), tempo, h('span', { style: 'flex:1' }),
        h('button', { class: 'cht-ib perigo', 'aria-label': 'Descartar gravação', onclick: function () { finalizar(false); } }, ic('trash', 22)));
      acao.classList.add('enviar'); acao.replaceChildren(ic('send', 22, true)); acao.setAttribute('aria-label', 'Enviar áudio');
    }
    function limparRec() { estado = 'ocioso'; travado = false; barraRec.hidden = true; barraRec.replaceChildren(); comp.classList.remove('gravando'); acao.classList.remove('gravando'); atualizarAcao(); }
    function finalizar(enviar) {
      if (estado !== 'gravando') { return; }
      cancelado = !enviar; estado = 'parando';
      if (rec && rec.state !== 'inactive') rec.stop(); else { pararFluxo(); limparRec(); }
    }
    function comecar() {
      if (!navigator.mediaDevices || !window.MediaRecorder) { a.aviso('Seu navegador não permite gravar áudio.', true); return; }
      estado = 'preparando'; soltou = false; cancelado = false; travado = false;
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (s) {
        if (estado !== 'preparando') { s.getTracks().forEach(function (t) { t.stop(); }); return; }
        fluxo = s; partes = [];
        if (soltou) { // soltou durante o pedido de permissão
          pararFluxo(); estado = 'ocioso'; a.aviso('Microfone liberado. Agora segure o botão para gravar.'); return;
        }
        var tipos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
        tipoAud = tipos.filter(function (t) { return MediaRecorder.isTypeSupported(t); })[0] || '';
        rec = tipoAud ? new MediaRecorder(s, { mimeType: tipoAud, audioBitsPerSecond: 48000 }) : new MediaRecorder(s);
        rec.ondataavailable = function (e) { if (e.data && e.data.size) partes.push(e.data); };
        rec.onstop = function () {
          var dur = (Date.now() - t0) / 1000, blob = new Blob(partes, { type: (rec.mimeType || tipoAud || 'audio/webm').split(';')[0] });
          pararFluxo(); var enviar = !cancelado; limparRec();
          if (!enviar) return;
          if (dur < 1) { a.aviso('Segure o botão e fale; solte para enviar.'); return; }
          enviarMidia('audio', blob, 'audio');
        };
        rec.start(); t0 = Date.now(); estado = 'gravando'; acao.classList.add('gravando'); mostrarRec();
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) { /* ok */ } }
      }).catch(function () { estado = 'ocioso'; a.aviso('Permita o uso do microfone para gravar áudios.', true); });
    }
    acao.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    acao.addEventListener('pointerdown', function (e) {
      if (campo.value.trim()) return; // modo "enviar": o clique cuida
      if (travado && estado === 'gravando') return;
      e.preventDefault(); try { acao.setPointerCapture(e.pointerId); } catch (x) { /* ok */ }
      x0 = e.clientX; y0 = e.clientY; if (estado === 'ocioso') comecar();
    });
    acao.addEventListener('pointermove', function (e) {
      if (estado !== 'gravando' || travado) return;
      var dx = e.clientX - x0, dy = e.clientY - y0;
      if (barraRec._dica) barraRec._dica.style.opacity = String(Math.max(0.2, 1 + dx / 160));
      if (dx < -90) { finalizar(false); }
      else if (dy < -70) { travar(); }
    });
    function soltar() {
      if (estado === 'preparando') { soltou = true; return; }
      if (estado === 'gravando' && !travado) finalizar(true);
    }
    acao.addEventListener('pointerup', soltar);
    acao.addEventListener('pointercancel', function () { if (estado === 'gravando' && !travado) finalizar(false); else if (estado === 'preparando') soltou = true; });
    acao.addEventListener('click', function () {
      if (campo.value.trim()) { enviarTexto(); return; }
      if (travado && estado === 'gravando') finalizar(true);
    });
    limpezas.push(function () { if (estado === 'gravando') { cancelado = true; try { rec.stop(); } catch (e) { /* ok */ } } pararFluxo(); if (tocando) { try { tocando.pause(); } catch (e) { /* ok */ } } });

    // ---------- carga e atualização ----------
    main.append(raiz); atualizarAcao();
    a.api('GET', opc.urlGet).then(function (ms) { receber(ms, true); }).catch(function (e) { msgs.replaceChildren(h('div', { class: 'cht-vazio' }, e.status === 0 ? 'Conecte-se à internet para conversar.' : e.message)); });
    var timer = setInterval(function () {
      if (document.hidden) return;
      a.api('GET', opc.urlGet + '?depois=' + ultimo).then(function (ms) {
        var n = ms.filter(function (m) { return m.id > ultimo; });
        if (n.length) receber(n, false);
      }).catch(function () { /* tenta de novo */ });
    }, 4000);
    limpezas.push(function () { clearInterval(timer); });
    return function limpar() { limpezas.forEach(function (f) { f(); }); };
  }

  M.chat = { montar: montar, playerAudio: playerAudio };
})();
