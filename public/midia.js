// Fotos, vídeos curtos e áudios: preparo no aparelho (reduz o tamanho e remove dados como a localização das fotos) e envio.
(function () {
  'use strict';
  var M = window.Mods = window.Mods || {};
  function AE() { return window.AE; }

  function carregarImagem(file) {
    return new Promise(function (ok, falha) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); ok(img); };
      img.onerror = function () { URL.revokeObjectURL(url); falha(new Error('Não foi possível abrir esta imagem')); };
      img.src = url;
    });
  }
  // Redesenha a imagem num canvas: reduz o tamanho e descarta os metadados (EXIF/GPS)
  function processarImagem(file, maxLado, quadrado, qualidade) {
    return carregarImagem(file).then(function (img) {
      var w = img.naturalWidth, h = img.naturalHeight, sx = 0, sy = 0, sw = w, sh = h;
      if (quadrado) { var l = Math.min(w, h); sx = (w - l) / 2; sy = (h - l) / 2; sw = sh = l; }
      var esc = Math.min(1, maxLado / Math.max(sw, sh));
      var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(sw * esc)); c.height = Math.max(1, Math.round(sh * esc));
      c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
      return new Promise(function (ok, falha) { c.toBlob(function (b) { b ? ok(b) : falha(new Error('Falha ao preparar a imagem')); }, 'image/jpeg', qualidade || 0.82); });
    });
  }

  // Vídeo curto (até 30 s). Se for grande, é regravado em 480p direto no aparelho.
  function processarVideo(file, aoProgredir) {
    var MAX_S = 30;
    return new Promise(function (ok, falha) {
      var url = URL.createObjectURL(file), v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
      function fim(erro, blob) { URL.revokeObjectURL(url); if (erro) falha(erro); else ok(blob); }
      v.onerror = function () { fim(new Error('Não foi possível ler este vídeo')); };
      v.onloadedmetadata = function () {
        if (v.duration > MAX_S + 0.5) return fim(new Error('O vídeo tem mais de ' + MAX_S + ' segundos. Escolha um mais curto.'));
        if (file.size <= 6 * 1024 * 1024) return fim(null, file);
        var cap = v.captureStream || v.mozCaptureStream;
        var tipos = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
        var tipo = window.MediaRecorder ? tipos.filter(function (t) { return MediaRecorder.isTypeSupported(t); })[0] : null;
        if (!cap || !tipo) return file.size <= 14 * 1024 * 1024 ? fim(null, file) : fim(new Error('Este vídeo é grande demais (limite 15 MB) e seu navegador não consegue reduzi-lo. Grave um vídeo mais curto.'));
        var esc = Math.min(1, 480 / Math.min(v.videoWidth || 480, v.videoHeight || 480));
        var cw = Math.max(2, Math.round((v.videoWidth || 480) * esc / 2) * 2), ch = Math.max(2, Math.round((v.videoHeight || 480) * esc / 2) * 2);
        var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
        var cx = cv.getContext('2d'), stream = cv.captureStream(24), raf = 0, partes = [];
        try { cap.call(v).getAudioTracks().forEach(function (t) { stream.addTrack(t); }); } catch (e) { /* sem áudio */ }
        var rec = new MediaRecorder(stream, { mimeType: tipo, videoBitsPerSecond: 1200000, audioBitsPerSecond: 64000 });
        rec.ondataavailable = function (e) { if (e.data && e.data.size) partes.push(e.data); };
        rec.onstop = function () {
          cancelAnimationFrame(raf);
          var b = new Blob(partes, { type: tipo.split(';')[0] });
          b.size > 14 * 1024 * 1024 ? fim(new Error('O vídeo continua grande demais. Escolha um mais curto.')) : fim(null, b);
        };
        function quadro() { cx.drawImage(v, 0, 0, cw, ch); if (aoProgredir && v.duration) aoProgredir(Math.min(1, v.currentTime / v.duration)); raf = requestAnimationFrame(quadro); }
        v.onended = function () { if (rec.state !== 'inactive') rec.stop(); };
        rec.start(250); quadro();
        v.play().catch(function () { rec.stop(); });
      };
    });
  }

  function enviar(tipo, blob) {
    return fetch('/api/upload?tipo=' + tipo, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': blob.type || 'application/octet-stream' }, body: blob })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.ok) return j;
          var e = new Error(j.erro || 'Falha no envio'); e.status = r.status; throw e;
        });
      }, function () { throw new Error('Sem conexão com a internet'); });
  }

  // Foto de perfil (precisa da aprovação do professor) ou avatar de emoji
  function folhaFoto() {
    var a = AE(), h = a.h, U = a.U, fechar;
    var estado = h('p', { class: 'mudo peq' });
    var emojis = ['🦊', '🐼', '🦁', '🐯', '🐸', '🐙', '🦉', '🐬', '🦄', '🐢', '🚀', '🎧'];
    var arquivo = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    function msgEstado() {
      var u = a.U;
      estado.textContent = u.fotoPend ? '⏳ Sua nova foto está aguardando a aprovação do professor.' : (u.foto ? 'Sua foto já está aprovada.' : 'Sem foto: aparece o avatar de emoji.');
    }
    arquivo.addEventListener('change', function () {
      var f = arquivo.files && arquivo.files[0]; if (!f) return;
      if (!/^image\//.test(f.type)) { a.aviso('Escolha uma imagem.', true); return; }
      estado.textContent = 'Preparando a foto…';
      processarImagem(f, 512, true, 0.85).then(function (b) { return enviar('perfil', b); })
        .then(function (r) { return a.api('POST', '/api/perfil/foto', { midia: r.id }); })
        .then(function (u) { a.aplicar(u); msgEstado(); a.render(); a.aviso(u.foto ? 'Foto atualizada!' : 'Foto enviada! O professor precisa aprovar antes de aparecer para a turma.'); })
        .catch(function (e) { msgEstado(); a.falha(e); });
    });
    var grade = h('div', { class: 'avatares' }, emojis.map(function (e) {
      return h('button', { class: e === U.avatar ? 'sel' : '', onclick: function () { a.api('POST', '/api/avatar', { avatar: e }).then(function (u) { a.aplicar(u); fechar(); a.render(); }).catch(a.falha); } }, e);
    }));
    var c = h('div', {}, h('h3', {}, 'Sua foto'),
      h('div', { style: 'display:flex;justify-content:center;margin:10px 0' }, a.av(U, 'grande')), estado,
      arquivo,
      h('div', { class: 'opcoes-f' },
        h('button', { class: 'btn', onclick: function () { arquivo.click(); } }, '📷 Escolher uma foto'),
        U.foto || U.fotoPend ? h('button', { class: 'btn sec', onclick: function () { a.api('DELETE', '/api/perfil/foto').then(function (u) { a.aplicar(u); fechar(); a.render(); }).catch(a.falha); } }, 'Remover foto') : null),
      h('p', { class: 'mudo peq' }, 'A foto passa pela aprovação do professor. Use uma foto sua, com roupa adequada. Fotos de outras pessoas, de celebridades ou impróprias são recusadas.'),
      h('h3', { style: 'margin-top:12px' }, 'Ou escolha um avatar'), grade);
    msgEstado();
    fechar = a.folha(c);
  }

  // Botão de gravar áudio: toque para gravar, depois enviar ou descartar (máx. 60 s)
  function gravador(aoEnviar) {
    var a = AE(), h = a.h;
    var caixa = h('div', { class: 'gravador' });
    var rec = null, stream = null, partes = [], t0 = 0, tmr = null, descartar = false;
    function parar() { clearInterval(tmr); if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    function inicial() { caixa.replaceChildren(h('button', { class: 'btn sec mini mic', 'aria-label': 'Gravar áudio', onclick: iniciar }, '🎤')); }
    function iniciar() {
      if (!navigator.mediaDevices || !window.MediaRecorder) { a.aviso('Seu navegador não permite gravar áudio.', true); return; }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
        stream = s; partes = []; descartar = false;
        var tipos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
        var tipo = tipos.filter(function (t) { return MediaRecorder.isTypeSupported(t); })[0];
        rec = tipo ? new MediaRecorder(s, { mimeType: tipo, audioBitsPerSecond: 48000 }) : new MediaRecorder(s);
        rec.ondataavailable = function (e) { if (e.data && e.data.size) partes.push(e.data); };
        rec.onstop = function () {
          parar();
          if (descartar) { inicial(); return; }
          var blob = new Blob(partes, { type: (rec.mimeType || tipo || 'audio/webm').split(';')[0] });
          caixa.replaceChildren(h('span', { class: 'mudo peq' }, 'Enviando áudio…'));
          enviar('audio', blob).then(function (r) { return aoEnviar(r.id); }).then(inicial).catch(function (e) { a.falha(e); inicial(); });
        };
        rec.start();
        t0 = Date.now();
        var tempo = h('span', { class: 'tempo' }, '0:00');
        tmr = setInterval(function () { var s2 = Math.floor((Date.now() - t0) / 1000); tempo.textContent = Math.floor(s2 / 60) + ':' + String(s2 % 60).padStart(2, '0'); if (s2 >= 60 && rec.state === 'recording') rec.stop(); }, 250);
        caixa.replaceChildren(h('span', { class: 'rec-ponto' }, '●'), tempo,
          h('button', { class: 'btn sec mini', onclick: function () { descartar = true; rec.stop(); } }, '✕'),
          h('button', { class: 'btn mini', onclick: function () { if (rec.state === 'recording') rec.stop(); } }, 'Enviar'));
      }).catch(function () { a.aviso('Permita o uso do microfone para gravar áudios.', true); });
    }
    inicial();
    caixa.cancelar = function () { if (rec && rec.state === 'recording') { descartar = true; rec.stop(); } parar(); };
    return caixa;
  }

  M.midia = { processarImagem: processarImagem, processarVideo: processarVideo, enviar: enviar, folhaFoto: folhaFoto, gravador: gravador };
})();
