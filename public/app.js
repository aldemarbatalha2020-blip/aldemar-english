(function () {
  'use strict';
  var CURSO = window.montarCurso();
  var temFala = 'speechSynthesis' in window;
  var AVATARES = ['🦊', '🐼', '🦁', '🐯', '🐸', '🐙', '🦉', '🐬', '🦄', '🐢', '🚀', '🎧'];

  // ---------- estado ----------
  var U = null;            // conta do aluno (vem do servidor)
  var offline = false;
  var tela = 'jornada';    // jornada | ranking | posts | comunidade | perfil | painel
  var subCom = 'geral';    // geral | conversas | conversa
  var conversaCom = null;
  var rankTipo = 'semana';
  var timerTela = null;
  var temDm = false;
  var visitaId = 0, voltarPara = 'ranking';
  var pilulaLicao = null;

  function ler(k, padrao) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; } }
  function gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } }
  function guardar() { gravar('ae_u', U); }

  // ---------- utilidades ----------
  function h(tag, attrs) {
    var e = document.createElement(tag);
    var a = attrs || {};
    Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (k === 'class') e.className = v;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) add(e, arguments[i]);
    return e;
  }
  function add(e, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(e, x); }); return; }
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  function embaralhar(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function unicos(arr) { return arr.filter(function (x, i) { return arr.indexOf(x) === i; }); }
  function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'").replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ').trim(); }
  function falar(txt) {
    if (!temFala) return;
    try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(txt); u.lang = 'en-US'; u.rate = 0.9; speechSynthesis.speak(u); } catch (e) { /* ignora */ }
  }
  function pararFala() { if (temFala) { try { speechSynthesis.cancel(); } catch (e) { /* ok */ } } }
  function hora(ms) { var d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function dataBr(ms) { var d = new Date(ms); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); }
  function contagem(ms) {
    var s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    return d ? d + 'd ' + hh + 'h' : (hh ? hh + 'h ' + m + 'min' : m + ' min');
  }
  var desvio = 0; // diferença entre o relógio do servidor e o do aparelho
  function agoraSrv() { return Date.now() + desvio; }

  var TODAS_PALAVRAS = [];
  CURSO.forEach(function (u) { u.lessons.forEach(function (l) { l.words.forEach(function (w) { TODAS_PALAVRAS.push(w); }); }); });

  // ---------- servidor ----------
  function api(metodo, caminho, corpo) {
    return fetch(caminho, { method: metodo, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: corpo ? JSON.stringify(corpo) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.ok) return j;
          var e = new Error(j.erro || 'Erro inesperado'); e.status = r.status;
          if (r.status === 401 && U) { U = null; guardar(); render(); }
          throw e;
        });
      }, function () { var e = new Error('Sem conexão com a internet'); e.status = 0; throw e; });
  }
  function aplicar(u) {
    if (u && u.agora) desvio = u.agora - Date.now();
    U = u; offline = false; guardar();
    if (pilulaLicao) pilulaLicao();
    return u;
  }
  function aviso(txt, ruim) {
    var el = h('div', { class: 'aviso' + (ruim ? ' ruim' : '') }, txt);
    document.body.append(el);
    setTimeout(function () { el.remove(); }, 3200);
  }
  function falha(e) { aviso(e.message, true); }
  // avatar: foto aprovada (se houver) ou emoji
  function av(p, extra) {
    var el = h('div', { class: 'av' + (extra ? ' ' + extra : '') + (p.moldura ? ' m-' + p.moldura : '') });
    if (p.foto) el.append(h('img', { src: '/api/midia/' + p.foto, alt: p.nome || 'foto', loading: 'lazy' }));
    else el.append(p.avatar || '🙂');
    return el;
  }
  function M() { return window.Mods || {}; }

  function enviarPendentes() {
    var lista = ler('ae_pend', []);
    if (!lista.length) return;
    var p = lista.shift();
    api('POST', '/api/missao/concluir', p).then(function (u) { gravar('ae_pend', lista); aplicar(u); enviarPendentes(); render(); })
      .catch(function (e) { if (e.status && e.status !== 401) { gravar('ae_pend', lista); enviarPendentes(); } });
  }

  // ---------- estrutura geral ----------
  var raiz = document.getElementById('app');
  function limparTimer() { if (timerTela) { clearInterval(timerTela); timerTela = null; } }

  function energiaTxt() { return U.pro ? '⚡ ∞' : '⚡ ' + U.energia + '/' + U.maxEnergia; }
  function topo() {
    return h('header', { class: 'topo' },
      h('div', { class: 'marca' }, h('div', { class: 'as' }, 'AS'), 'Aldemar English', U.pro ? h('span', { class: 'etiqueta' }, 'PRO') : null),
      h('div', { class: 'chips' },
        h('button', { class: 'chip energia' + (!U.pro && U.energia === 0 ? ' zero' : ''), 'aria-label': 'Energia', onclick: folhaEnergia }, energiaTxt()),
        h('button', { class: 'chip', title: 'Moedas — abrir a loja', 'aria-label': 'Moedas, abrir a loja', onclick: function () { tela = 'loja'; render(); window.scrollTo(0, 0); } }, '🪙 ' + U.gemas),
        h('span', { class: 'chip', title: 'Sequência de dias' }, '🔥 ' + U.streak)));
  }
  function nav() {
    var ativoCom = tela === 'comunidade' || tela === 'ranking';
    function b(id, ic, t, ponto) { return h('button', { class: (id === 'comunidade' ? ativoCom : tela === id) ? 'ativo' : '', 'aria-label': t, onclick: function () { tela = id; if (id === 'comunidade') subCom = 'geral'; render(); window.scrollTo(0, 0); } }, h('span', {}, ic), t, ponto ? h('i', { class: 'ponto' }) : null); }
    return h('nav', { class: 'nav' }, b('jornada', '🧭', 'Jornada'), b('estudos', '📚', 'Estudos'), b('historias', '📖', 'História'), b('posts', '📸', 'Posts'), b('comunidade', '💬', 'Turma', temDm), b('perfil', '👤', 'Perfil'));
  }
  // abas da Turma: Ranking, Sala geral e Conversas
  function abasTurma(ativa) {
    return h('div', { class: 'seg tres' },
      h('button', { class: ativa === 'ranking' ? 'ativo' : '', onclick: function () { tela = 'ranking'; render(); } }, '🏆 Ranking'),
      h('button', { class: ativa === 'geral' ? 'ativo' : '', onclick: function () { tela = 'comunidade'; subCom = 'geral'; render(); } }, 'Sala geral'),
      h('button', { class: ativa === 'conversas' ? 'ativo' : '', onclick: function () { tela = 'comunidade'; marcarDmVisto(); subCom = 'conversas'; render(); } }, 'Conversas', temDm ? h('i', { class: 'ponto' }) : null));
  }
  function render() {
    pararFala(); limparTimer();
    raiz.replaceChildren();
    if (!U) { raiz.append(telaAuth()); return; }
    var main = h('main');
    if (tela === 'jornada') main.append(telaJornada());
    else if (tela === 'ranking') telaRanking(main);
    else if (tela === 'estudos') M().estudos.tela(main);
    else if (tela === 'historias') M().historias.tela(main);
    else if (tela === 'loja') M().loja.tela(main);
    else if (tela === 'posts') M().posts.tela(main);
    else if (tela === 'visita') M().perfil.tela(main, visitaId, function () { tela = voltarPara; render(); });
    else if (tela === 'comunidade') telaComunidade(main);
    else if (tela === 'painel') telaPainel(main);
    else main.append(telaPerfil());
    raiz.append(topo());
    if (offline) raiz.append(h('div', { class: 'aviso-rede' }, 'Sem internet: você pode estudar; o resto volta quando a conexão voltar.'));
    raiz.append(main, nav());
    if (!U.aceitou && !regrasAbertas) { regrasAbertas = true; M().mod.folhaRegras(false, function () { regrasAbertas = false; }); }
  }
  var regrasAbertas = false;

  // ---------- janelas (folhas) ----------
  function folha(conteudo) {
    var fundo = h('div', { class: 'vidro', onclick: function (e) { if (e.target === fundo) fechar(); } }, h('div', { class: 'folha' }, conteudo));
    function fechar() { fundo.remove(); }
    document.body.append(fundo);
    return fechar;
  }

  function folhaEnergia() {
    var fechar;
    var c = h('div', {}, h('h3', {}, '⚡ Energia'),
      h('p', { class: 'mudo', style: 'margin:0 0 8px' }, U.pro
        ? 'Você é Aldemar Pro: sua energia nunca acaba.'
        : 'Cada resposta errada gasta 1 de energia. Ela volta sozinha: 1 a cada 20 minutos.'));
    if (!U.pro) {
      c.append(h('div', { class: 'card', style: 'margin:0 0 10px' }, h('div', { class: 'num' }, energiaTxt()),
        U.proxima ? h('div', { class: 'mudo peq' }, 'Próxima energia em ' + contagem(U.proxima - agoraSrv())) : h('div', { class: 'mudo peq' }, 'Energia cheia!')));
      c.append(h('div', { class: 'opcoes-f' },
        h('button', { class: 'btn ouro', disabled: U.energia >= U.maxEnergia || U.gemas < 20, onclick: function () {
          api('POST', '/api/energia/recarregar').then(function (u) { aplicar(u); fechar(); render(); aviso('Energia recarregada!'); }).catch(falha);
        } }, 'Recarregar tudo por 20 🪙'),
        h('button', { class: 'btn sec', onclick: function () { fechar(); tela = 'loja'; render(); } }, '🛍️ Ver a loja'),
        h('button', { class: 'btn sec', onclick: function () { fechar(); tela = 'comunidade'; subCom = 'geral'; render(); } }, 'Pedir energia aos colegas'),
        h('button', { class: 'btn', onclick: function () { fechar(); tela = 'perfil'; render(); } }, 'Conhecer o Aldemar Pro')));
    } else c.append(h('button', { class: 'btn sec', onclick: function () { fechar(); } }, 'Fechar'));
    fechar = folha(c);
  }

  function abrirPerfil(id) {
    if (id === (U && U.id)) { tela = 'perfil'; render(); window.scrollTo(0, 0); return; }
    if (tela !== 'visita') voltarPara = tela === 'painel' ? 'painel' : tela;
    visitaId = id; tela = 'visita'; if (licaoEl) return; render(); window.scrollTo(0, 0);
  }
  function folhaPessoa(id) { abrirPerfil(id); }
  function conversar(p) { tela = 'comunidade'; subCom = 'conversa'; conversaCom = p; render(); window.scrollTo(0, 0); }

  // ---------- autenticação ----------
  function telaAuth() {
    var modo = 'entrar', avatar = AVATARES[0];
    var nome = h('input', { type: 'text', placeholder: 'Seu nome (3 a 20 letras)', maxlength: '20', autocomplete: 'username' });
    var senha = h('input', { type: 'password', placeholder: 'Senha (mínimo 6)', autocomplete: 'current-password' });
    var turma = h('input', { type: 'password', placeholder: 'Chave da turma (dada pelo professor)', autocomplete: 'off' });
    var chaveProf = h('input', { type: 'password', placeholder: 'Chave do professor', autocomplete: 'off', style: 'display:none' });
    var ehProf = false;
    var linkProf = h('button', { type: 'button', class: 'voltar', style: 'margin-top:8px' }, 'Sou o professor');
    linkProf.addEventListener('click', function () { ehProf = !ehProf; desenhar(); if (ehProf) chaveProf.focus(); });
    var msg = h('div', { class: 'erro' });
    var aceite = h('input', { type: 'checkbox' });
    var aceiteL = h('label', { class: 'aceite' }, aceite, h('span', {}, 'Li e aceito as regras da comunidade'), h('button', { type: 'button', class: 'link', onclick: function (e) { e.preventDefault(); M().mod.folhaRegras(true); } }, 'ver regras'));
    var av = h('div', { class: 'avatares' });
    var btn = h('button', { class: 'btn' }, 'Entrar');
    var abaE = h('button', { class: 'ativo' }, 'Entrar'), abaC = h('button', {}, 'Criar conta');
    function desenhar() {
      abaE.className = modo === 'entrar' ? 'ativo' : ''; abaC.className = modo === 'criar' ? 'ativo' : '';
      btn.textContent = modo === 'entrar' ? 'Entrar' : 'Criar minha conta';
      av.style.display = modo === 'criar' ? 'grid' : 'none';
      aceiteL.style.display = modo === 'criar' ? 'flex' : 'none';
      turma.style.display = (modo === 'criar' && !ehProf) ? 'block' : 'none';
      chaveProf.style.display = ehProf ? 'block' : 'none';
      linkProf.textContent = ehProf ? 'Não sou o professor' : 'Sou o professor';
      senha.setAttribute('autocomplete', modo === 'criar' ? 'new-password' : 'current-password');
      av.replaceChildren();
      AVATARES.forEach(function (a) { av.append(h('button', { type: 'button', class: a === avatar ? 'sel' : '', onclick: function () { avatar = a; desenhar(); } }, a)); });
      msg.textContent = '';
    }
    abaE.addEventListener('click', function () { modo = 'entrar'; desenhar(); });
    abaC.addEventListener('click', function () { modo = 'criar'; desenhar(); });
    function enviar() {
      if (modo === 'criar' && !aceite.checked) { msg.textContent = 'Para criar a conta, aceite as regras da comunidade.'; return; }
      btn.disabled = true; msg.textContent = '';
      api('POST', modo === 'entrar' ? '/api/entrar' : '/api/cadastro', { nome: nome.value, senha: senha.value, avatar: avatar, chaveTurma: turma.value, chaveProfessor: ehProf ? chaveProf.value : '', aceito: aceite.checked })
        .then(function (u) { aplicar(u); tela = 'jornada'; render(); iniciarPolling(); enviarPendentes(); if (M().notif) M().notif.sincronizar(); })
        .catch(function (e) { msg.textContent = e.message; btn.disabled = false; });
    }
    btn.addEventListener('click', enviar);
    senha.addEventListener('keydown', function (e) { if (e.key === 'Enter') enviar(); });
    var el = h('div', { class: 'auth' },
      h('div', { class: 'logo' }, 'AS'), h('h1', {}, 'Aldemar English'),
      h('p', { class: 'mudo' }, 'Estude inglês em missões curtas, suba no ranking da turma e converse com os colegas.'),
      h('div', { class: 'abas' }, abaE, abaC), nome, h('div', { class: 'espaco' }), senha, h('div', { class: 'espaco' }), turma, chaveProf, av, aceiteL, msg, btn, linkProf,
      h('p', { class: 'dica' }, 'Dica: use o mesmo nome e senha em qualquer aparelho para continuar de onde parou.'));
    desenhar();
    return el;
  }

  // ---------- jornada ----------
  function chaveMissao(u, i) { return u.lessons[i].k; }
  var secaoSel = 0, capAberto = null;
  function telaJornada() {
    var wrap = h('div');
    wrap.append(h('div', { class: 'saudacao' }, h('h2', {}, 'Olá, ' + U.nome + '! ' + U.avatar), h('div', { class: 'mudo' }, 'Nível ' + (Math.floor(U.xp / 100) + 1) + ' · ' + U.xp + ' pontos · meta de hoje ' + Math.min(U.xpHoje, 50) + '/50')));
    if (M().desafios) wrap.append(M().desafios.cartao());
    var SEC = window.SECOES;
    // lição atual = primeira ainda não feita, na ordem do curso
    var atualK = null, secAtual = 1, capAtual = null;
    for (var ci = 0; ci < CURSO.length && !atualK; ci++) for (var li = 0; li < CURSO[ci].lessons.length; li++) { if (!U.progresso[CURSO[ci].lessons[li].k]) { atualK = CURSO[ci].lessons[li].k; secAtual = CURSO[ci].secao; capAtual = CURSO[ci].id; break; } }
    if (!secaoSel) secaoSel = secAtual;
    function resumoSecao(sc) {
      var f = 0, t = 0;
      sc.capitulos.forEach(function (c) { c.lessons.forEach(function (l) { t++; if (U.progresso[l.k]) f++; }); });
      return { f: f, t: t };
    }
    var tiras = h('div', { class: 'secoes' });
    SEC.forEach(function (sc) {
      var r = resumoSecao(sc);
      tiras.append(h('button', { class: 'sec-chip' + (sc.n === secaoSel ? ' sel' : ''), 'aria-label': 'Seção ' + sc.n, onclick: function () { secaoSel = sc.n; capAberto = null; render(); } },
        h('b', {}, String(sc.n)), h('small', {}, sc.nivel), r.t && r.f === r.t ? h('i', { class: 'ok' }, '✓') : null));
    });
    wrap.append(tiras);
    var sc = SEC[secaoSel - 1], rs = resumoSecao(sc), prontos = sc.capitulos.filter(function (c) { return c.lessons.length; }).length;
    wrap.append(h('div', { class: 'secao-cab', style: '--cor:' + CORES_SEC[(secaoSel - 1) % CORES_SEC.length] },
      h('div', {}, h('small', {}, 'Seção ' + sc.n + ' · nível ' + sc.nivel), h('h3', {}, sc.titulo)),
      h('div', { class: 'mudo peq' }, rs.f + ' de ' + rs.t + ' lições feitas · ' + prontos + ' de 30 capítulos liberados'),
      h('div', { class: 'fino' }, h('i', { style: 'width:' + (rs.t ? Math.round(rs.f / rs.t * 100) : 0) + '%' }))));
    var abrir = capAberto || (sc.n === secAtual ? capAtual : null);
    sc.capitulos.forEach(function (u) {
      var tem = u.lessons.length > 0;
      var feitas = u.lessons.filter(function (l) { return U.progresso[l.k]; }).length;
      var aberto = tem && abrir === u.id;
      var cartao = h('section', { class: 'capitulo' + (tem ? '' : ' breve') + (aberto ? ' aberto' : ''), style: '--cor:' + u.cor },
        h('button', { class: 'cap-topo', disabled: !tem, 'aria-expanded': aberto ? 'true' : 'false', onclick: function () { capAberto = aberto ? '-' : u.id; render(); } },
          h('div', { class: 'linha' }, h('div', {}, h('small', {}, 'Capítulo ' + u.num), h('h3', {}, u.titulo)), h('span', { class: 'em' }, u.emoji)),
          tem ? h('div', { class: 'cap-prog' }, h('div', { class: 'fino' }, h('i', { style: 'width:' + Math.round(feitas / u.lessons.length * 100) + '%' })), h('small', { class: 'mudo' }, feitas + '/' + u.lessons.length)) : h('small', { class: 'mudo' }, 'Em breve')));
      if (aberto) {
        if (window.TEORIA && window.TEORIA[u.id]) cartao.append(h('button', { class: 'teoria-btn', onclick: function () { M().teoria.folha(u.id); } }, '📖 Teoria do capítulo'));
        var tr = h('div', { class: 'trilho' });
        u.lessons.forEach(function (l, i) {
          var k = l.k, selos = U.progresso[k] || 0, atual = k === atualK, bloq = !selos && !atual;
          tr.append(h('button', { class: 'missao' + (selos ? ' feita' : '') + (atual ? ' atual' : ''), disabled: bloq, onclick: function () { if (i === 0 && !selos && M().teoria) M().teoria.antes(u.id, function () { comecar(l, k); }); else comecar(l, k); } },
            h('div', { class: 'n' }, String(i + 1)),
            h('div', { class: 'tx' }, h('b', {}, l.titulo), h('small', {}, l.words.length + ' palavras · ' + l.phrases.length + ' frases')),
            selos ? h('span', { class: 'selos' }, '●'.repeat(selos) + '○'.repeat(3 - selos)) : (bloq ? '🔒' : h('span', { class: 'ir' }, 'Iniciar'))));
        });
        cartao.append(tr);
      }
      wrap.append(cartao);
    });
    return wrap;
  }
  var CORES_SEC = ['#35a7ff', '#3ee58b', '#ffd45a', '#a56bff', '#ff5575', '#38bdf8', '#f59e0b', '#ec4899', '#22c55e', '#6366f1'];
  function comecar(lic, chave) {
    if (!U.pro && U.energia <= 0) { folhaSemEnergia(); return; }
    iniciar(lic, chave);
  }
  function folhaSemEnergia(aposFalha) {
    var fechar;
    fechar = folha(h('div', {}, h('h3', {}, '⚡ Sua energia acabou'),
      h('p', { class: 'mudo' }, 'Errar faz parte! Escolha como continuar agora, ou volte em ' + (U.proxima ? contagem(U.proxima - agoraSrv()) : 'alguns minutos') + ' quando ela voltar.'),
      h('div', { class: 'opcoes-f' },
        h('button', { class: 'btn ouro', disabled: U.gemas < 20, onclick: function () { api('POST', '/api/energia/recarregar').then(function (u) { aplicar(u); fechar(); aviso('Energia cheia! Boa missão.'); if (!aposFalha) render(); }).catch(falha); } }, 'Recarregar por 20 🪙 (você tem ' + U.gemas + ')'),
        h('button', { class: 'btn sec', onclick: function () { fechar(); sairLicao(); tela = 'comunidade'; subCom = 'geral'; render(); } }, 'Pedir energia aos colegas'),
        h('button', { class: 'btn', onclick: function () { fechar(); sairLicao(); tela = 'perfil'; render(); } }, 'Aldemar Pro: energia ilimitada'),
        h('button', { class: 'btn sec', onclick: function () { fechar(); } }, 'Agora não'))));
  }

  // ---------- ranking ----------
  function telaRanking(main) {
    var corpo = h('div', {}, h('p', { class: 'mudo' }, 'Carregando…'));
    var seg = h('div', { class: 'seg' },
      h('button', { class: rankTipo === 'semana' ? 'ativo' : '', onclick: function () { rankTipo = 'semana'; render(); } }, 'Da semana'),
      h('button', { class: rankTipo === 'total' ? 'ativo' : '', onclick: function () { rankTipo = 'total'; render(); } }, 'Geral'));
    main.append(abasTurma('ranking'), seg, corpo);
    api('GET', '/api/ranking?tipo=' + rankTipo).then(function (r) {
      corpo.replaceChildren();
      corpo.append(h('p', { class: 'mudo peq', style: 'margin-top:0' }, rankTipo === 'semana'
        ? 'Quem mais pontua até domingo. Termina em ' + contagem(r.terminaEm - agoraSrv()) + '. Você está em ' + r.minhaPosicao + 'º com ' + r.meusPontos + ' pontos.'
        : 'Pontos de todos os tempos. Você está em ' + r.minhaPosicao + 'º.'));
      if (!r.lista.length) corpo.append(h('div', { class: 'card' }, 'Ninguém pontuou ainda. Faça uma missão e abra o ranking!'));
      r.lista.forEach(function (p, i) {
        corpo.append(h('button', { class: 'linha-r' + (p.id === U.id ? ' eu' : ''), onclick: function () { folhaPessoa(p.id); } },
          h('div', { class: 'pos' + (i < 3 ? ' p' + (i + 1) : '') }, i < 3 ? ['🥇', '🥈', '🥉'][i] : String(i + 1)),
          av(p),
          h('div', { class: 'nm' }, p.nome, p.pro ? h('span', { class: 'etiqueta' }, 'PRO') : null, p.professor ? h('span', { class: 'etiqueta prof' }, 'PROF') : null),
          h('div', { class: 'pt' }, (rankTipo === 'semana' ? p.xpSemana : p.xp) + ' pts')));
      });
    }).catch(function (e) { corpo.replaceChildren(h('div', { class: 'card' }, e.status === 0 ? 'Conecte-se à internet para ver o ranking.' : e.message)); });
  }

  // ---------- comunidade ----------
  function marcarDmVisto() { gravar('ae_dm_visto', Date.now()); temDm = false; }
  function telaComunidade(main) {
    if (subCom === 'conversa' && conversaCom) { telaConversa(main); return; }
    var seg = abasTurma(subCom);
    main.append(seg);
    if (subCom === 'geral') {
      main.append(h('p', { class: 'mudo peq', style: 'margin-top:0' }, 'Sala da turma. Escreva em inglês para praticar! Links não são permitidos e o professor modera.'));
      montarChat(main, '/api/chat', '/api/chat');
    } else {
      marcarDmVisto();
      var lista = h('div', {}, h('p', { class: 'mudo' }, 'Carregando…'));
      var res = h('div'); var busca = h('input', { type: 'text', placeholder: 'Procurar colega pelo nome…' }); var t = null;
      busca.addEventListener('input', function () {
        clearTimeout(t); t = setTimeout(function () {
          if (busca.value.trim().length < 2) { res.replaceChildren(); return; }
          api('GET', '/api/pessoas?q=' + encodeURIComponent(busca.value)).then(function (ps) {
            res.replaceChildren(); ps.filter(function (p) { return p.id !== U.id; }).forEach(function (p) {
              res.append(h('button', { class: 'conv', onclick: function () { conversaCom = p; subCom = 'conversa'; render(); } }, av(p), h('div', {}, h('b', {}, p.nome), h('div', { class: 'ult' }, p.xp + ' pontos'))));
            });
            if (!res.children.length) res.append(h('p', { class: 'mudo peq' }, 'Ninguém encontrado.'));
          }).catch(function () { /* ignora */ });
        }, 300);
      });
      main.append(busca, h('div', { class: 'espaco' }), res, h('h3', { style: 'margin:14px 0 8px' }, 'Suas conversas'), lista);
      api('GET', '/api/conversas').then(function (cs) {
        lista.replaceChildren();
        if (!cs.length) lista.append(h('p', { class: 'mudo' }, 'Nenhuma conversa ainda. Procure um colega acima ou toque num nome no ranking.'));
        cs.forEach(function (c) {
          lista.append(h('button', { class: 'conv', onclick: function () { conversaCom = c.com; subCom = 'conversa'; render(); } },
            av(c.com), h('div', {}, h('b', {}, c.com.nome), h('div', { class: 'ult' }, (c.minha ? 'Você: ' : '') + c.ultimo))));
        });
      }).catch(function (e) { lista.replaceChildren(h('p', { class: 'mudo' }, e.status === 0 ? 'Sem internet.' : e.message)); });
    }
  }
  function telaConversa(main) {
    main.append(h('button', { class: 'voltar', onclick: function () { subCom = 'conversas'; render(); } }, '← Conversas'),
      h('div', { class: 'topo-f', style: 'display:flex;gap:10px;align-items:center;margin-bottom:8px' },
        h('button', { class: 'semfundo', onclick: function () { abrirPerfil(conversaCom.id); } }, av(conversaCom)), h('h2', { style: 'flex:1;margin:0' }, conversaCom.nome),
        h('button', { class: 'btn sec mini', 'aria-label': 'Chamada de áudio', onclick: function () { M().chamada.ligar(conversaCom, 'audio'); } }, '📞'),
        h('button', { class: 'btn sec mini', 'aria-label': 'Chamada de vídeo', onclick: function () { M().chamada.ligar(conversaCom, 'video'); } }, '🎥')));
    montarChat(main, '/api/conversa/' + conversaCom.id, '/api/conversa/' + conversaCom.id);
  }
  function montarChat(main, urlGet, urlPost) {
    var caixa = h('div', { class: 'chat' }, h('p', { class: 'mudo' }, 'Carregando…'));
    var inp = h('input', { type: 'text', placeholder: 'Escreva sua mensagem…', maxlength: '300', autocomplete: 'off' });
    var ultimo = 0, vazio = true;
    var grav = M().midia.gravador(function (id) { return api('POST', urlPost, { tipo: 'audio', midia: id }).then(function (m) { receber([m], true); }); });
    function bolha(m) {
      var minha = m.de.id === U.id;
      var meta = h('div', { class: 'meta' }, h('span', {}, hora(m.criado)),
        (minha || U.professor) ? h('button', { onclick: function () { api('DELETE', '/api/mensagem/' + m.id).then(function () { el.remove(); }).catch(falha); } }, 'apagar')
          : h('button', { onclick: function () { M().mod.folhaDenuncia('msg', m.id, function () { el.remove(); }); } }, 'denunciar'));
      var conteudo;
      if (m.tipo === 'audio') {
        var au = h('audio', { controls: 'controls', preload: 'none', src: '/api/midia/' + m.midia });
        var nota = h('div', { class: 'mudo peq' });
        au.addEventListener('error', function () { au.style.display = 'none'; nota.textContent = 'Áudio expirado (apagado após 30 dias).'; });
        conteudo = h('div', { class: 'txt audio' }, au, nota);
      } else if (m.tipo === 'foto') {
        var im = h('img', { src: '/api/midia/' + m.midia, alt: 'foto', loading: 'lazy' });
        var env = h('div', { class: 'foto-chat' + (minha ? '' : ' borrada'), onclick: function () { env.classList.remove('borrada'); } }, im, minha ? null : h('span', { class: 'ver' }, 'Toque para ver'));
        im.addEventListener('error', function () { env.replaceChildren(h('div', { class: 'mudo peq' }, 'Foto removida.')); });
        conteudo = h('div', { class: 'txt audio' }, env);
      } else conteudo = h('div', { class: 'txt' }, m.texto);
      var el = h('div', { class: 'bolha' + (minha ? ' minha' : '') },
        h('button', { class: 'semfundo', onclick: function () { folhaPessoa(m.de.id); } }, av(m.de)),
        h('div', { class: 'corpo' }, minha ? null : h('div', { class: 'quem' }, m.de.nome, m.de.pro ? h('span', { class: 'etiqueta' }, 'PRO') : null, m.de.professor ? h('span', { class: 'etiqueta prof' }, 'PROF') : null), conteudo, meta));
      return el;
    }
    function receber(msgs, rolar) {
      if (!msgs.length) { if (vazio && !caixa.querySelector('.bolha')) { caixa.replaceChildren(h('p', { class: 'mudo' }, 'Nenhuma mensagem ainda. Diga "Hello!" 👋')); } return; }
      if (vazio) { caixa.replaceChildren(); vazio = false; }
      msgs.forEach(function (m) { if (m.id > ultimo) ultimo = m.id; caixa.append(bolha(m)); });
      if (rolar) window.scrollTo(0, document.body.scrollHeight);
    }
    function enviar() {
      var t = inp.value.trim(); if (!t) return; inp.value = '';
      api('POST', urlPost, { texto: t }).then(function (m) { receber([m], true); }).catch(function (e) { inp.value = t; falha(e); });
    }
    var arq = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    arq.addEventListener('change', function () {
      var f = arq.files && arq.files[0]; arq.value = ''; if (!f) return;
      aviso('Enviando foto…');
      M().midia.processarImagem(f, 1024, false, 0.78).then(function (b) { return M().midia.enviar('chatfoto', b); })
        .then(function (r) { return api('POST', urlPost, { tipo: 'foto', midia: r.id }); }).then(function (m) { receber([m], true); }).catch(falha);
    });
    var btnFoto = h('button', { class: 'btn sec mini mic', 'aria-label': 'Enviar foto', onclick: function () { arq.click(); } }, '📷');
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') enviar(); });
    main.append(caixa, h('div', { class: 'envio' }, arq, btnFoto, grav, inp, h('button', { class: 'btn', onclick: enviar }, 'Enviar')));
    api('GET', urlGet).then(function (ms) { receber(ms, true); }).catch(function (e) { caixa.replaceChildren(h('p', { class: 'mudo' }, e.status === 0 ? 'Conecte-se à internet para conversar.' : e.message)); });
    timerTela = setInterval(function () {
      api('GET', urlGet + '?depois=' + ultimo).then(function (ms) {
        var novas = ms.filter(function (m) { return m.id > ultimo; });
        if (novas.length) { var fundo = window.innerHeight + window.scrollY >= document.body.scrollHeight - 140; receber(novas, fundo); }
      }).catch(function () { /* tenta de novo */ });
    }, 4000);
  }

  // ---------- perfil ----------
  var CONQUISTAS = [
    { ic: '🎯', t: 'Primeira missão', d: 'Conclua 1 missão', ok: function () { return Object.keys(U.progresso).length >= 1; } },
    { ic: '🔥', t: 'Em chamas', d: '3 dias seguidos', ok: function () { return U.streak >= 3; } },
    { ic: '⭐', t: '100 pontos', d: 'Ganhe 100 pontos', ok: function () { return U.xp >= 100; } },
    { ic: '💎', t: 'Sem erros', d: 'Missão com 3 selos', ok: function () { return Object.keys(U.progresso).some(function (k) { return U.progresso[k] === 3; }); } },
    { ic: '📚', t: 'Capítulo completo', d: 'Termine um capítulo', ok: function () { return CURSO.some(function (u) { return u.lessons.every(function (l) { return U.progresso[l.k]; }); }); } },
    { ic: '🚀', t: '500 pontos', d: 'Ganhe 500 pontos', ok: function () { return U.xp >= 500; } },
  ];
  function telaPerfil() {
    var total = 0, feitas = 0;
    CURSO.forEach(function (u) { u.lessons.forEach(function (l) { total++; if (U.progresso[l.k]) feitas++; }); });
    var topoP = h('div', { class: 'card' });
    M().perfil.montar(topoP, U.id);
    var c = h('div', {}, topoP,
      h('div', { class: 'grade' },
        h('div', { class: 'card' }, h('div', { class: 'num' }, '🔥 ' + U.streak), h('div', { class: 'mudo peq' }, 'dias seguidos')),
        h('div', { class: 'card' }, h('div', { class: 'num' }, '⭐ ' + U.xp), h('div', { class: 'mudo peq' }, 'pontos')),
        h('div', { class: 'card' }, h('div', { class: 'num' }, '🪙 ' + U.gemas), h('div', { class: 'mudo peq' }, 'moedas')),
        h('div', { class: 'card' }, h('div', { class: 'num' }, '📘 ' + feitas + '/' + total), h('div', { class: 'mudo peq' }, 'missões'))),
      cartaoPro(),
      M().notif ? M().notif.cartao() : null,
      h('div', { class: 'card' }, h('h3', {}, 'Como ganhar moedas'), h('p', { class: 'mudo', style: 'margin:0 0 10px' }, 'Missões (5, ou 8 com 3 selos), materiais de Estudos, Histórias e desafios do dia. Gaste na loja: energia, proteção de sequência, pontos em dobro e molduras.'), h('button', { class: 'btn ouro', onclick: function () { tela = 'loja'; render(); window.scrollTo(0, 0); } }, '🛍️ Abrir a loja')),
      h('div', { class: 'card' }, h('h3', {}, 'Conquistas'),
        CONQUISTAS.map(function (q) { return h('div', { class: 'conq' + (q.ok() ? '' : ' off') }, h('div', { class: 'ic' }, q.ic), h('div', {}, h('b', {}, q.t), h('div', { class: 'mudo peq' }, q.d))); })),
      U.professor ? h('button', { class: 'btn', onclick: function () { tela = 'painel'; render(); } }, '🎓 Painel do professor') : null,
      h('button', { class: 'link', onclick: function () { M().mod.folhaRegras(true); } }, '🛡️ Regras da comunidade'),
      h('div', { class: 'espaco' }),
      h('button', { class: 'btn sec', onclick: function () { api('POST', '/api/sair').finally(function () { U = null; guardar(); gravar('ae_pend', []); render(); }); } }, 'Sair da conta'),
      h('p', { class: 'dica' }, 'Suas missões e pontos ficam salvos na sua conta.'));
    return c;
  }
  function folhaAvatar() { M().midia.folhaFoto(); }
  function cartaoPro() {
    var c = h('div', { class: 'card pro-card' });
    if (U.pro) {
      c.append(h('h3', {}, '💜 Aldemar Pro ativo'), h('p', { style: 'margin:0' }, 'Energia ilimitada até ' + dataBr(U.proAte) + '. Obrigado por apoiar!'));
      return c;
    }
    var cod = h('input', { type: 'text', placeholder: 'Código Pro (ex.: AE-1A2B-3C4D)', autocapitalize: 'characters' });
    var info = h('p', { class: 'mudo peq' }, '');
    c.append(h('h3', {}, '💜 Aldemar Pro'),
      h('ul', {}, h('li', {}, 'Energia ilimitada: erre sem medo'), h('li', {}, 'Etiqueta PRO no ranking e no chat'), h('li', {}, 'Ajude o projeto a continuar crescendo')),
      info, cod, h('div', { class: 'espaco' }),
      h('button', { class: 'btn', onclick: function () {
        api('POST', '/api/pro/resgatar', { codigo: cod.value }).then(function (u) { aplicar(u); render(); aviso('🎉 Aldemar Pro ativado!'); }).catch(falha);
      } }, 'Ativar com código'));
    api('GET', '/api/pro').then(function (p) { info.textContent = p.preco + '. ' + p.instrucoes; }).catch(function () { info.textContent = 'Fale com o seu professor para assinar.'; });
    return c;
  }
  // ---------- painel do professor ----------
  function telaPainel(main) {
    main.append(h('button', { class: 'voltar', onclick: function () { tela = 'perfil'; render(); } }, '← Perfil'), h('h2', {}, '🎓 Painel do professor'));
    var area = h('div', {}, h('p', { class: 'mudo' }, 'Carregando…'));
    main.append(area);
    function carregar() {
      api('GET', '/api/professor/painel').then(function (p) {
        area.replaceChildren();
        var dias = h('select', {}, [[30, '30 dias'], [90, '90 dias'], [180, '180 dias'], [365, '1 ano']].map(function (x) { return h('option', { value: x[0] }, x[1]); }));
        var qtd = h('select', {}, [1, 3, 5, 10].map(function (n) { return h('option', { value: n }, n + (n === 1 ? ' código' : ' códigos')); }));
        var novos = h('div');
        area.append(h('div', { class: 'card' }, h('h3', {}, 'Códigos Pro'),
          h('p', { class: 'mudo peq', style: 'margin-top:0' }, 'Depois que o aluno pagar, gere um código e envie para ele resgatar no Perfil.'),
          h('div', { style: 'display:flex;gap:8px' }, dias, qtd),
          h('div', { class: 'espaco' }),
          h('button', { class: 'btn', onclick: function () {
            api('POST', '/api/professor/codigos', { dias: Number(dias.value), qtd: Number(qtd.value) }).then(function (r) {
              novos.replaceChildren(); add(novos, [h('p', { class: 'mudo peq' }, 'Toque para copiar:'), r.codigos.map(function (c) { return h('button', { class: 'codigo', onclick: function () { try { navigator.clipboard.writeText(c); aviso('Copiado: ' + c); } catch (e) { aviso(c); } } }, c); })]);
            }).catch(falha);
          } }, 'Gerar códigos'), novos,
          p.codigos.filter(function (k) { return !k.usado; }).length ? h('div', {}, h('p', { class: 'mudo peq' }, 'Disponíveis (ainda não usados):'), p.codigos.filter(function (k) { return !k.usado; }).map(function (k) { return h('span', { class: 'codigo', title: k.dias + ' dias' }, k.codigo); })) : null));
        area.append(M().mod.cartaoPendentes(p, carregar), M().mod.cartaoDenuncias(p, carregar), M().live.cartaoPainel(p), M().desafios.cartaoProfessor(), M().mod.cartaoArmazenamento(p));
        area.append(h('div', { class: 'card' }, h('h3', {}, 'Alunos (' + p.alunos.length + ')'),
          p.alunos.map(function (a) {
            return h('div', { class: 'tabela-p' },
              h('div', { class: 'info' }, a.avatar + ' ', h('b', {}, a.nome), a.confiavel ? h('span', { class: 'etiqueta', style: 'background:var(--roxo)' }, '⭐') : null, a.pro ? h('span', { class: 'etiqueta' }, 'PRO') : null, a.banido ? h('span', { class: 'etiqueta', style: 'background:var(--coral)' }, 'SILENCIADO') : null,
                h('div', { class: 'mudo peq' }, a.xp + ' pts · 🔥 ' + a.streak + (a.visto ? ' · visto ' + dataBr(a.visto) : ''))),
              h('div', { class: 'acoes' },
                h('button', { class: 'btn sec mini', onclick: function () { api('POST', '/api/professor/confiavel', { id: a.id, confiavel: !a.confiavel }).then(function () { aviso(a.confiavel ? 'Removido de confiança.' : 'Aluno de confiança: publica sem aprovação prévia.'); carregar(); }).catch(falha); } }, a.confiavel ? '⭐ Tirar' : '☆ Confiar'),
                h('button', { class: 'btn sec mini', onclick: function () { api('POST', '/api/professor/pro', { id: a.id, dias: a.pro ? -1 : 30 }).then(function () { aviso(a.pro ? 'Pro removido.' : 'Pro ativado por 30 dias.'); carregar(); }).catch(falha); } }, a.pro ? 'Tirar Pro' : '+30d Pro'),
                h('button', { class: 'btn mini ' + (a.banido ? 'ciano' : 'sec'), onclick: function () { api('POST', '/api/professor/silenciar', { id: a.id, silenciar: !a.banido }).then(function () { aviso(a.banido ? 'Aluno reativado.' : 'Aluno silenciado.'); carregar(); }).catch(falha); } }, a.banido ? 'Reativar' : 'Silenciar')));
          })));
      }).catch(function (e) { area.replaceChildren(h('div', { class: 'card' }, e.message)); });
    }
    carregar();
  }

  // ---------- geração dos exercícios ----------
  function distratores(certa, idx, pool, n) {
    var base = unicos(pool.map(function (w) { return w[idx]; })).filter(function (x) { return x !== certa; });
    var extra = unicos(TODAS_PALAVRAS.map(function (w) { return w[idx]; })).filter(function (x) { return x !== certa && base.indexOf(x) < 0; });
    return embaralhar(base).concat(embaralhar(extra)).slice(0, n);
  }
  function gerar(lic) {
    var W = embaralhar(lic.words), P = lic.phrases.slice(), ex = [];
    W.slice(0, 4).forEach(function (w) { ex.push({ tipo: 'escolha', pergunta: 'O que significa “' + w[0] + '”?', falar: w[0], certa: w[1], opcoes: embaralhar([w[1]].concat(distratores(w[1], 1, lic.words, 3))) }); });
    W.slice(4, 6).forEach(function (w) { ex.push({ tipo: 'escolha', pergunta: 'Como se diz “' + w[1] + '” em inglês?', certa: w[0], opcoes: embaralhar([w[0]].concat(distratores(w[0], 0, lic.words, 3))) }); });
    if (W.length >= 4) ex.push({ tipo: 'pares', pares: W.slice(0, 4) });
    if (temFala) embaralhar(W).slice(0, 2).forEach(function (w) { ex.push({ tipo: 'ouvir', falar: w[0], certa: w[0], opcoes: embaralhar([w[0]].concat(distratores(w[0], 0, lic.words, 3))) }); });
    var d = embaralhar(W)[0];
    ex.push({ tipo: 'digitar', pergunta: 'Escreva em inglês: “' + d[1] + '”', certa: d[0] });
    P.forEach(function (p, i) {
      var rev = i === 2, origem = rev ? p[0] : p[1], alvo = rev ? p[1] : p[0], tokens = alvo.split(' '), idx = rev ? 1 : 0, outros = [];
      lic.phrases.forEach(function (q) { if (q !== p) q[idx].split(' ').forEach(function (t) { outros.push(t); }); });
      TODAS_PALAVRAS.forEach(function (w) { outros.push(w[idx]); });
      var extra = unicos(embaralhar(outros)).filter(function (t) { return tokens.map(norm).indexOf(norm(t)) < 0 && t.indexOf(' ') < 0; }).slice(0, 2);
      ex.push({ tipo: 'montar', pergunta: rev ? 'Traduza para o português' : 'Traduza para o inglês', origem: origem, falarOrigem: rev ? p[0] : null, alvo: tokens, banco: embaralhar(tokens.concat(extra)) });
    });
    return embaralhar(ex);
  }

  // ---------- missão em andamento ----------
  var licaoEl = null;
  function sairLicao() { pararFala(); if (licaoEl) { licaoEl.remove(); licaoEl = null; } pilulaLicao = null; document.body.style.overflow = ''; }

  function iniciar(lic, chave) {
    var fila = gerar(lic), total = fila.length, feitos = 0, erros = 0, xp = 0, ctx;
    var segs = fila.map(function () { return h('i'); });
    var pil = h('span', { class: 'chip energia' }, energiaTxt());
    var corpo = h('div', { class: 'licao-corpo' }), rodape = h('div', { class: 'licao-rodape' });
    licaoEl = h('div', { class: 'licao' },
      h('div', { class: 'licao-topo' }, h('button', { class: 'fechar', 'aria-label': 'Sair', onclick: sair }, '✕'), h('div', { class: 'segmentos' }, segs), pil), corpo, rodape);
    document.body.append(licaoEl); document.body.style.overflow = 'hidden';
    pilulaLicao = function () { pil.textContent = energiaTxt(); };

    function sair() { if (feitos > 0 && !confirm('Sair agora? Você perde o progresso desta missão.')) return; sairLicao(); render(); }
    function atualizar() { segs.forEach(function (s, i) { s.className = i < feitos ? 'f' : ''; }); pil.textContent = energiaTxt(); }
    function gastar() {
      if (U.pro) return;
      U.energia = Math.max(0, U.energia - 1); atualizar();
      api('POST', '/api/energia/gastar').then(aplicar).catch(function () { /* sem internet: vale o contador local */ });
    }
    function mostrar() {
      var ex = fila[0];
      ctx = { travado: false, checar: null };
      corpo.replaceChildren(); rodape.className = 'licao-rodape'; rodape.replaceChildren();
      var btn = h('button', { class: 'btn', disabled: true }, 'Conferir');
      ctx.habilitar = function (b) { btn.disabled = !b; };
      ctx.errouPar = function () { erros++; ex.falhou = true; gastar(); if (!U.pro && U.energia <= 0) falhou(); };
      ctx.concluirAuto = function () { resolver(true, ''); };
      btn.addEventListener('click', function () { var r = ctx.checar(); ctx.travado = true; resolver(r.ok, r.certa); });
      rodape.append(btn); corpo.append(desenhar(ex, ctx));
      var foco = corpo.querySelector('input'); if (foco) foco.focus();
    }
    function resolver(ok, certa) {
      var ex = fila[0]; ctx.travado = true; rodape.replaceChildren();
      if (ok) {
        feitos++; xp += ex.falhou ? 5 : 10; fila.shift(); rodape.className = 'licao-rodape ok';
        rodape.append(h('div', { class: 'msg' }, ['Isso aí! ✨', 'Correto! ✅', 'Mandou bem! 👏'][Math.floor(Math.random() * 3)]));
      } else {
        erros++; ex.falhou = true; fila.push(fila.shift()); gastar(); rodape.className = 'licao-rodape erro';
        rodape.append(h('div', { class: 'msg' }, 'Não foi dessa vez'), h('div', { class: 'det' }, 'Resposta certa: ' + certa));
      }
      atualizar();
      rodape.append(h('button', { class: 'btn ' + (ok ? 'ciano' : 'coral'), onclick: function () {
        if (!U.pro && U.energia <= 0) falhou(); else if (!fila.length) fim(); else mostrar();
      } }, 'Seguir'));
    }
    function falhou() {
      corpo.replaceChildren(h('div', { class: 'fim' }, h('div', { class: 'grande' }, '🔋'), h('h2', {}, 'Sua energia acabou'), h('p', { class: 'mudo' }, 'Sem problema! Recarregue, peça uma ajuda aos colegas ou volte em alguns minutos.')));
      rodape.className = 'licao-rodape'; rodape.replaceChildren(
        h('button', { class: 'btn', onclick: function () { folhaSemEnergia(true); } }, 'Ver opções'), h('div', { class: 'espaco' }),
        h('button', { class: 'btn sec', onclick: function () { sairLicao(); render(); } }, 'Voltar à jornada'));
    }
    function fim() {
      var bonus = erros === 0 ? 5 : 0; xp += bonus;
      var est = erros === 0 ? 3 : (erros <= 2 ? 2 : 1);
      var envio = { chave: chave, xp: chave ? xp : Math.round(xp / 2), estrelas: est };
      corpo.replaceChildren(h('div', { class: 'fim' }, h('p', { class: 'mudo' }, 'Salvando seu progresso…')));
      rodape.replaceChildren();
      function mostrarFim(ganhoXp, moedas, salvo) {
        segs.forEach(function (s) { s.className = 'f'; });
        corpo.replaceChildren(h('div', { class: 'fim' }, h('div', { class: 'grande' }, '🎉'), h('h2', {}, 'Missão cumprida!'),
          h('div', { style: 'font-size:30px;letter-spacing:6px;color:var(--ouro)' }, '●'.repeat(est) + '○'.repeat(3 - est)),
          h('div', { class: 'resumo' },
            h('div', {}, h('small', {}, 'Pontos'), '+' + ganhoXp), h('div', {}, h('small', {}, 'Moedas'), '+' + moedas),
            h('div', {}, h('small', {}, 'Acertos'), Math.round(total / (total + erros) * 100) + '%')),
          bonus ? h('p', { class: 'mudo' }, 'Bônus por não errar nada!') : null,
          salvo ? null : h('p', { class: 'mudo peq' }, 'Sem internet: vamos enviar seus pontos quando a conexão voltar.')));
        rodape.className = 'licao-rodape'; rodape.replaceChildren(h('button', { class: 'btn', onclick: function () { sairLicao(); render(); } }, 'Continuar'));
      }
      api('POST', '/api/missao/concluir', envio).then(function (u) { var g = u.ganhou || { xp: envio.xp, moedas: 0 }; aplicar(u); mostrarFim(g.xp, g.moedas, true); })
        .catch(function (e) {
          if (e.status === 0) {
            var p = ler('ae_pend', []); p.push(envio); gravar('ae_pend', p);
            U.xp += envio.xp; U.gemas += 5; if (chave) U.progresso[chave] = Math.max(U.progresso[chave] || 0, est); guardar();
            mostrarFim(envio.xp, 5, false);
          } else { mostrarFim(0, 0, true); aviso(e.message, true); }
        });
    }
    mostrar();
  }

  // ---------- tipos de exercício ----------
  function desenhar(ex, ctx) {
    if (ex.tipo === 'escolha' || ex.tipo === 'ouvir') return exEscolha(ex, ctx);
    if (ex.tipo === 'pares') return exPares(ex, ctx);
    if (ex.tipo === 'digitar') return exDigitar(ex, ctx);
    return exMontar(ex, ctx);
  }
  function exEscolha(ex, ctx) {
    var sel = null, botoes = [];
    var titulo = ex.tipo === 'ouvir' ? 'Toque no que você ouvir' : ex.pergunta;
    var cab = h('h2', {}, ex.tipo === 'escolha' && ex.falar && temFala ? h('button', { class: 'fala peq', 'aria-label': 'Ouvir', onclick: function () { falar(ex.falar); } }, '🔊') : null, titulo);
    var lista = h('div', { class: 'opcoes' });
    ex.opcoes.forEach(function (o, i) {
      var b = h('button', { class: 'opc', onclick: function () {
        if (ctx.travado) return; sel = o; botoes.forEach(function (x) { x.b.classList.toggle('sel', x.o === o); }); ctx.habilitar(true);
      } }, h('span', { class: 'letra' }, 'ABCD'[i]), h('span', {}, o));
      botoes.push({ b: b, o: o }); lista.append(b);
    });
    ctx.checar = function () {
      var ok = sel === ex.certa;
      botoes.forEach(function (x) { x.b.classList.remove('sel'); if (x.o === ex.certa) x.b.classList.add('certa'); else if (x.o === sel) x.b.classList.add('errada'); });
      return { ok: ok, certa: ex.certa };
    };
    var wrap = h('div', {}, cab);
    if (ex.tipo === 'ouvir') { wrap.append(h('div', { style: 'margin-bottom:18px' }, h('button', { class: 'fala', 'aria-label': 'Ouvir', onclick: function () { falar(ex.falar); } }, '🔊'))); setTimeout(function () { falar(ex.falar); }, 250); }
    wrap.append(lista);
    return wrap;
  }
  function exDigitar(ex, ctx) {
    var inp = h('input', { type: 'text', placeholder: 'Digite em inglês', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
    inp.addEventListener('input', function () { ctx.habilitar(inp.value.trim().length > 0); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && inp.value.trim() && !ctx.travado) document.querySelector('.licao-rodape .btn').click(); });
    ctx.checar = function () { inp.disabled = true; return { ok: norm(inp.value) === norm(ex.certa), certa: ex.certa }; };
    return h('div', {}, h('h2', {}, ex.pergunta), inp);
  }
  function exMontar(ex, ctx) {
    var usados = [], resp = h('div', { class: 'resposta' }), banco = h('div', { class: 'banco' });
    var pecas = ex.banco.map(function (t, i) {
      return h('button', { class: 'pec', onclick: function () {
        if (ctx.travado) return; var pos = usados.indexOf(i); if (pos >= 0) usados.splice(pos, 1); else usados.push(i); redesenhar();
      } }, t);
    });
    function redesenhar() {
      resp.replaceChildren();
      usados.forEach(function (i) { resp.append(h('button', { class: 'pec', onclick: function () { if (ctx.travado) return; usados.splice(usados.indexOf(i), 1); redesenhar(); } }, ex.banco[i])); });
      pecas.forEach(function (p, i) { p.classList.toggle('usada', usados.indexOf(i) >= 0); });
      ctx.habilitar(usados.length > 0);
    }
    pecas.forEach(function (p) { banco.append(p); });
    ctx.checar = function () { var dado = usados.map(function (i) { return ex.banco[i]; }).join(' '); return { ok: norm(dado) === norm(ex.alvo.join(' ')), certa: ex.alvo.join(' ') }; };
    return h('div', {}, h('h2', {}, ex.pergunta),
      h('p', { style: 'font-size:19px;font-weight:700;margin:0 0 16px' }, ex.falarOrigem && temFala ? h('button', { class: 'fala peq', onclick: function () { falar(ex.falarOrigem); } }, '🔊') : null, ex.origem), resp, banco);
  }
  function exPares(ex, ctx) {
    var esq = ex.pares.map(function (p) { return { t: p[0], par: p[0] }; });
    var dir = embaralhar(ex.pares.map(function (p) { return { t: p[1], par: p[0] }; }));
    var selE = null, restantes = ex.pares.length, colE = h('div', { class: 'opcoes' }), colD = h('div', { class: 'opcoes' }), bE = [], bD = [];
    function limpar() { bE.concat(bD).forEach(function (x) { x.b.classList.remove('sel', 'errada'); }); }
    esq.forEach(function (o) {
      var b = h('button', { class: 'opc', onclick: function () { if (ctx.travado || b.classList.contains('feita')) return; limpar(); selE = o; b.classList.add('sel'); falar(o.t); } }, h('span', {}, o.t));
      bE.push({ b: b, o: o }); colE.append(b);
    });
    dir.forEach(function (o) {
      var b = h('button', { class: 'opc', onclick: function () {
        if (ctx.travado || !selE || b.classList.contains('feita')) return;
        var eb = bE.filter(function (x) { return x.o === selE; })[0].b;
        if (selE.par === o.par) {
          eb.classList.remove('sel'); eb.classList.add('certa', 'feita'); b.classList.add('certa', 'feita'); selE = null; restantes--;
          if (restantes === 0) { ctx.travado = true; setTimeout(ctx.concluirAuto, 350); }
        } else { b.classList.add('errada'); eb.classList.add('errada'); selE = null; ctx.errouPar(); setTimeout(limpar, 450); }
      } }, h('span', {}, o.t));
      bD.push({ b: b, o: o }); colD.append(b);
    });
    ctx.checar = function () { return { ok: true, certa: '' }; };
    return h('div', {}, h('h2', {}, 'Toque nos pares que combinam'), h('div', { class: 'pares' }, colE, colD));
  }

  // ---------- avisos em segundo plano (presentes e mensagens) ----------
  var pollando = false;
  function iniciarPolling() {
    if (pollando) return; pollando = true;
    if (M().chamada) M().chamada.vigiar();
    setInterval(function () {
      if (!U || offline || document.hidden) return;
      var desde = ler('ae_dm_visto', 0);
      api('GET', '/api/novidades?desde=' + desde).then(function (n) {
        var mudou = false;
        if (n.dm > 0 && !(tela === 'comunidade' && subCom !== 'geral')) { if (!temDm) mudou = true; temDm = true; }
        if (n.presentes.length) {
          n.presentes.forEach(function (p) { aviso(p.avatar + ' ' + p.de + ' te enviou ' + (p.tipo === 'energia' ? '⚡ 1 de energia' : '🪙 ' + p.qtd + ' moedas') + '!'); });
          api('POST', '/api/presentes/vistos').then(function () { return api('GET', '/api/eu'); }).then(function (u) { aplicar(u); if (!licaoEl && tela !== 'comunidade') render(); }).catch(function () { /* ok */ });
        } else if (mudou && !licaoEl && tela !== 'comunidade') render();
        if (U && !U.pro && U.proxima && agoraSrv() >= U.proxima && !licaoEl) api('GET', '/api/eu').then(function (u) { aplicar(u); if (tela !== 'comunidade') render(); }).catch(function () { /* ok */ });
      }).catch(function () { /* sem rede */ });
    }, 10000);
  }
  window.addEventListener('online', function () { if (U) api('GET', '/api/eu').then(function (u) { aplicar(u); enviarPendentes(); if (!licaoEl) render(); }).catch(function () { /* ok */ }); });
  window.addEventListener('offline', function () { if (U) { offline = true; if (!licaoEl) render(); } });

  // ---------- ligação com os módulos ----------
  window.AE = { h: h, add: add, api: api, aplicar: aplicar, aviso: aviso, falha: falha, folha: folha, av: av, hora: hora, dataBr: dataBr, contagem: contagem, render: render, falar: falar, pessoa: abrirPerfil, perfil: abrirPerfil, conversar: conversar };
  Object.defineProperty(window.AE, 'U', { get: function () { return U; } });

  // abre uma tela a partir do endereço (#dm-5, #posts...) — usado pelas notificações
  function irPara(hash) {
    if (!U || !hash) return;
    var ml = /^#live-(\d+)$/.exec(hash);
    if (ml) { M().live.entrar(Number(ml[1])); history.replaceState(null, '', location.pathname); return; }
    var mp = /^#post-(\d+)$/.exec(hash), mv = /^#perfil-(\d+)$/.exec(hash);
    if (mp) { M().posts.abrirPorId(mp[1]); history.replaceState(null, '', location.pathname); return; }
    if (mv) { abrirPerfil(Number(mv[1])); history.replaceState(null, '', location.pathname); return; }
    var m = /^#dm-(\d+)$/.exec(hash);
    if (m) {
      api('GET', '/api/pessoa/' + m[1]).then(function (p) { if (licaoEl) return; tela = 'comunidade'; subCom = 'conversa'; conversaCom = p; render(); }).catch(function () { /* ok */ });
    } else {
      var t = hash.slice(1);
      if (t === 'painel' && !U.professor) t = 'perfil';
      if (['jornada', 'ranking', 'posts', 'comunidade', 'perfil', 'painel'].indexOf(t) < 0 || licaoEl) return;
      tela = t; if (t === 'comunidade') subCom = 'geral'; render();
    }
    history.replaceState(null, '', location.pathname);
  }
  window.addEventListener('hashchange', function () { irPara(location.hash); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', function (e) { if (e.data && e.data.abrir) irPara(e.data.abrir); });

  // ---------- início ----------
  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () { /* sem offline */ }); });
  var cache = ler('ae_u', null);
  api('GET', '/api/eu').then(function (u) { aplicar(u); render(); iniciarPolling(); enviarPendentes(); if (M().notif) M().notif.sincronizar(); irPara(location.hash); })
    .catch(function (e) { if (e.status === 0 && cache) { U = cache; offline = true; } else U = null; render(); });
})();
