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
      if (r.podeIniciar && !r.lives.some(function (l) { return l.eu; })) caixa.append(h('button', { class: 'btn mini', style: 'width:auto;padding:0 14px', onclick: iniciar }, '🔴 Iniciar live'));
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
    fechar = a.folha(h('div', {}, h('h3', {}, '🔴 Iniciar live'), h('p', { class: 'mudo peq', style: 'margin-top:0' }, 'Seus seguidores serão avisados. As regras da comunidade valem na live: qualquer pessoa pode denunciar e o professor pode encerrar.'),
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
    var cont = h('span', { class: 'live-n' }, '👁 0'), tempo = h('span', { class: 'live-t' }, '00:00');
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
        pode ? h('button', { class: 'lc-x', 'aria-label': 'Apagar', onclick: function (e) { var b = e.currentTarget; a.api('DELETE', '/api/live/chat/' + m.id).then(function () { b.parentNode.remove(); }).catch(a.falha); } }, '🗑') : null);
    }
    function enviar() {
      var t = inp.value.trim(); if (!t) return; inp.value = '';
      a.api('POST', '/api/live/' + id + '/chat', { texto: t }).then(function (m) { ultimo = Math.max(ultimo, m.id); lista.append(linha(m)); lista.scrollTop = lista.scrollHeight; }).catch(function (e) { inp.value = t; a.falha(e); });
    }
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') enviar(); });
    var mic = h('button', { class: 'live-b', 'aria-label': 'Microfone', onclick: function () { if (!room) return; var on = !room.localParticipant.isMicrophoneEnabled; room.localParticipant.setMicrophoneEnabled(on); mic.textContent = on ? '🎤' : '🔇'; } }, '🎤');
    var cam = h('button', { class: 'live-b', 'aria-label': 'Câmera', onclick: function () { if (!room) return; var on = !room.localParticipant.isCameraEnabled; room.localParticipant.setCameraEnabled(on); cam.textContent = on ? '📷' : '🚫'; } }, '📷');
    var girar = h('button', { class: 'live-b', 'aria-label': 'Virar câmera', onclick: function () {
      try { var pub = room.localParticipant.getTrackPublication(L.Track.Source.Camera); var f = pub.track.mediaStreamTrack.getSettings().facingMode; pub.track.restartTrack({ facingMode: f === 'environment' ? 'user' : 'environment' }); } catch (e) { a.aviso('Não foi possível virar a câmera.', true); }
    } }, '🔄');
    var topo = h('div', { class: 'live-topo' }, a.av(dono), h('div', { style: 'flex:1;min-width:0' }, h('b', {}, dono.nome), h('div', { class: 'mudo peq', style: 'color:#ddd' }, titulo)),
      h('span', { class: 'live-badge' }, 'AO VIVO'), cont, tempo,
      host ? h('button', { class: 'live-x', onclick: encerrar }, 'Encerrar') : [
        U.professor ? h('button', { class: 'live-x', onclick: encerrar }, '⏹') : h('button', { class: 'live-x', 'aria-label': 'Denunciar', onclick: function () { M.mod.folhaDenuncia('live', id); } }, '🚩'),
        h('button', { class: 'live-x', 'aria-label': 'Sair', onclick: function () { sair(); } }, '✕')]);
    a.add(el, [topo, h('div', { class: 'live-base' }, lista, h('div', { class: 'live-envio' }, host ? [mic, cam, girar] : null, inp, h('button', { class: 'btn', style: 'width:auto;padding:0 16px', onclick: enviar }, 'Enviar')))]);
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
      a.api('GET', '/api/live/' + id + '/chat?depois=' + ultimo).then(function (r) {
        cont.textContent = '👁 ' + r.espectadores;
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
