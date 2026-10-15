// Live: transmissão ao vivo com chat. O vídeo passa pelo LiveKit Cloud; o servidor do app só emite as permissões.
(function () {
  'use strict';
  var M = window.Mods = window.Mods || {};
  function AE() { return window.AE; }
  var LIB = 'https://cdnjs.cloudflare.com/ajax/libs/livekit-client/2.5.7/livekit-client.umd.min.js';
  var atual = null;

  function carregarLib() {
    if (window.LivekitClient) return Promise.resolve(window.LivekitClient);
    return new Promise(function (ok, falha) {
      var s = document.createElement('script'); s.src = LIB; s.async = true;
      s.onload = function () { window.LivekitClient ? ok(window.LivekitClient) : falha(new Error('Não foi possível carregar o vídeo ao vivo.')); };
      s.onerror = function () { falha(new Error('Não foi possível carregar o vídeo ao vivo. Verifique a internet.')); };
      document.head.append(s);
    });
  }

  // faixa no topo da aba Posts: lives no ar e botão para iniciar
  function faixa() {
    var a = AE(), h = a.h, caixa = h('div', { class: 'live-faixa' });
    a.api('GET', '/api/live').then(function (r) {
      if (!r.ativo) return;
      if (r.podeIniciar && !r.lives.some(function (l) { return l.eu; })) caixa.append(h('button', { class: 'btn mini', style: 'width:auto;padding:0 14px', onclick: iniciar }, 'Iniciar live'));
      r.lives.forEach(function (l) {
        caixa.append(h('div', { class: 'live-card' },
          h('button', { class: 'semfundo', onclick: function () { entrar(l.id); } }, a.av(l.dono)),
          h('div', { style: 'flex:1;min-width:0' }, h('b', {}, '🔴 ' + l.dono.nome), h('div', { class: 'mudo peq' }, l.titulo + ' · 👁 ' + l.espectadores)),
          h('button', { class: 'btn mini ' + (l.eu ? 'sec' : 'coral'), style: 'width:auto;padding:0 14px', onclick: function () { l.eu ? a.aviso('Você já está transmitindo. Reabra a live pelo aviso.', true) : entrar(l.id); } }, l.eu ? 'No ar' : 'Assistir'),
          a.U.professor && !l.eu ? h('button', { class: 'btn sec mini', style: 'width:auto', onclick: function () { if (confirm('Encerrar a live de ' + l.dono.nome + '?')) a.api('POST', '/api/live/' + l.id + '/encerrar').then(function () { a.aviso('Live encerrada.'); a.render(); }).catch(a.falha); } }, '⏹') : null));
      });
    }).catch(function () { /* sem live */ });
    return caixa;
  }

  function iniciar() {
    var a = AE(), h = a.h, fechar;
    var titulo = h('input', { type: 'text', maxlength: '60', placeholder: 'Título (ex.: Aula de conversação)' });
    var erro = h('div', { class: 'erro' });
    fechar = a.folha(h('div', {}, h('h3', {}, 'Iniciar live'), h('p', { class: 'mudo peq', style: 'margin-top:0' }, 'Seus seguidores serão avisados. As regras da comunidade valem na live: qualquer pessoa pode denunciar e o professor pode encerrar.'),
      titulo, erro, h('div', { class: 'espaco' }), h('button', { class: 'btn coral', onclick: function () {
        erro.textContent = '';
        carregarLib().then(function () { return a.api('POST', '/api/live', { titulo: titulo.value }); })
          .then(function (r) { fechar(); abrir('host', r); }).catch(function (e) { erro.textContent = e.message; });
      } }, 'Ir ao vivo')));
  }
  function entrar(id) {
    var a = AE();
    if (atual) return;
    carregarLib().then(function () { return a.api('POST', '/api/live/' + id + '/entrar'); }).then(function (r) { abrir('viewer', { id: id, url: r.url, token: r.token, live: r.live }); }).catch(a.falha);
  }

  function abrir(modo, info) {
    var a = AE(), h = a.h, L = window.LivekitClient, U = a.U, host = modo === 'host';
    var id = info.id, titulo = info.titulo || (info.live && info.live.titulo) || 'Live', dono = host ? U : info.live.dono;
    var video = h('video', { class: 'live-video', playsinline: 'playsinline', autoplay: 'autoplay' });
    var audios = h('div', { style: 'display:none' });
    var espera = h('div', { class: 'live-espera' }, host ? 'Ligando a câmera…' : 'Aguardando o vídeo…');
    var cont = h('span', { class: 'live-n' }, M.ic('users', 14), ' 0'), tempo = h('span', { class: 'live-t' }, '00:00');
    var lista = h('div', { class: 'live-chat' });
    var inp = h('input', { type: 'text', maxlength: '150', placeholder: 'Comente…', autocomplete: 'off' });
    var room = null, timers = [], ultimo = 0, t0 = Date.now(), encerrada = false;
    atual = { id: id };
    var el = h('div', { class: 'live-ov' }, video, audios, espera);
    function limpar() { timers.forEach(clearInterval); try { if (room) room.disconnect(); } catch (e) { /* ok */ } el.remove(); document.body.style.overflow = ''; atual = null; }
    function sair(texto) { if (encerrada) return; encerrada = true; limpar(); if (texto) a.aviso(texto); a.render(); }
    function encerrar() {
      if (!confirm('Encerrar a live para todos?')) return;
      a.api('POST', '/api/live/' + id + '/encerrar').then(function (r) { encerrada = true; limpar(); a.aviso('Live encerrada: ' + r.duracaoMin + ' min, pico de ' + r.pico + ' espectadores.'); a.render(); }).catch(a.falha);
    }
    function linha(m) {
      var pode = host || U.professor;
      return h('div', { class: 'lc' }, h('b', {}, m.de.nome + ' '), h('span', {}, m.texto),
        pode && m.de.id !== U.id ? h('button', { class: 'lc-x', 'aria-label': 'Remover da live', onclick: function () { a.api('POST', '/api/live/' + id + '/expulsar', { id: m.de.id }).then(function () { a.aviso(m.de.nome + ' removido da live.'); }).catch(a.falha); } }, '⛔') : null,
        pode ? h('button', { class: 'lc-x', 'aria-label': 'Apagar', onclick: function (e) { var b = e.currentTarget; a.api('DELETE', '/api/live/chat/' + m.id).then(function () { b.parentNode.remove(); }).catch(a.falha); } }, M.ic('trash', 14)) : null);
    }
    function enviar() {
      var t = inp.value.trim(); if (!t) return; inp.value = '';
      a.api('POST', '/api/live/' + id + '/chat', { texto: t }).then(function (m) { ultimo = Math.max(ultimo, m.id); lista.append(linha(m)); lista.scrollTop = lista.scrollHeight; }).catch(function (e) { inp.value = t; a.falha(e); });
    }
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') enviar(); });
    var mic = h('button', { class: 'live-b', 'aria-label': 'Microfone', onclick: function () { if (!room) return; var on = !room.localParticipant.isMicrophoneEnabled; room.localParticipant.setMicrophoneEnabled(on); mic.classList.toggle('off', !on); } }, M.ic('mic', 20));
    var cam = h('button', { class: 'live-b', 'aria-label': 'Câmera', onclick: function () { if (!room) return; var on = !room.localParticipant.isCameraEnabled; room.localParticipant.setCameraEnabled(on); cam.classList.toggle('off', !on); } }, M.ic('camera', 20));
    var girar = h('button', { class: 'live-b', 'aria-label': 'Virar câmera', onclick: function () {
      try { var pub = room.localParticipant.getTrackPublication(L.Track.Source.Camera); var f = pub.track.mediaStreamTrack.getSettings().facingMode; pub.track.restartTrack({ facingMode: f === 'environment' ? 'user' : 'environment' }); } catch (e) { a.aviso('Não foi possível virar a câmera.', true); }
    } }, M.ic('flip', 20));
    // reações flutuantes, mini-jogos e desafios
    var flut = h('div', { class: 'live-flut' }), cartaoJogo = h('div', { class: 'jg', hidden: 'hidden' });
    var jogoAtual = null, seqReac = 0, bandejaAberta = false;
    var EMO = { coracao: '❤️', palmas: '👏', fogo: '🔥', riso: '😂', uau: '😮' };
    function flutuar(tipo) {
      var e = h('span', { class: 'flut' }, EMO[tipo] || '❤️'); e.style.setProperty('--dx', (Math.random() * 70 - 35) + 'px'); e.style.left = (8 + Math.random() * 40) + 'px';
      flut.append(e); setTimeout(function () { e.remove(); }, 2600);
    }
    var bandeja = h('div', { class: 'live-bandeja', hidden: 'hidden' }, Object.keys(EMO).map(function (k) {
      return h('button', { 'aria-label': 'Enviar reação ' + k, onclick: function () { flutuar(k); a.api('POST', '/api/live/' + id + '/reacao', { tipo: k }).catch(function () { /* ok */ }); } }, EMO[k]);
    }));
    var btnReagir = h('button', { class: 'live-b rosa', 'aria-label': 'Reagir', onclick: function () { bandeja.hidden = !bandeja.hidden; } }, M.ic('heart', 22, true));
    var btnJogo = h('button', { class: 'live-b', 'aria-label': host ? 'Criar mini-jogo' : 'Mini-jogos', onclick: function () { host ? lancador() : (jogoAtual ? cartaoJogo.scrollIntoView() : a.aviso('Nenhum jogo no ar agora. Quando o anfitrião lançar um, ele aparece aqui.')); } }, M.ic('game', 22));
    var btnDesafios = h('button', { class: 'live-b', 'aria-label': 'Desafios da live', onclick: painelDesafios }, M.ic('target', 22));
    function painelDesafios() {
      var fechar, corpo = h('div', {}, h('p', { class: 'mudo' }, 'Carregando…'));
      fechar = a.folha(h('div', {}, h('h3', {}, 'Desafios da live'), h('p', { class: 'mudo peq', style: 'margin-top:0' }, 'Só aparecem quando há uma live no dia. Cada um dá moedas.'), corpo));
      a.api('GET', '/api/desafios').then(function (ds) {
        corpo.replaceChildren();
        var ls = ds.filter(function (d) { return d.tipo === 'live'; });
        if (!ls.length) corpo.append(h('p', { class: 'mudo' }, 'Nenhum desafio de live agora.'));
        ls.forEach(function (d) {
          var pronto = d.progresso >= d.meta;
          corpo.append(h('div', { class: 'desafio' + (d.resgatado ? ' feito' : '') }, h('div', { style: 'flex:1;min-width:0' }, h('b', {}, d.titulo),
            h('div', { class: 'barra', style: 'margin:6px 0 2px' }, h('i', { style: 'width:' + Math.round(d.progresso / d.meta * 100) + '%' })),
            h('small', { class: 'mudo' }, d.progresso + '/' + d.meta + ' ' + d.unidade + ' · +' + d.moedas + ' moedas')),
            d.resgatado ? h('span', { class: 'mudo peq' }, 'Resgatado') : h('button', { class: 'btn mini ' + (pronto ? 'ouro' : 'sec'), disabled: !pronto, onclick: function () {
              a.api('POST', '/api/desafios/resgatar', { chave: d.chave }).then(function (u) { a.aplicar(u); a.aviso('+' + d.moedas + ' moedas!'); fechar(); }).catch(a.falha);
            } }, pronto ? 'Resgatar' : 'Em andamento')));
        });
      }).catch(a.falha);
    }

    // --- mini-jogos: o anfitrião lança, a turma responde
    function bancoPalavras() { var t = []; (window.CURSO || []).forEach(function (c) { c.lessons.forEach(function (l) { l.words.forEach(function (w) { if (w[1].indexOf('(') < 0 && w[0].length > 2) t.push(w); }); }); }); return t; }
    function sortear(arr, n) { var c = arr.slice(), r = []; while (c.length && r.length < n) r.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]); return r; }
    function quizVocab() {
      var banco = bancoPalavras(); if (banco.length < 8) return null;
      var alvo = sortear(banco, 1)[0], outros = sortear(banco.filter(function (w) { return w[1] !== alvo[1]; }), 3);
      var ops = sortear([alvo].concat(outros), 4);
      return { tipo: 'quiz', pergunta: 'O que significa “' + alvo[0] + '”?', opcoes: ops.map(function (w) { return w[1]; }), correta: ops.indexOf(alvo) };
    }
    function lancador() {
      var fechar, modo = 'vocab', seg = 20;
      var corpo = h('div');
      var pergunta = h('input', { type: 'text', maxlength: '120', placeholder: 'Pergunta' });
      var ops = [0, 1, 2, 3].map(function (i) { return h('input', { type: 'text', maxlength: '40', placeholder: 'Opção ' + (i + 1) + (i > 1 ? ' (opcional)' : '') }); });
      var certa = 0;
      var radios = [0, 1, 2, 3].map(function (i) { return h('button', { type: 'button', class: 'rd' + (i === 0 ? ' sel' : ''), 'aria-label': 'Marcar opção ' + (i + 1) + ' como correta', onclick: function () { certa = i; radios.forEach(function (r, k) { r.classList.toggle('sel', k === i); }); } }, M.ic('check', 16)); });
      var previa = h('div', { class: 'jg-previa' });
      var pronto = null;
      function pintar() {
        corpo.replaceChildren();
        tabs.replaceChildren(['vocab', 'quiz', 'enquete'].map(function (k) { return h('button', { class: modo === k ? 'ativo' : '', onclick: function () { modo = k; pintar(); } }, { vocab: 'Vocabulário', quiz: 'Quiz próprio', enquete: 'Enquete' }[k]); }));
        if (modo === 'vocab') {
          pronto = quizVocab();
          previa.replaceChildren(pronto ? h('div', {}, h('b', {}, pronto.pergunta), pronto.opcoes.map(function (o, i) { return h('div', { class: 'jg-pop' + (i === pronto.correta ? ' c' : '') }, o); })) : h('p', { class: 'mudo' }, 'Sem palavras suficientes.'));
          corpo.append(previa, h('button', { class: 'btn sec', onclick: pintar }, 'Outra pergunta'));
        } else {
          corpo.append(pergunta, h('div', { class: 'espaco' }), ops.map(function (o, i) { return h('div', { class: 'jg-lin' }, o, modo === 'quiz' ? radios[i] : null); }),
            modo === 'quiz' ? h('p', { class: 'mudo peq' }, 'Marque a opção certa com o botão ao lado. Quem acertar ganha 2 moedas (até 10 por live).') : h('p', { class: 'mudo peq' }, 'Enquete: todos votam e veem o resultado, sem resposta certa.'));
        }
      }
      var tabs = h('div', { class: 'seg tres' });
      var tempo = h('select', {}, [[15, '15 s'], [20, '20 s'], [30, '30 s'], [45, '45 s'], [60, '60 s']].map(function (x) { return h('option', { value: x[0], selected: x[0] === 20 ? 'selected' : false }, x[1]); }));
      var erro = h('div', { class: 'erro' });
      fechar = a.folha(h('div', { class: 'criar' }, h('h3', {}, 'Mini-jogo da live'), tabs, corpo, h('div', { class: 'espaco' }), h('label', { class: 'mudo peq' }, 'Tempo para responder'), tempo, erro,
        h('button', { class: 'btn', onclick: function () {
          var dados;
          if (modo === 'vocab') { if (!pronto) return; dados = pronto; }
          else { dados = { tipo: modo === 'quiz' ? 'quiz' : 'enquete', pergunta: pergunta.value, opcoes: ops.map(function (o) { return o.value.trim(); }).filter(Boolean), correta: certa }; if (modo === 'quiz' && !ops[certa].value.trim()) { erro.textContent = 'A opção marcada como certa está vazia.'; return; } }
          dados.seg = Number(tempo.value); erro.textContent = '';
          a.api('POST', '/api/live/' + id + '/jogo', dados).then(function (j) { fechar(); mostrarJogo(j); }).catch(function (e) { erro.textContent = e.message; });
        } }, 'Lançar na live')));
      pintar();
    }
    var reloj = null;
    function mostrarJogo(j) {
      jogoAtual = j; if (reloj) { clearInterval(reloj); reloj = null; }
      if (!j) { cartaoJogo.hidden = true; return; }
      var aberto = j.estado === 'aberto', restante = function () { return Math.max(0, Math.ceil((j.fim - (j.agora || Date.now()) - (Date.now() - j.local)) / 1000)); };
      if (!j.local) j.local = Date.now();
      cartaoJogo.hidden = false; cartaoJogo.className = 'jg' + (aberto ? '' : ' fim');
      var barra = h('i'), seg = h('span', { class: 'jg-s' }, '');
      var cab = h('div', { class: 'jg-cab' }, M.ic(j.tipo === 'quiz' ? 'quiz' : 'poll', 18), h('b', {}, j.tipo === 'quiz' ? 'Quiz' : 'Enquete'), h('span', { style: 'flex:1' }), aberto ? seg : h('span', { class: 'jg-s' }, 'Resultado'),
        host && aberto ? h('button', { class: 'live-x', onclick: function () { a.api('POST', '/api/live/' + id + '/jogo/encerrar').then(function (r) { mostrarJogo(r.jogo); }).catch(a.falha); } }, 'Encerrar') : null,
        !aberto || !host ? h('button', { class: 'jg-x', 'aria-label': 'Fechar', onclick: function () { cartaoJogo.hidden = true; jogoAtual = Object.assign({}, j, { oculto: true }); } }, M.ic('close', 16)) : null);
      var lista = h('div', { class: 'jg-ops' });
      j.opcoes.forEach(function (o, i) {
        var pct = j.total ? Math.round(j.contagem[i] / j.total * 100) : 0, mostrarRes = !aberto || host || j.minha >= 0;
        var cls = 'jg-op' + (j.minha === i ? ' minha' : '') + (!aberto && j.correta === i ? ' certa' : '') + (!aberto && j.minha === i && j.correta >= 0 && j.correta !== i ? ' errada' : '');
        var b = h('button', { class: cls, disabled: !aberto || host || j.minha >= 0, onclick: function () {
          a.api('POST', '/api/live/' + id + '/jogo/responder', { jogo: j.id, resposta: i }).then(function (r) { r.local = Date.now(); mostrarJogo(r); }).catch(function (e) { a.falha(e); });
        } }, h('span', { class: 'jg-fill', style: 'width:' + (mostrarRes ? pct : 0) + '%' }), h('span', { class: 'jg-t' }, o), mostrarRes ? h('span', { class: 'jg-p' }, pct + '%') : null);
        lista.append(b);
      });
      var rodape = !aberto && j.minha >= 0 && j.correta >= 0 ? h('div', { class: 'jg-res ' + (j.minha === j.correta ? 'ok' : 'no') }, j.minha === j.correta ? (j.premio ? 'Acertou! +' + j.premio + ' moedas' : 'Acertou!') : 'Quase! A resposta certa está destacada.') : (aberto && j.minha >= 0 ? h('div', { class: 'jg-res' }, 'Resposta enviada. Aguarde o resultado…') : null);
      cartaoJogo.replaceChildren.apply(cartaoJogo, [cab, h('div', { class: 'jg-bar' }, barra), h('p', { class: 'jg-q' }, j.pergunta), lista, rodape, h('small', { class: 'mudo' }, j.total + (j.total === 1 ? ' resposta' : ' respostas'))].filter(Boolean));
      if (aberto) {
        var tick = function () { var r = restante(); seg.textContent = r + 's'; barra.style.width = Math.min(100, r / (j.dur || 20) * 100) + '%'; if (r <= 0) { clearInterval(reloj); reloj = null; buscarJogo(); } };
        reloj = setInterval(tick, 500); tick();
      }
      if (!aberto && j.minha >= 0 && j.premio) a.api('GET', '/api/eu').then(a.aplicar).catch(function () { /* ok */ });
    }
    function buscarJogo() {
      a.api('GET', '/api/live/' + id + '/jogo').then(function (r) {
        var j = r.jogo;
        if (!j) { if (jogoAtual && !jogoAtual.oculto) { cartaoJogo.hidden = true; } jogoAtual = null; return; }
        if (jogoAtual && jogoAtual.id === j.id && jogoAtual.oculto) return;
        var mudou = !jogoAtual || jogoAtual.id !== j.id || jogoAtual.estado !== j.estado || jogoAtual.total !== j.total || jogoAtual.minha !== j.minha;
        if (mudou) { j.local = Date.now(); mostrarJogo(j); }
      }).catch(function () { /* ok */ });
    }
    var topo = h('div', { class: 'live-topo' }, a.av(dono), h('div', { style: 'flex:1;min-width:0' }, h('b', {}, dono.nome), h('div', { class: 'mudo peq', style: 'color:#ddd' }, titulo)),
      h('span', { class: 'live-badge' }, 'AO VIVO'), cont, tempo,
      host ? h('button', { class: 'live-x', onclick: encerrar }, 'Encerrar') : [
        U.professor ? h('button', { class: 'live-x', 'aria-label': 'Encerrar live', onclick: encerrar }, M.ic('stop', 16)) : h('button', { class: 'live-x', 'aria-label': 'Denunciar', onclick: function () { M.mod.folhaDenuncia('live', id); } }, M.ic('flag', 16)),
        h('button', { class: 'live-x', 'aria-label': 'Sair', onclick: function () { sair(); } }, M.ic('close', 16))]);
    a.add(el, [topo, flut, h('div', { class: 'live-rail' }, bandeja, btnReagir, btnJogo, btnDesafios, host ? [girar, mic, cam] : null), h('div', { class: 'live-base' }, cartaoJogo, lista, h('div', { class: 'live-envio' }, inp, h('button', { class: 'live-b azul', 'aria-label': 'Enviar comentário', onclick: enviar }, M.ic('send', 20))))]);
    document.body.append(el); document.body.style.overflow = 'hidden';

    room = new L.Room({ adaptiveStream: true, dynacast: true, publishDefaults: { simulcast: true, videoEncoding: { maxBitrate: 1200000, maxFramerate: 24 } }, videoCaptureDefaults: { resolution: L.VideoPresets.h720.resolution } });
    room.on(L.RoomEvent.TrackSubscribed, function (track) { if (track.kind === 'video') { track.attach(video); espera.style.display = 'none'; } else audios.append(track.attach()); });
    room.on(L.RoomEvent.TrackUnsubscribed, function (track) { track.detach(); if (track.kind === 'video') espera.style.display = ''; });
    room.on(L.RoomEvent.Disconnected, function () { if (!encerrada) sair(host ? 'Você saiu da transmissão.' : 'Conexão com a live encerrada.'); });
    room.connect(info.url, info.token).then(function () {
      if (!host) return;
      return room.localParticipant.setCameraEnabled(true).then(function () { return room.localParticipant.setMicrophoneEnabled(true); }).then(function () {
        var pub = room.localParticipant.getTrackPublication(L.Track.Source.Camera);
        if (pub && pub.track) { pub.track.attach(video); video.muted = true; video.classList.add('espelho'); espera.style.display = 'none'; }
      });
    }).catch(function (e) {
      var msg = e && e.name === 'NotAllowedError' ? 'Permita a câmera e o microfone para transmitir.' : 'Não foi possível conectar à live.';
      if (host) a.api('POST', '/api/live/' + id + '/encerrar').catch(function () { /* ok */ });
      sair(msg);
    });
    timers.push(setInterval(function () { var s = Math.floor((Date.now() - t0) / 1000); tempo.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }, 1000));
    timers.push(setInterval(function () { a.api('POST', '/api/live/' + id + '/ping').then(function (r) { if (r.estado === 'expulso') sair('Você foi removido desta live.'); }).catch(function () { /* ok */ }); }, 15000));
    timers.push(setInterval(function () {
      a.api('GET', '/api/live/' + id + '/chat?depois=' + ultimo + '&reac=' + seqReac).then(function (r) {
        cont.replaceChildren(M.ic('users', 14), ' ' + r.espectadores);
        if (r.reac) { r.reac.itens.forEach(function (x, i) { if (x.u !== U.id) setTimeout(function () { flutuar(x.tipo); }, i * 140); }); seqReac = r.reac.seq; }
        buscarJogo();
        var fundo = lista.scrollTop + lista.clientHeight >= lista.scrollHeight - 30;
        r.msgs.forEach(function (m) { if (m.id > ultimo) { ultimo = m.id; if (m.de.id !== U.id) lista.append(linha(m)); } });
        while (lista.children.length > 80) lista.firstChild.remove();
        if (fundo) lista.scrollTop = lista.scrollHeight;
        if (r.estado !== 'ao_vivo' && !encerrada) sair('A live terminou.');
      }).catch(function (e) { if (e.status === 403 && !host) sair('Você foi removido desta live.'); });
    }, 3000));
  }

  function cartaoPainel(p) {
    var a = AE(), h = a.h;
    if (!p.live) return null;
    var pct = Math.min(100, Math.round(p.live.usadoMin / p.live.limiteMin * 100));
    return h('div', { class: 'card' }, h('h3', {}, '🔴 Lives'),
      !p.live.ativa ? h('p', { class: 'mudo peq' }, 'LiveKit ainda não configurado no servidor.') : null,
      h('div', { class: 'barra' }, h('i', { style: 'width:' + pct + '%' })),
      h('p', { class: 'mudo peq', style: 'margin:8px 0 0' }, '≈ ' + p.live.usadoMin + ' de ' + p.live.limiteMin + ' minutos de participante usados neste mês (limite gratuito do LiveKit; estimativa). Alunos ⭐ de confiança também podem transmitir.'));
  }

  M.live = { faixa: faixa, entrar: entrar, iniciar: iniciar, cartaoPainel: cartaoPainel };
})();
