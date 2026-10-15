// Regras da comunidade, denúncias com motivo e ferramentas de moderação do professor.
(function () {
  'use strict';
  var M = window.Mods = window.Mods || {};
  function AE() { return window.AE; }
  var MOTIVOS = [
    ['nudez', 'Nudez ou conteúdo sexual'], ['ofensa', 'Ofensa, bullying ou assédio'], ['violencia', 'Violência ou ameaça'],
    ['privacidade', 'Expõe dados ou foto de outra pessoa'], ['spam', 'Spam ou propaganda'], ['outro', 'Outro motivo (explique)']];
  var REGRAS = [
    'Respeite todos. Sem ofensas, bullying, preconceito ou assédio.',
    'Nada de nudez, conteúdo sexual, violência ou drogas — em foto, vídeo, áudio ou texto.',
    'Não mostre outras pessoas sem autorização e não compartilhe dados pessoais (telefone, endereço, senhas).',
    'Fotos de perfil e posts passam pela aprovação do professor antes de aparecer para a turma.',
    'Fotos não são permitidas em conversas privadas. Use texto ou áudio.',
    'Links, propaganda e spam não são permitidos.',
    'Viu algo errado? Use “Denunciar” e explique o motivo. Só o professor decide silenciar alguém.'];

  function folhaRegras(somenteLer, aoAceitar) {
    var a = AE(), h = a.h, fechar, marcado = h('input', { type: 'checkbox' });
    var botao = h('button', { class: 'btn', disabled: true, onclick: function () {
      a.api('POST', '/api/regras/aceitar').then(function (u) { a.aplicar(u); fechar(); if (aoAceitar) aoAceitar(); a.render(); }).catch(a.falha);
    } }, 'Continuar');
    marcado.addEventListener('change', function () { botao.disabled = !marcado.checked; });
    var c = h('div', {}, h('h3', {}, '🛡️ Regras da comunidade'), h('ol', { class: 'regras' }, REGRAS.map(function (r) { return h('li', {}, r); })));
    if (somenteLer) c.append(h('button', { class: 'btn sec', onclick: function () { fechar(); } }, 'Fechar'));
    else c.append(h('label', { class: 'aceite' }, marcado, h('span', {}, 'Li e aceito as regras da comunidade')), botao);
    fechar = a.folha(c);
  }

  function folhaDenuncia(alvo, id, aoEnviar) {
    var a = AE(), h = a.h, fechar, motivo = '';
    var detalhe = h('textarea', { rows: '3', maxlength: '300', placeholder: 'Explique o que aconteceu (obrigatório em “Outro motivo”)' });
    var erro = h('div', { class: 'erro' });
    var lista = h('div', { class: 'motivos' });
    function desenhar() {
      lista.replaceChildren();
      MOTIVOS.forEach(function (m) {
        lista.append(h('button', { type: 'button', class: 'motivo' + (motivo === m[0] ? ' sel' : ''), onclick: function () { motivo = m[0]; desenhar(); } }, m[1]));
      });
    }
    desenhar();
    var enviar = h('button', { class: 'btn coral', onclick: function () {
      erro.textContent = '';
      if (!motivo) { erro.textContent = 'Escolha o motivo da denúncia.'; return; }
      if (motivo === 'outro' && detalhe.value.trim().length < 5) { erro.textContent = 'Explique o motivo da denúncia.'; return; }
      enviar.disabled = true;
      a.api('POST', '/api/denunciar', { alvo: alvo, id: id, motivo: motivo, detalhe: detalhe.value }).then(function () {
        fechar(); a.aviso('Denúncia enviada ao professor. Obrigado!'); if (aoEnviar) aoEnviar();
      }).catch(function (e) { enviar.disabled = false; erro.textContent = e.message; });
    } }, 'Enviar denúncia');
    fechar = a.folha(h('div', {}, h('h3', {}, '🚩 Denunciar'), h('p', { class: 'mudo peq', style: 'margin-top:0' }, 'Diga ao professor o motivo. Ele analisa e decide o que fazer.'),
      lista, detalhe, erro, h('div', { class: 'espaco' }), enviar, h('button', { class: 'btn sec', style: 'margin-top:8px', onclick: function () { fechar(); } }, 'Cancelar')));
  }

  function previa(conteudo) {
    var a = AE(), h = a.h;
    if (!conteudo) return h('div', { class: 'mudo peq' }, '(conteúdo indisponível)');
    var w = h('div', { class: 'previa' });
    if (conteudo.midia && conteudo.tipo === 'foto') w.append(h('img', { src: '/api/midia/' + conteudo.midia, alt: 'prévia', loading: 'lazy' }));
    else if (conteudo.midia && conteudo.tipo === 'video') w.append(h('video', { src: '/api/midia/' + conteudo.midia, controls: 'controls', preload: 'metadata', playsinline: 'playsinline' }));
    else if (conteudo.midia && conteudo.tipo === 'audio') w.append(h('audio', { src: '/api/midia/' + conteudo.midia, controls: 'controls', preload: 'none' }));
    if (conteudo.texto) w.append(h('div', {}, conteudo.texto));
    return w;
  }

  function cartaoPendentes(p, recarregar) {
    var a = AE(), h = a.h;
    var c = h('div', { class: 'card' }, h('h3', {}, '🕒 Para aprovar (' + p.pendentes.length + ')'));
    if (!p.pendentes.length) { c.append(h('p', { class: 'mudo', style: 'margin:0' }, 'Nada esperando aprovação.')); return c; }
    p.pendentes.forEach(function (x) {
      function decidir(ok) {
        a.api('POST', '/api/professor/aprovar', { tipo: x.tipo, id: x.id, aprovar: ok }).then(function () { a.aviso(ok ? 'Aprovado.' : 'Recusado.'); recarregar(); }).catch(a.falha);
      }
      c.append(h('div', { class: 'pend' },
        h('div', { class: 'mudo peq' }, (x.tipo === 'perfil' ? 'Foto de perfil de ' : (x.midiaTipo === 'video' ? 'Vídeo de ' : 'Foto de ')) + (x.dono ? x.dono.nome : '?')),
        previa({ tipo: x.midiaTipo, midia: x.midia, texto: x.legenda }),
        h('div', { class: 'opcoes-linha' }, h('button', { class: 'btn ciano mini', onclick: function () { decidir(true); } }, 'Aprovar'), h('button', { class: 'btn coral mini', onclick: function () { decidir(false); } }, 'Recusar'))));
    });
    return c;
  }

  function cartaoDenuncias(p, recarregar) {
    var a = AE(), h = a.h;
    var NOME = { msg: 'Mensagem', post: 'Post', comentario: 'Comentário', perfil: 'Foto de perfil' };
    var c = h('div', { class: 'card' }, h('h3', {}, '🚩 Denúncias (' + p.denuncias.length + ')'));
    if (!p.denuncias.length) { c.append(h('p', { class: 'mudo', style: 'margin:0' }, 'Nenhuma denúncia aberta.')); return c; }
    p.denuncias.forEach(function (d) {
      function moderar(acao) { a.api('POST', '/api/professor/moderar', { alvo: d.alvo, id: d.id, acao: acao }).then(function () { a.aviso('Feito.'); recarregar(); }).catch(a.falha); }
      var escondido = d.estado === 3 || d.estado === 1;
      var aut = d.autor;
      c.append(h('div', { class: 'pend' },
        h('div', {}, h('b', {}, NOME[d.alvo] || d.alvo), aut ? ' de ' + aut.nome : '', escondido ? h('span', { class: 'etiqueta', style: 'background:var(--coral)' }, 'ESCONDIDO') : null),
        previa(d.conteudo),
        h('ul', { class: 'motivos-d' }, d.motivos.map(function (m) { return h('li', {}, h('b', {}, m.motivo), m.detalhe ? ': ' + m.detalhe : '', h('span', { class: 'mudo peq' }, ' — ' + m.por)); })),
        h('div', { class: 'opcoes-linha' },
          h('button', { class: 'btn coral mini', onclick: function () { moderar('apagar'); } }, 'Apagar'),
          h('button', { class: 'btn sec mini', onclick: function () { moderar(escondido ? 'restaurar' : 'dispensar'); } }, escondido ? 'Restaurar' : 'Manter'),
          aut && !aut.professor ? h('button', { class: 'btn mini ' + (aut.banido ? 'ciano' : 'sec'), onclick: function () {
            a.api('POST', '/api/professor/silenciar', { id: aut.id, silenciar: !aut.banido }).then(function () { a.aviso(aut.banido ? 'Aluno reativado.' : 'Aluno silenciado.'); recarregar(); }).catch(a.falha);
          } }, aut.banido ? 'Reativar autor' : 'Silenciar autor') : null)));
    });
    return c;
  }

  function cartaoArmazenamento(p) {
    var a = AE(), h = a.h, mb = function (n) { return (n / 1048576).toFixed(1) + ' MB'; };
    var pct = Math.min(100, Math.round(p.armazenamento.usado / p.armazenamento.limite * 100));
    return h('div', { class: 'card' }, h('h3', {}, '💾 Espaço de fotos, vídeos e áudios'),
      h('div', { class: 'barra' }, h('i', { style: 'width:' + pct + '%' })),
      h('p', { class: 'mudo peq', style: 'margin:8px 0 0' }, mb(p.armazenamento.usado) + ' de ' + mb(p.armazenamento.limite) + '. Áudios com mais de 30 dias são apagados sozinhos.'));
  }

  M.mod = { folhaRegras: folhaRegras, folhaDenuncia: folhaDenuncia, cartaoPendentes: cartaoPendentes, cartaoDenuncias: cartaoDenuncias, cartaoArmazenamento: cartaoArmazenamento, previa: previa };
})();
