// Trilha do ano letivo 2027: 10 seções × 30 capítulos (≈ 1 seção por mês, ≈ 1 capítulo por dia).
// O conteúdo de cada capítulo entra aos poucos pelos arquivos conteudo-*.js, chamando Cap(secao, capitulo, palavras, frases).
// Capítulo sem conteúdo aparece como "em breve". As chaves de progresso não mudam quando se acrescenta conteúdo.
(function () {
  'use strict';
  var NIVEIS = ['A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C1+'];
  var CORES = ['#35a7ff', '#3ee58b', '#ffd45a', '#a56bff', '#ff5575', '#38bdf8', '#f59e0b', '#ec4899', '#22c55e', '#6366f1'];
  var S = [
    ['Primeiros passos', [
      '👋|Primeiros passos', '👨‍👩‍👧|Pessoas e família', '🍎|Comida e bebida', '⏰|Rotina diária', '🎬|Present Continuous', '✈️|Viagens', '🏠|Casa e objetos', '👕|Cores e roupas', '💪|Corpo e saúde', '💼|Trabalho e profissões', '⏪|Passado simples', '🔮|Futuro e planos',
      '📅|Dias e meses', '☀️|Tempo e clima', '🐶|Animais', '🏙️|Cidade e lugares', '🚌|Transportes', '🎒|Escola e estudos', '🎮|Hobbies e lazer', '⚽|Esportes', '🎬|Música e filmes', '💵|Dinheiro e preços', '📍|There is / there are', '🙌|O verbo can', '❤️|Gostos e preferências', '⚖️|Adjetivos e comparações', '❓|Perguntas com Wh', '🧭|Preposições de lugar', '📱|Telefone e mensagens', '🏁|Revisão da Seção 1']],
    ['Vida cotidiana', [
      '☀️|Presente simples: afirmativa', '🚫|Presente simples: negativa', '🙋|Presente simples: perguntas', '🔁|Advérbios de frequência', '🌅|Rotina da manhã', '🌙|Rotina da noite', '🛋️|Fim de semana', '🥞|Café da manhã', '🍝|Almoço e jantar', '🛒|No supermercado', '🥖|Padaria e feira', '👩‍🍳|Receitas e cozinha', '🧹|Tarefas de casa', '🏘️|Vizinhança', '👪|Família grande', '🤝|Amigos e convites', '🎂|Festas e aniversários', '🎄|Datas e feriados', '🩺|Consulta médica', '💊|Farmácia', '🏋️|Academia', '🚇|Transporte público', '🚗|Trânsito e carro', '🗺️|Pedir direções', '🏨|Hotel e reservas', '🏖️|Praia e campo', '🎁|Presentes', '🛍️|Provador e compras', '🐕|Pets e cuidados', '🏁|Revisão da Seção 2']],
    ['Comunicação básica', [
      '⏪|Passado simples: regulares', '🔀|Passado simples: irregulares', '❔|Passado: perguntas e negativas', '🕰️|Was e were', '📖|Contando o fim de semana', '🧒|Infância', '🧳|Férias passadas', '📚|Histórias curtas', '🔮|Futuro com will', '🗓️|Futuro com going to', '🧭|Planos de viagem', '💌|Convites e sugestões', '🙏|Pedir e oferecer (can, could, would)', '📏|Comparativos', '🏆|Superlativos', '🔢|Much, many, a lot of', '🔤|Artigos e determinantes', '🪪|Pronomes possessivos', '⚠️|Should e must', '📜|Regras e obrigações', '🍽️|Restaurante avançado', '☎️|Ao telefone', '📧|E-mail simples', '💬|Redes sociais', '💻|Tecnologia', '🌱|Meio ambiente', '🏙️|A cidade onde moro', '🧑|Descrever pessoas', '🏞️|Descrever lugares', '🏁|Revisão da Seção 3']],
    ['Mundo ao redor', [
      '✅|Present perfect: introdução', '🌍|Ever e never', '⏳|For e since', '⌛|Already, yet e just', '⚖️|Present perfect x passado', '🎞️|Passado contínuo', '🕰️|Used to', '🔬|Condicional zero', '❓|Primeiro condicional', '🧩|Phrasal verbs 1', '🧩|Phrasal verbs 2', '🔤|Gerúndio e infinitivo', '🪞|Pronomes reflexivos', '🔖|Question tags', '🍎|Contáveis e incontáveis', '⏱️|Tempo e prazos', '🧘|Saúde e bem-estar', '🛫|Aeroporto e imigração', '📦|Compras online', '🏦|Banco e finanças', '🏡|Alugar moradia', '🔎|Procurando emprego', '🤵|Entrevista básica', '🎭|Cultura e tradições', '📰|Notícias simples', '🏟️|Eventos e esportes', '📺|Filmes e séries', '📖|Livros e leitura', '🌠|Sonhos e metas', '🏁|Revisão da Seção 4']],
    ['Experiências', [
      '💭|Segundo condicional', '🔙|Terceiro condicional', '🏗️|Voz passiva: presente', '🏛️|Voz passiva: passado', '🗣️|Discurso indireto 1', '🗨️|Discurso indireto: perguntas', '👤|Orações relativas: who e which', '📍|Where e whose', '🕰️|Get used to', '🔙|Should have e could have', '🌟|Wish e if only', '🔗|Conectivos', '👍|Opinar e concordar', '⚔️|Debates simples', '📊|Descrever gráficos', '🧗|Carreira', '🗂️|Reunião de trabalho', '✉️|E-mail profissional', '🎤|Apresentações', '🤝|Negociar', '😠|Reclamações', '🎧|Atendimento ao cliente', '💼|Viagem de negócios', '🤖|Tecnologia e IA', '🧠|Saúde mental', '🎓|Educação', '🌳|Meio ambiente II', '📡|Mídia', '🛍️|Consumo consciente', '🏁|Revisão da Seção 5']],
    ['Opiniões e planos', [
      '🧮|Quantificadores avançados', '🔁|Present perfect contínuo', '⏮️|Past perfect', '🔀|Past perfect x passado simples', '🔮|Future contínuo', '✔️|Future perfect', '📐|Modais de dedução', '🧱|Modais no passado', '🧷|Phrasal verbs 3', '🧷|Phrasal verbs 4', '💬|Expressões idiomáticas 1', '💬|Expressões idiomáticas 2', '🔗|Collocations 1', '🔗|Collocations 2', '🎯|Preposições dependentes', '🔠|Formação de palavras', '📝|Escrita: parágrafos', '📃|Escrita: cartas formais', '🧾|Resumir textos', '🎬|Entender séries sem legenda', '🎙️|Podcasts e entrevistas', '🗺️|Viajar sozinho', '🏠|Morar fora', '🧑‍⚕️|Emergências', '⚖️|Direitos e deveres', '🏛️|Política básica', '💰|Economia pessoal', '🤲|Voluntariado', '🔭|Ciência e curiosidades', '🏁|Revisão da Seção 6']],
    ['Trabalho e sociedade', [
      '🧑‍💼|Vocabulário corporativo', '📈|Vendas e marketing', '📑|Contratos e prazos', '🧾|Finanças da empresa', '👥|Liderança e equipe', '🧭|Gestão de projetos', '🎯|Metas e resultados', '🧑‍🏫|Treinamento', '🤖|Automação e dados', '🌐|Trabalho remoto', '📞|Teleconferência', '✍️|Relatórios', '🗣️|Falar em público', '🧠|Persuasão', '🧱|Inversão e ênfase', '🪢|Condicionais mistos', '🔀|Voz passiva avançada', '🗨️|Discurso indireto avançado', '🧩|Phrasal verbs 5', '🧩|Phrasal verbs 6', '💡|Idioms de negócios', '🏥|Saúde e sociedade', '🏙️|Urbanismo', '🚦|Mobilidade', '🌡️|Mudanças climáticas', '⚡|Energia', '🧬|Biotecnologia', '🧑‍⚖️|Justiça e leis', '🎨|Arte e cultura', '🏁|Revisão da Seção 7']],
    ['Ideias e debates', [
      '🧐|Argumentar e rebater', '⚖️|Prós e contras', '📊|Analisar dados', '🧪|Hipóteses', '📜|História mundial', '🌏|Geografia e povos', '🕊️|Paz e conflitos', '🏛️|Instituições', '📚|Literatura clássica', '🎭|Teatro e cinema', '🎼|Música e crítica', '🧘|Filosofia prática', '🧠|Psicologia', '👶|Educação e infância', '🧓|Envelhecimento', '🍷|Gastronomia', '🏔️|Aventura', '🛰️|Espaço', '🧮|Matemática do dia a dia', '🧑‍💻|Programação em inglês', '🛡️|Segurança digital', '📱|Cultura digital', '🗞️|Jornalismo', '🧵|Moda e design', '🏗️|Arquitetura', '🏅|Esporte profissional', '🎓|Vida acadêmica', '✍️|Ensaios', '🗂️|Estudos de caso', '🏁|Revisão da Seção 8']],
    ['Fluência e nuances', [
      '🎚️|Registro formal e informal', '🧂|Nuances de significado', '🪄|Phrasal verbs 7', '🪄|Phrasal verbs 8', '💭|Idioms 3', '💭|Idioms 4', '🔗|Collocations avançadas', '🧱|Estruturas de ênfase', '🪞|Ironia e humor', '🗣️|Gírias e variações', '🇬🇧|Inglês britânico', '🇺🇸|Inglês americano', '🌍|Inglês global', '🎧|Compreensão rápida', '🎙️|Pronúncia e ritmo', '📖|Leitura crítica', '✍️|Escrita criativa', '📑|Escrita acadêmica', '🧾|Escrita profissional', '🤝|Mediar conflitos', '🎤|Discursos', '🧑‍🎓|Seminários', '📰|Editoriais', '🔍|Pesquisa e fontes', '🧭|Tradução e equivalência', '🕰️|Inglês de época', '🎬|Roteiros', '📚|Resenhas', '🧩|Quebra-cabeças de linguagem', '🏁|Revisão da Seção 9']],
    ['Domínio do inglês', [
      '🏆|Simulado: gramática 1', '🏆|Simulado: gramática 2', '🏆|Simulado: vocabulário 1', '🏆|Simulado: vocabulário 2', '🎧|Simulado: compreensão oral', '📖|Simulado: leitura', '✍️|Simulado: escrita', '🗣️|Simulado: conversação', '🧠|Erros comuns de brasileiros 1', '🧠|Erros comuns de brasileiros 2', '🧠|Falsos cognatos', '🧠|Preposições: tira-teima', '🧠|Tempos verbais: tira-teima', '🧠|Phrasal verbs: tira-teima', '🧠|Idioms: tira-teima', '🌎|Viagem pelo mundo', '🏢|Cenários profissionais', '🎓|Cenários acadêmicos', '🏡|Cenários do dia a dia', '📞|Cenários de atendimento', '🎙️|Debate final', '📝|Redação final', '🎤|Apresentação final', '📚|Leituras guiadas', '🎬|Cenas de filmes', '🎶|Letras e expressões', '🧭|Plano de estudos contínuo', '🌟|Mensagens para o futuro', '🏅|Prova do ano', '🎓|Formatura 2027']],
  ];
  var CONT = {}; // 'secao.cap' -> { w: [[en,pt]], p: [[en,pt]] }
  function pares(txt) { return txt.split(';').map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) { var i = x.indexOf('='); return [x.slice(0, i).trim(), x.slice(i + 1).trim()]; }); }
  // Cap(1, 13, 'monday=segunda;tuesday=terça;…', 'Today is Monday=Hoje é segunda;…')
  window.Cap = function (s, c, palavras, frases) { CONT[s + '.' + c] = { w: pares(palavras), p: pares(frases) }; };

  function amostra(arr, n, passo) { var r = []; for (var i = 0; i < arr.length && r.length < n; i += passo) r.push(arr[i]); var k = 1; while (r.length < n && k < arr.length) { var x = arr[(k * 3 + passo) % arr.length]; if (r.indexOf(x) < 0) r.push(x); k++; } return r; }

  // Monta window.CURSO (capítulos com lições) e window.SECOES (mapa completo)
  window.montarCurso = function () {
    var legado = window.CURSO_LEGADO || window.CURSO.slice();
    window.CURSO_LEGADO = legado;
    var curso = [], secoes = [];
    S.forEach(function (sec, si) {
      var s = si + 1, caps = [];
      sec[1].forEach(function (t, ci) {
        var c = ci + 1, par = t.split('|'), leg = s === 1 && c <= 12 ? legado[c - 1] : null, cont = CONT[s + '.' + c];
        var prefixo = 's' + s + 'c' + c;
        var lic = [];
        if (leg) leg.lessons.forEach(function (l, i) { lic.push({ k: leg.id + 'l' + i, titulo: l.titulo, words: l.words, phrases: l.phrases }); });
        var palavrasTodas = lic.reduce(function (a, l) { return a.concat(l.words); }, []), frasesTodas = lic.reduce(function (a, l) { return a.concat(l.phrases); }, []);
        if (cont) {
          var N = Math.min(Math.floor(cont.w.length / 6), Math.floor(cont.p.length / 3)), base = lic.length, vistasW = palavrasTodas.slice(), vistasP = frasesTodas.slice(), rev = 0;
          for (var j = 0; j < N; j++) {
            var w = cont.w.slice(j * 6, j * 6 + 6), p = cont.p.slice(j * 3, j * 3 + 3);
            lic.push({ k: prefixo + 'l' + (base + j), titulo: 'Parte ' + (j + 1), words: w, phrases: p });
            vistasW = vistasW.concat(w); vistasP = vistasP.concat(p);
            if ((j + 1) % 4 === 0 && j + 1 < N) { lic.push({ k: prefixo + 'r' + (rev++), titulo: 'Revisão ' + rev, words: amostra(vistasW, 6, Math.max(1, Math.floor(vistasW.length / 6))), phrases: amostra(vistasP, 3, Math.max(1, Math.floor(vistasP.length / 3))) }); }
          }
          if (N >= 3) lic.push({ k: prefixo + 'f', titulo: 'Desafio do capítulo', words: amostra(vistasW, 8, Math.max(1, Math.floor(vistasW.length / 8))), phrases: amostra(vistasP, 4, Math.max(1, Math.floor(vistasP.length / 4))) });
        }
        var cap = { id: leg ? leg.id : prefixo, secao: s, num: c, titulo: par[1], emoji: par[0], cor: leg ? leg.cor : CORES[(c - 1) % CORES.length], lessons: lic, meta: cont ? 20 : (leg ? 20 : 0) };
        caps.push(cap);
        if (lic.length) curso.push(cap);
      });
      secoes.push({ n: s, titulo: sec[0], nivel: NIVEIS[si], capitulos: caps });
    });
    window.SECOES = secoes;
    window.CURSO.length = 0; curso.forEach(function (c) { window.CURSO.push(c); });
    return window.CURSO;
  };
})();
