// Câmera dentro do app (como no Instagram): foto, vídeo, virar câmera, galeria e revisão antes de usar.
// Se o navegador/aparelho não deixar abrir a câmera (ex.: navegador interno de outros apps), cai para a câmera nativa do celular.
(function () {
  'use strict';
  var M = window.Mods = window.Mods || {};
  function AE() { return window.AE; }

  function suportado() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.isSecureContext !== false); }
  function tipoGravacao() {
    if (!window.MediaRecorder) return null;
    var t = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return t.filter(function (x) { return MediaRecorder.isTypeSupported(x); })[0] || null;
  }
  function msgErro(e) {
    var n = e && e.name;
    if (n === 'NotAllowedError' || n === 'SecurityError' || n === 'PermissionDeniedError') return 'O acesso à câmera está bloqueado. Toque no cadeado ao lado do endereço do site, permita a câmera e tente de novo.';
    if (n === 'NotFoundError' || n === 'DevicesNotFoundError') return 'Não encontramos uma câmera neste aparelho.';
    if (n === 'NotReadableError' || n === 'TrackStartError') return 'A câmera está sendo usada por outro app. Feche-o e tente de novo.';
    return 'Não foi possível abrir a câmera aqui.';
  }

  // opc: { foto: true, video: true, maxS: 60, modo: 'foto'|'video', maxLado: 1280, quadrado: false, frente: false }
  // devolve Promise<{ blob, tipo: 'foto'|'video' }> (ou null se a pessoa fechar)
  function abrir(opc) {
    opc = opc || {};
    var a = AE(), h = a.h, ic = M.ic, mid = M.midia;
    var podeFoto = opc.foto !== false, podeVideo = opc.video !== false && !!tipoGravacao();
    var maxS = opc.maxS || 60;
    return new Promise(function (resolver) {
      var modo = opc.modo === 'video' && podeVideo ? 'video' : (podeFoto ? 'foto' : 'video');
      var frente = !!opc.selfie;
      var stream = null, rec = null, partes = [], gravando = false, t0 = 0, tmr = null, concluido = false, resultado = null, urlPrev = null, tipoRec = tipoGravacao();
      var video = h('video', { class: 'cam-video', playsinline: 'playsinline', muted: 'muted', autoplay: 'autoplay' }); video.muted = true;
      var palco = h('div', { class: 'cam-palco' }, video);
      var aviso = h('div', { class: 'cam-aviso' });
      var tempo = h('div', { class: 'cam-tempo', hidden: 'hidden' }, '0:00');
      var arqGaleria = h('input', { type: 'file', accept: opc.foto !== false && opc.video !== false ? 'image/*,video/*' : (opc.foto !== false ? 'image/*' : 'video/*'), style: 'display:none' });
      var arqNativo = h('input', { type: 'file', style: 'display:none' });
      var ov = h('div', { class: 'cam-ov', role: 'dialog', 'aria-label': 'Câmera' });
      document.body.append(ov); document.body.style.overflow = 'hidden';

      function parar() { if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; } clearInterval(tmr); }
      function fim(r) { if (concluido) return; concluido = true; parar(); if (urlPrev) URL.revokeObjectURL(urlPrev); ov.remove(); document.body.style.overflow = ''; resolver(r || null); }

      function processarArquivo(f) {
        var ehVideo = /^video\//.test(f.type);
        if (!ehVideo && !/^image\//.test(f.type)) { a.aviso('Escolha uma foto ou um vídeo.', true); return; }
        if (ehVideo && opc.video === false) { a.aviso('Aqui só cabe foto.', true); return; }
        if (!ehVideo && opc.foto === false) { a.aviso('Aqui só cabe vídeo.', true); return; }
        aviso.textContent = 'Preparando…'; aviso.hidden = false;
        var p = ehVideo ? mid.processarVideo(f, function (x) { aviso.textContent = 'Reduzindo o vídeo… ' + Math.round(x * 100) + '%'; }, maxS) : mid.processarImagem(f, opc.maxLado || 1280, !!opc.quadrado, 0.82);
        p.then(function (b) { aviso.hidden = true; revisar(b, ehVideo ? 'video' : 'foto'); }).catch(function (e) { aviso.textContent = e.message; aviso.hidden = false; });
      }
      arqGaleria.addEventListener('change', function () { var f = arqGaleria.files && arqGaleria.files[0]; arqGaleria.value = ''; if (f) processarArquivo(f); });
      arqNativo.addEventListener('change', function () { var f = arqNativo.files && arqNativo.files[0]; arqNativo.value = ''; if (f) processarArquivo(f); });

      // câmera nativa do celular (plano B)
      function nativa() {
        arqNativo.setAttribute('accept', modo === 'video' ? 'video/*' : 'image/*');
        arqNativo.setAttribute('capture', frente ? 'user' : 'environment');
        arqNativo.click();
      }

      function revisar(blob, tipo) {
        parar();
        if (urlPrev) URL.revokeObjectURL(urlPrev);
        urlPrev = URL.createObjectURL(blob); resultado = { blob: blob, tipo: tipo };
        var m = tipo === 'video' ? h('video', { src: urlPrev, controls: 'controls', playsinline: 'playsinline', autoplay: 'autoplay', loop: 'loop', class: 'cam-rev' }) : h('img', { src: urlPrev, class: 'cam-rev', alt: 'Prévia' });
        ov.replaceChildren(m,
          h('div', { class: 'cam-rev-barra' },
            h('button', { class: 'cam-txt', onclick: function () { resultado = null; montar(); } }, 'Refazer'),
            h('button', { class: 'cam-usar', onclick: function () { fim(resultado); } }, ic('check', 20), 'Usar')));
      }

      function erroTela(e) {
        parar();
        ov.replaceChildren(h('div', { class: 'cam-erro' }, h('div', { class: 'cam-erro-ic' }, ic('camera', 34)), h('h3', {}, 'Câmera indisponível'), h('p', {}, e ? msgErro(e) : 'Este navegador não permite abrir a câmera dentro do app.'),
          h('button', { class: 'btn', onclick: nativa }, 'Usar a câmera do celular'),
          h('button', { class: 'btn sec', onclick: function () { arqGaleria.click(); } }, 'Escolher da galeria'),
          h('button', { class: 'btn sec', onclick: function () { fim(null); } }, 'Fechar')), arqGaleria, arqNativo);
      }

      function ligar() {
        parar();
        var c = { video: { facingMode: frente ? 'user' : { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false };
        return navigator.mediaDevices.getUserMedia(c).catch(function (e) {
          if (e && (e.name === 'OverconstrainedError' || e.name === 'NotFoundError')) return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          throw e;
        }).then(function (s) {
          stream = s; video.srcObject = s; video.classList.toggle('espelho', frente);
          var p = video.play(); if (p && p.catch) p.catch(function () { /* o autoplay cuida */ });
        });
      }

      function girar() { if (gravando) return; frente = !frente; ligar().catch(function (e) { a.aviso(msgErro(e), true); frente = !frente; ligar().catch(function () { /* ok */ }); }); }

      function tirarFoto() {
        if (!video.videoWidth) { a.aviso('Aguarde a câmera abrir…'); return; }
        var w = video.videoWidth, hh = video.videoHeight, sx = 0, sy = 0, sw = w, sh = hh;
        if (opc.quadrado) { var l = Math.min(w, hh); sx = (w - l) / 2; sy = (hh - l) / 2; sw = sh = l; }
        var esc = Math.min(1, (opc.maxLado || 1280) / Math.max(sw, sh));
        var cv = document.createElement('canvas'); cv.width = Math.round(sw * esc); cv.height = Math.round(sh * esc);
        cv.getContext('2d').drawImage(video, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
        ov.classList.add('flash'); setTimeout(function () { ov.classList.remove('flash'); }, 160);
        cv.toBlob(function (b) { if (b) revisar(b, 'foto'); else a.aviso('Falha ao tirar a foto.', true); }, 'image/jpeg', 0.85);
      }

      function comecarGravacao() {
        if (!stream || gravando) return;
        var pronto = function (audioTrack) {
          var fluxo = new MediaStream(stream.getVideoTracks().concat(audioTrack ? [audioTrack] : []));
          partes = [];
          try { rec = new MediaRecorder(fluxo, { mimeType: tipoRec, videoBitsPerSecond: 1000000, audioBitsPerSecond: 64000 }); } catch (e) { rec = new MediaRecorder(fluxo); }
          rec.ondataavailable = function (e) { if (e.data && e.data.size) partes.push(e.data); };
          rec.onstop = function () {
            clearInterval(tmr); gravando = false; if (audioTrack) audioTrack.stop();
            var seg = (Date.now() - t0) / 1000;
            var b = new Blob(partes, { type: (rec.mimeType || tipoRec || 'video/webm').split(';')[0] });
            if (seg < 1 || !b.size) { a.aviso('Vídeo muito curto. Segure um pouco mais.', true); montar(); return; }
            if (b.size > 19 * 1024 * 1024) { a.aviso('Vídeo grande demais. Grave um mais curto.', true); montar(); return; }
            revisar(b, 'video');
          };
          rec.start(500); gravando = true; t0 = Date.now(); ov.classList.add('gravando'); tempo.hidden = false;
          tmr = setInterval(function () {
            var s = Math.floor((Date.now() - t0) / 1000); tempo.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + ' / ' + Math.floor(maxS / 60) + ':' + String(maxS % 60).padStart(2, '0');
            ov.style.setProperty('--prog', Math.min(1, (Date.now() - t0) / (maxS * 1000)));
            if (s >= maxS) pararGravacao();
          }, 200);
        };
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function (as) { pronto(as.getAudioTracks()[0]); }, function () { a.aviso('Sem microfone: o vídeo será gravado sem som.'); pronto(null); });
      }
      function pararGravacao() { if (rec && rec.state !== 'inactive') rec.stop(); ov.classList.remove('gravando'); }

      function montar() {
        var titulo = opc.titulo || '';
        var fechar = h('button', { class: 'cam-b', 'aria-label': 'Fechar', onclick: function () { if (gravando) { rec.onstop = null; try { rec.stop(); } catch (e) { /* ok */ } } fim(null); } }, ic('close', 24));
        var virar = h('button', { class: 'cam-b', 'aria-label': 'Virar câmera', onclick: girar }, ic('flip', 24));
        var galeria = h('button', { class: 'cam-b grande', 'aria-label': 'Escolher da galeria', onclick: function () { arqGaleria.click(); } }, ic('image', 26));
        var obturador = h('button', { class: 'cam-obt', 'aria-label': modo === 'video' ? 'Gravar vídeo' : 'Tirar foto', onclick: function () {
          if (modo === 'foto') tirarFoto(); else if (gravando) pararGravacao(); else comecarGravacao();
        } }, h('i'));
        var modos = (podeFoto && podeVideo) ? h('div', { class: 'cam-modos' },
          h('button', { class: modo === 'foto' ? 'sel' : '', onclick: function () { if (gravando) return; modo = 'foto'; montar(); } }, 'Foto'),
          h('button', { class: modo === 'video' ? 'sel' : '', onclick: function () { if (gravando) return; modo = 'video'; montar(); } }, 'Vídeo')) : h('div', { class: 'cam-modos' }, h('span', { class: 'cam-so' }, modo === 'video' ? 'Vídeo' : 'Foto'));
        ov.className = 'cam-ov' + (modo === 'video' ? ' video' : '') + (frente ? ' frente' : '');
        ov.replaceChildren(palco, h('div', { class: 'cam-topo' }, fechar, h('div', { class: 'cam-titulo' }, titulo), virar), tempo, aviso,
          h('div', { class: 'cam-base' }, modos, h('div', { class: 'cam-linha' }, galeria, obturador, h('span', { style: 'width:52px' }))), arqGaleria, arqNativo);
        tempo.hidden = true;
        if (!stream) ligar().catch(erroTela);
        else { video.srcObject = stream; }
      }

      if (!suportado()) { erroTela(null); return; }
      montar();
    });
  }

  M.camera = { abrir: abrir, suportado: suportado };
})();
