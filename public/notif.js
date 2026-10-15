// Notificações no aparelho (Web Push). Funciona com o app aberto ou fechado.
(function () {
  'use strict';
  var M = window.Mods = window.Mods || {};
  function AE() { return window.AE; }
  var suporta = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var instalado = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

  function b64(s) {
    var p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')), o = new Uint8Array(r.length);
    for (var i = 0; i < r.length; i++) o[i] = r.charCodeAt(i);
    return o;
  }
  function registro() { return navigator.serviceWorker.ready; }
  function inscricaoAtual() { return registro().then(function (r) { return r.pushManager.getSubscription(); }); }

  function ativar(geral) {
    var a = AE();
    return Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') throw new Error('Permissão negada. Libere as notificações nas configurações do navegador.');
      return a.api('GET', '/api/push/chave');
    }).then(function (k) {
      if (!k.chave) throw new Error('As notificações ainda não estão ativas no servidor.');
      return registro().then(function (r) { return r.pushManager.getSubscription().then(function (s) { return s || r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(k.chave) }); }); });
    }).then(function (s) { return a.api('POST', '/api/push/inscrever', { sub: s.toJSON(), geral: !!geral }); });
  }
  function desativar() {
    var a = AE();
    return inscricaoAtual().then(function (s) {
      if (!s) return;
      return a.api('POST', '/api/push/cancelar', { endpoint: s.endpoint }).catch(function () { /* ok */ }).then(function () { return s.unsubscribe(); });
    });
  }
  // após o login: renova a inscrição no servidor se o aparelho já deu permissão
  function sincronizar() {
    if (!suporta || Notification.permission !== 'granted') return;
    var a = AE();
    inscricaoAtual().then(function (s) {
      if (!s) return;
      var geral = false; try { geral = localStorage.getItem('ae_push_geral') === '1'; } catch (e) { /* ok */ }
      return a.api('POST', '/api/push/inscrever', { sub: s.toJSON(), geral: geral });
    }).catch(function () { /* ok */ });
  }

  function cartao() {
    var a = AE(), h = a.h;
    var c = h('div', { class: 'card' }, h('h3', {}, '🔔 Notificações'));
    var corpo = h('div');
    c.append(corpo);
    if (!suporta || (ios && !instalado)) {
      corpo.append(h('p', { class: 'mudo', style: 'margin:0' }, ios && !instalado
        ? 'No iPhone, toque em Compartilhar e em “Adicionar à Tela de Início”. Depois abra o app por lá e ative as notificações aqui.'
        : 'Este navegador não permite notificações. Tente o Chrome (Android/computador) ou instale o app.'));
      return c;
    }
    function desenhar(s) {
      corpo.replaceChildren();
      var perm = Notification.permission;
      if (perm === 'denied') { corpo.append(h('p', { class: 'mudo', style: 'margin:0' }, 'As notificações estão bloqueadas neste aparelho. Libere nas configurações do navegador.')); return; }
      if (!s || perm !== 'granted') {
        corpo.append(h('p', { class: 'mudo peq', style: 'margin-top:0' }, 'Receba um aviso no aparelho quando alguém te mandar mensagem, comentar no seu post ou aprovar sua foto.'),
          h('button', { class: 'btn', onclick: function () { ativar(false).then(function () { a.aviso('Notificações ativadas!'); return inscricaoAtual(); }).then(desenhar).catch(function (e) { a.falha(e); }); } }, 'Ativar notificações'));
        return;
      }
      var geral = false; try { geral = localStorage.getItem('ae_push_geral') === '1'; } catch (e) { /* ok */ }
      var cb = h('input', { type: 'checkbox' }); cb.checked = geral;
      cb.addEventListener('change', function () {
        try { localStorage.setItem('ae_push_geral', cb.checked ? '1' : '0'); } catch (e) { /* ok */ }
        a.api('POST', '/api/push/geral', { endpoint: s.endpoint, geral: cb.checked }).catch(a.falha);
      });
      corpo.append(h('p', { style: 'margin:0 0 8px' }, '✅ Ativadas neste aparelho.'),
        h('label', { class: 'aceite' }, cb, h('span', {}, 'Avisar também das mensagens da sala da turma')),
        h('button', { class: 'btn sec', onclick: function () { desativar().then(function () { desenhar(null); }).catch(a.falha); } }, 'Desativar'));
    }
    inscricaoAtual().then(desenhar).catch(function () { desenhar(null); });
    return c;
  }
  M.notif = { cartao: cartao, sincronizar: sincronizar, suporta: suporta };
})();
