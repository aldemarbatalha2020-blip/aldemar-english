// Chamadas de áudio e vídeo entre dois alunos (WebRTC). O servidor só troca os sinais de conexão; nada é gravado.
(function () {
  'use strict';
  var M = window.Mods = window.Mods || {};
  function AE() { return window.AE; }
  var cham = null;          // chamada em andamento
  var vigiando = false, tocando = null;

  function limpar() {
    if (!cham) return;
    clearInterval(cham.timer); clearInterval(cham.tempo);
    if (cham.pc) { try { cham.pc.close(); } catch (e) { /* ok */ } }
    if (cham.local) cham.local.getTracks().forEach(function (t) { t.stop(); });
    if (cham.el) cham.el.remove();
    document.body.style.overflow = '';
    cham = null;
  }
  function encerrar(avisar, texto) {
    var c = cham; if (!c) return;
    if (avisar) AE().api('POST', '/api/chamada/' + c.id + '/encerrar').catch(function () { /* ok */ });
    limpar();
    if (texto) AE().aviso(texto);
  }

  function tela(p, tipo) {
    var a = AE(), h = a.h;
    var remoto = h('video', { class: 'remoto', autoplay: 'autoplay', playsinline: 'playsinline' });
    var local = h('video', { class: 'local', autoplay: 'autoplay', playsinline: 'playsinline', muted: 'muted' }); local.muted = true;
    var status = h('div', { class: 'cham-status' }, 'Chamando…');
    var mic = h('button', { class: 'cham-b', 'aria-label': 'Microfone', onclick: function () {
      if (!cham || !cham.local) return; var t = cham.local.getAudioTracks()[0]; if (!t) return; t.enabled = !t.enabled; mic.textContent = t.enabled ? '🎤' : '🔇';
    } }, '🎤');
    var cam = h('button', { class: 'cham-b', 'aria-label': 'Câmera', style: tipo === 'video' ? '' : 'display:none', onclick: function () {
      if (!cham || !cham.local) return; var t = cham.local.getVideoTracks()[0]; if (!t) return; t.enabled = !t.enabled; cam.textContent = t.enabled ? '📷' : '🚫';
    } }, '📷');
    var fim = h('button', { class: 'cham-b vermelho', 'aria-label': 'Encerrar', onclick: function () { encerrar(true); } }, '📵');
    var el = h('div', { class: 'cham-ov' + (tipo === 'video' ? ' video' : '') }, remoto, h('div', { class: 'cham-centro' }, a.av(p, 'grande'), h('h2', {}, p.nome), status), local, h('div', { class: 'cham-barra' }, mic, cam, fim));
    document.body.append(el); document.body.style.overflow = 'hidden';
    return { el: el, remoto: remoto, local: local, status: status };
  }

  function conectar(papel) {
    var a = AE(), c = cham;
    var restrito = { audio: { echoCancellation: true, noiseSuppression: true }, video: c.tipo === 'video' ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } : false };
    if (!navigator.mediaDevices || !window.RTCPeerConnection) { encerrar(true, 'Seu navegador não suporta chamadas.'); return; }
    Promise.all([navigator.mediaDevices.getUserMedia(restrito), a.api('GET', '/api/chamada/config')]).then(function (r) {
      if (cham !== c) { r[0].getTracks().forEach(function (t) { t.stop(); }); return; }
      c.local = r[0]; c.ui.local.srcObject = c.local;
      var pc = c.pc = new RTCPeerConnection({ iceServers: r[1].iceServers });
      var fila = [], temRemota = false, ultimo = 0, falhou = 0;
      c.local.getTracks().forEach(function (t) { pc.addTrack(t, c.local); });
      pc.ontrack = function (e) { c.ui.remoto.srcObject = e.streams[0]; var pr = c.ui.remoto.play(); if (pr && pr.catch) pr.catch(function () { /* ok */ }); };
      pc.onicecandidate = function (e) { if (e.candidate) a.api('POST', '/api/chamada/' + c.id + '/sinal', { tipo: 'ice', dados: JSON.stringify(e.candidate) }).catch(function () { /* ok */ }); };
      pc.onconnectionstatechange = function () {
        if (cham !== c) return;
        if (pc.connectionState === 'connected') {
          c.conectou = Date.now(); c.ui.el.classList.add('ativa'); c.ui.status.textContent = '00:00';
          c.tempo = setInterval(function () { var s = Math.floor((Date.now() - c.conectou) / 1000); c.ui.status.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }, 1000);
        } else if (pc.connectionState === 'failed') encerrar(true, 'Não foi possível conectar (a rede de algum dos dois bloqueou a chamada).');
        else if (pc.connectionState === 'disconnected') setTimeout(function () { if (cham === c && pc.connectionState === 'disconnected') encerrar(true, 'Conexão perdida.'); }, 8000);
      };
      function aplicarIce(d) { return pc.addIceCandidate(JSON.parse(d)).catch(function () { /* ok */ }); }
      c.ui.status.textContent = 'Conectando…';
      if (papel === 'chamador') {
        pc.createOffer().then(function (o) { return pc.setLocalDescription(o).then(function () { return a.api('POST', '/api/chamada/' + c.id + '/sinal', { tipo: 'offer', dados: JSON.stringify(pc.localDescription) }); }); }).catch(function (e) { encerrar(true, 'Falha ao iniciar a chamada.'); });
      }
      c.timer = setInterval(function () {
        a.api('GET', '/api/chamada/' + c.id + '/sinais?depois=' + ultimo).then(function (r) {
          if (cham !== c) return;
          if (r.estado !== 'aceita') { encerrar(false, 'Chamada encerrada.'); return; }
          r.sinais.forEach(function (s) {
            ultimo = Math.max(ultimo, s.id);
            if (s.tipo === 'offer' && papel === 'atendente') {
              pc.setRemoteDescription(JSON.parse(s.dados)).then(function () { temRemota = true; return pc.createAnswer(); })
                .then(function (an) { return pc.setLocalDescription(an).then(function () { return a.api('POST', '/api/chamada/' + c.id + '/sinal', { tipo: 'answer', dados: JSON.stringify(pc.localDescription) }); }); })
                .then(function () { fila.splice(0).forEach(aplicarIce); }).catch(function () { encerrar(true, 'Falha ao conectar.'); });
            } else if (s.tipo === 'answer' && papel === 'chamador') {
              pc.setRemoteDescription(JSON.parse(s.dados)).then(function () { temRemota = true; fila.splice(0).forEach(aplicarIce); }).catch(function () { /* ok */ });
            } else if (s.tipo === 'ice') { if (temRemota) aplicarIce(s.dados); else fila.push(s.dados); }
          });
          falhou = 0;
        }).catch(function (e) { if (e.status && e.status !== 0 && ++falhou > 3) encerrar(false, 'Chamada encerrada.'); });
      }, 1000);
    }).catch(function (e) {
      encerrar(true, e && e.name === 'NotAllowedError' ? 'Permita o microfone' + (c.tipo === 'video' ? ' e a câmera' : '') + ' para chamar.' : (e.message || 'Não foi possível usar o microfone/câmera.'));
    });
  }

  // quem liga
  function ligar(p, tipo) {
    var a = AE();
    if (cham) { a.aviso('Você já está em uma chamada.', true); return; }
    a.api('POST', '/api/chamada', { para: p.id, tipo: tipo }).then(function (r) {
      var c = cham = { id: r.id, tipo: tipo, p: p };
      c.ui = tela(p, tipo); c.el = c.ui.el;
      c.timer = setInterval(function () {
        a.api('GET', '/api/chamada/' + c.id).then(function (s) {
          if (cham !== c) return;
          if (s.estado === 'aceita') { clearInterval(c.timer); conectar('chamador'); }
          else if (s.estado !== 'chamando') encerrar(false, s.estado === 'recusada' ? p.nome + ' recusou a chamada.' : 'Sem resposta.');
        }).catch(function () { /* tenta de novo */ });
      }, 1500);
    }).catch(a.falha);
  }

  // quem recebe
  function tocar() {
    var n = 0;
    function beep() {
      try { if (navigator.vibrate) navigator.vibrate([300, 200, 300]); } catch (e) { /* ok */ }
      try {
        var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
        var x = tocando.ctx || (tocando.ctx = new C()), o = x.createOscillator(), g = x.createGain();
        o.frequency.value = 760; g.gain.value = 0.08; o.connect(g); g.connect(x.destination); o.start(); o.stop(x.currentTime + 0.25);
      } catch (e) { /* som bloqueado */ }
      n++;
    }
    tocando = { ctx: null, t: setInterval(beep, 1800) }; beep();
  }
  function pararToque() { if (tocando) { clearInterval(tocando.t); try { if (tocando.ctx) tocando.ctx.close(); } catch (e) { /* ok */ } tocando = null; } }
  function receber(ch) {
    var a = AE(), h = a.h;
    if (cham) return;
    var c = cham = { id: ch.id, tipo: ch.tipo, p: ch.de, entrando: true };
    var el = h('div', { class: 'cham-ov entrada' }, h('div', { class: 'cham-centro' }, a.av(ch.de, 'grande'), h('h2', {}, ch.de.nome), h('div', { class: 'cham-status' }, (ch.tipo === 'video' ? '🎥 Chamada de vídeo' : '📞 Chamada de áudio') + '…')),
      h('div', { class: 'cham-barra' },
        h('button', { class: 'cham-b vermelho', 'aria-label': 'Recusar', onclick: function () { pararToque(); a.api('POST', '/api/chamada/' + ch.id + '/responder', { aceitar: false }).catch(function () { /* ok */ }); limpar(); } }, '📵'),
        h('button', { class: 'cham-b verde', 'aria-label': 'Atender', onclick: function () {
          pararToque();
          a.api('POST', '/api/chamada/' + ch.id + '/responder', { aceitar: true }).then(function () {
            if (cham !== c) return; clearInterval(c.timer); c.entrando = false; el.remove(); c.ui = tela(ch.de, ch.tipo); c.el = c.ui.el; conectar('atendente');
          }).catch(function (e) { limpar(); a.falha(e); });
        } }, '📞')));
    c.el = el; document.body.append(el); document.body.style.overflow = 'hidden';
    tocar();
    c.timer = setInterval(function () { // some se quem ligou desistiu
      a.api('GET', '/api/chamada/' + ch.id).then(function (s) { if (cham === c && c.entrando && s.estado !== 'chamando') { pararToque(); limpar(); a.aviso('Chamada perdida de ' + ch.de.nome); } }).catch(function () { /* ok */ });
    }, 2000);
  }
  function vigiar() {
    if (vigiando) return; vigiando = true;
    var a = AE();
    setInterval(function () {
      if (!a.U || document.hidden || cham) return;
      a.api('GET', '/api/chamada/pendente').then(function (r) { if (r.chamada && !cham) receber(r.chamada); }).catch(function () { /* ok */ });
    }, 3000);
  }
  M.chamada = { ligar: ligar, vigiar: vigiar, ativa: function () { return !!cham; } };
})();
