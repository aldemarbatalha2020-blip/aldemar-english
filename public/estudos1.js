// Livro de referência — materiais 1 a 17 (Fundamentos e Gramática). Cada material: t=título, r=resumo, b=blocos (t=título, p=texto, ex=exemplos [en, pt]), d=dica.
(function () {
  var E = window.ESTUDOS = window.ESTUDOS || [];
  function m(n, cat, ic, t, r, b, d) { E.push({ id: 'e' + n, cat: cat, ic: ic, t: t, r: r, b: b, d: d }); }

  m(1, 'Fundamentos', '🔤', 'O alfabeto e a soletração', 'Aprenda o nome das 26 letras para soletrar seu nome e e-mail.',
    [{ t: 'As letras mais confusas', p: 'Em inglês, a letra tem nome diferente do som. As que mais geram dúvida: A (êi), E (i), I (ai), G (djí), J (djêi), R (ár), W (dâbliu), Y (uai), Z (zí).', ex: [['A, B, C, D, E, F, G', 'êi, bi, si, di, i, éf, djí'], ['H, I, J, K, L, M, N', 'êitch, ai, djêi, quêi, él, ém, én']] },
     { t: 'Soletrando', p: 'Para soletrar, diga as letras uma a uma. Se a letra repete, diga "double": double L = LL.', ex: [['My name is Ana. A-N-A.', 'Meu nome é Ana. A-N-A.'], ['How do you spell "Bella"? B-E-double L-A.', 'Como se soletra "Bella"? B-E-L-L-A.']] }],
    'Treine soletrando seu nome completo e o nome de três amigos em voz alta.');

  m(2, 'Fundamentos', '🙋', 'Pronomes pessoais', 'I, you, he, she, it, we, they: quem faz a ação.',
    [{ t: 'Quadro rápido', p: 'I = eu · you = você(s) · he = ele · she = ela · it = isso/coisa/animal · we = nós · they = eles/elas.', ex: [['I am a student.', 'Eu sou estudante.'], ['She works here.', 'Ela trabalha aqui.'], ['They live in Recife.', 'Eles moram em Recife.']] },
     { t: 'Atenção', p: 'Em inglês o sujeito é obrigatório: não dá para dizer só "Is cold". Diga "It is cold". O "I" é sempre maiúsculo.', ex: [['It is hot today.', 'Está quente hoje.'], ['We are friends.', 'Nós somos amigos.']] }],
    '"You" serve para uma pessoa ou várias: o contexto mostra quem é.');

  m(3, 'Fundamentos', '🧱', 'Verbo To Be (ser e estar)', 'Am, is, are: o verbo mais usado do inglês.',
    [{ t: 'Afirmativa', p: 'I am · you are · he/she/it is · we are · you are · they are. Na fala, usamos formas curtas: I\'m, you\'re, he\'s, she\'s, it\'s, we\'re, they\'re.', ex: [['I\'m Bruno and I\'m 25.', 'Sou o Bruno e tenho 25 anos.'], ['She is a teacher.', 'Ela é professora.']] },
     { t: 'Negativa e pergunta', p: 'Negativa: coloque "not" depois do verbo (is not = isn\'t, are not = aren\'t). Pergunta: inverta, verbo antes do sujeito.', ex: [['He isn\'t at home.', 'Ele não está em casa.'], ['Are you ready?', 'Você está pronto?'], ['Where is the bank?', 'Onde fica o banco?']] },
     { t: 'Idade e sentimentos', p: 'Em inglês usamos TO BE para idade, fome, frio, sono e medo (em português usamos "ter").', ex: [['I am 30 years old.', 'Eu tenho 30 anos.'], ['We are hungry.', 'Nós estamos com fome.']] }],
    'Na dúvida entre "ser" e "estar", o inglês usa o mesmo verbo: to be.');

  m(4, 'Fundamentos', '🅰️', 'Artigos: a, an e the', 'Quando usar um/uma e quando usar o/a.',
    [{ t: 'A e an', p: 'Use "a" antes de som de consoante e "an" antes de som de vogal. Vale o som, não a letra.', ex: [['a book, a car', 'um livro, um carro'], ['an apple, an hour', 'uma maçã, uma hora (o H é mudo)'], ['a university', 'uma universidade (começa com som de "iu")']] },
     { t: 'The', p: '"The" é usado quando os dois sabem de qual coisa se fala, ou quando só existe um.', ex: [['I have a dog. The dog is big.', 'Tenho um cachorro. O cachorro é grande.'], ['The sun is bright.', 'O sol está forte.']] },
     { t: 'Sem artigo', p: 'Não use artigo para coisas em geral, refeições, idiomas e esportes.', ex: [['I love music.', 'Eu amo música.'], ['We have lunch at noon.', 'Almoçamos ao meio-dia.']] }],
    'Pergunte-se: o som da próxima palavra é de vogal? Então "an".');

  m(5, 'Fundamentos', '📚', 'Plural dos substantivos', 'Como transformar um em muitos.',
    [{ t: 'Regra geral', p: 'Acrescente -s. Palavras terminadas em s, x, ch, sh, z ganham -es. Consoante + y vira -ies.', ex: [['cat → cats', 'gato → gatos'], ['box → boxes, watch → watches', 'caixas, relógios'], ['city → cities', 'cidades']] },
     { t: 'Plurais irregulares', p: 'Alguns mudam de forma e é preciso decorar.', ex: [['man → men, woman → women', 'homens, mulheres'], ['child → children', 'crianças'], ['foot → feet, tooth → teeth', 'pés, dentes'], ['person → people', 'pessoas']] }],
    'Sheep e fish não mudam no plural: one sheep, two sheep.');

  m(6, 'Fundamentos', '🔢', 'Números e ordinais', 'Contar, falar preços e dizer a posição (1st, 2nd...).',
    [{ t: 'De 1 a 20 e dezenas', p: '1 one · 2 two · 3 three · 4 four · 5 five · 6 six · 7 seven · 8 eight · 9 nine · 10 ten · 11 eleven · 12 twelve · 13 thirteen · 20 twenty · 30 thirty · 40 forty · 50 fifty · 100 a hundred.', ex: [['I have twenty-five students.', 'Tenho vinte e cinco alunos.'], ['It costs forty dollars.', 'Custa quarenta dólares.']] },
     { t: 'Ordinais', p: '1st first · 2nd second · 3rd third · 4th fourth · 5th fifth · 12th twelfth · 21st twenty-first.', ex: [['She is in the third grade.', 'Ela está na terceira série.'], ['My birthday is on the fifth of May.', 'Meu aniversário é em 5 de maio.']] }],
    'Cuidado: thirteen (13) e thirty (30) soam parecidos. O acento está em lugares diferentes: thirTEEN, THIRty.');

  m(7, 'Fundamentos', '📅', 'Dias, meses e datas', 'Falar de datas e compromissos.',
    [{ t: 'Dias e meses', p: 'Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday. January, February, March, April, May, June, July, August, September, October, November, December. Dias e meses são escritos com letra maiúscula.', ex: [['See you on Friday.', 'Te vejo na sexta.'], ['My birthday is in July.', 'Meu aniversário é em julho.']] },
     { t: 'Dizendo a data', p: 'Fale com ordinal: "May 5th" lê-se "May fifth" ou "the fifth of May". Para o ano: 1999 = nineteen ninety-nine; 2025 = twenty twenty-five.', ex: [['Today is October 14th.', 'Hoje é 14 de outubro.'], ['I was born in 1998.', 'Nasci em 1998.']] }],
    'Nos EUA a data vem mês/dia/ano (10/14/2026). No Brasil é dia/mês/ano.');

  m(8, 'Fundamentos', '🕒', 'Dizendo as horas', 'Perguntar e responder que horas são.',
    [{ t: 'Pergunta e resposta', p: '"What time is it?" ou "What\'s the time?". Resposta: "It\'s + hora".', ex: [['It\'s three o\'clock.', 'São três horas em ponto.'], ['It\'s half past six.', 'São seis e meia.'], ['It\'s a quarter to nine.', 'São quinze para as nove.']] },
     { t: 'Past e to', p: 'Até 30 minutos use "past" (depois da hora). Depois de 30 use "to" (faltando para a próxima).', ex: [['ten past four (4:10)', 'quatro e dez'], ['twenty to five (4:40)', 'vinte para as cinco']] },
     { t: 'AM e PM', p: 'AM = da meia-noite ao meio-dia. PM = do meio-dia à meia-noite.', ex: [['The class is at 7 p.m.', 'A aula é às 19h.']] }],
    'Na conversa do dia a dia, "It\'s 4:40" também é aceito.');

  m(9, 'Fundamentos', '👜', 'Possessivos', 'My, your, his, her, our, their: de quem é.',
    [{ t: 'Adjetivos possessivos', p: 'Vêm antes do substantivo: my, your, his, her, its, our, their.', ex: [['This is my phone.', 'Este é meu celular.'], ['Their house is big.', 'A casa deles é grande.']] },
     { t: 'Pronomes possessivos', p: 'Substituem o substantivo: mine, yours, his, hers, ours, theirs.', ex: [['This book is mine.', 'Este livro é meu.'], ['Is that bag yours?', 'Aquela bolsa é sua?']] },
     { t: '\'s para posse', p: 'Para donos de coisas, use \'s depois do nome.', ex: [['Ana\'s car is red.', 'O carro da Ana é vermelho.'], ['The dog\'s tail', 'O rabo do cachorro']] }],
    '"His" é dele e "her" é dela: quem manda é o dono, não a coisa.');

  m(10, 'Fundamentos', '👉', 'This, that, these, those', 'Apontar para o que está perto ou longe.',
    [{ t: 'Perto e longe', p: 'Perto: this (singular), these (plural). Longe: that (singular), those (plural).', ex: [['This is my pen.', 'Esta é minha caneta (na mão).'], ['Those are my shoes.', 'Aqueles são meus sapatos (longe).']] },
     { t: 'Perguntas úteis', p: 'Use para perguntar preço e nome das coisas.', ex: [['How much is this?', 'Quanto custa isto?'], ['What is that?', 'O que é aquilo?'], ['Are these yours?', 'Estes são seus?']] }],
    'Nos telefonemas: "This is Ana" (aqui é a Ana) e "Who is this?" (quem fala?).');

  m(11, 'Gramática', '▶️', 'Present Simple: afirmativa', 'Rotinas, hábitos e verdades gerais.',
    [{ t: 'Forma', p: 'Use o verbo no infinitivo sem "to". Com he, she e it, acrescente -s (ou -es).', ex: [['I work in a bank.', 'Eu trabalho em um banco.'], ['She works in a school.', 'Ela trabalha em uma escola.'], ['He watches TV every night.', 'Ele assiste TV toda noite.']] },
     { t: 'Quando usar', p: 'Para rotina, hábitos, gostos e fatos que não mudam.', ex: [['The sun rises in the east.', 'O sol nasce no leste.'], ['We study English on Mondays.', 'Estudamos inglês às segundas.']] },
     { t: 'Ortografia do -s', p: 'Verbo terminado em s, x, ch, sh, o: -es. Consoante + y: -ies. Have vira has.', ex: [['go → goes', 'vai'], ['study → studies', 'estuda'], ['have → has', 'tem']] }],
    'O "s" da terceira pessoa é o erro mais comum. Releia antes de falar: he/she/it pedem -s.');

  m(12, 'Gramática', '❓', 'Present Simple: negativa e perguntas', 'Do e does fazem o trabalho.',
    [{ t: 'Negativa', p: 'Use don\'t (I, you, we, they) ou doesn\'t (he, she, it) + verbo sem -s.', ex: [['I don\'t like coffee.', 'Eu não gosto de café.'], ['She doesn\'t eat meat.', 'Ela não come carne.']] },
     { t: 'Perguntas', p: 'Do/Does + sujeito + verbo. Com does, o verbo fica sem -s.', ex: [['Do you speak English?', 'Você fala inglês?'], ['Does he live here?', 'Ele mora aqui?']] },
     { t: 'Respostas curtas', p: 'Responda com o auxiliar.', ex: [['Yes, I do. / No, I don\'t.', 'Sim. / Não.'], ['Yes, she does. / No, she doesn\'t.', 'Sim. / Não.']] }],
    'Depois de does/doesn\'t, o -s some do verbo: "Does she work?", e não "Does she works?".');

  m(13, 'Gramática', '🔁', 'Advérbios de frequência', 'Always, usually, sometimes, never...',
    [{ t: 'Da mais à menos frequente', p: 'always (100%) · usually · often · sometimes · rarely · never (0%).', ex: [['I always drink water.', 'Eu sempre bebo água.'], ['He never eats breakfast.', 'Ele nunca toma café da manhã.']] },
     { t: 'Posição na frase', p: 'Fica antes do verbo principal, mas depois do verbo to be.', ex: [['She usually walks to work.', 'Ela costuma ir a pé ao trabalho.'], ['They are often late.', 'Eles costumam se atrasar.']] },
     { t: 'Expressões de frequência', p: 'Também: every day, once a week, twice a month, three times a year.', ex: [['I go to the gym twice a week.', 'Vou à academia duas vezes por semana.']] }],
    '"Sometimes" pode ir também no começo da frase: "Sometimes I walk."');

  m(14, 'Gramática', '⏳', 'Present Continuous', 'O que está acontecendo agora.',
    [{ t: 'Forma', p: 'am/is/are + verbo com -ing.', ex: [['I am studying now.', 'Estou estudando agora.'], ['They are playing soccer.', 'Eles estão jogando futebol.']] },
     { t: 'Negativa e pergunta', p: 'Negativa: am/is/are + not. Pergunta: inverta o verbo to be.', ex: [['She isn\'t sleeping.', 'Ela não está dormindo.'], ['What are you doing?', 'O que você está fazendo?']] },
     { t: 'Planos próximos', p: 'Também serve para planos já combinados.', ex: [['I\'m meeting Ana tomorrow.', 'Vou encontrar a Ana amanhã.']] },
     { t: 'Ortografia do -ing', p: 'Tire o e final (make → making), dobre a consoante (run → running).', ex: [['write → writing', 'escrevendo'], ['sit → sitting', 'sentando']] }],
    'Verbos de estado (know, like, want, love) quase nunca vão no -ing.');

  m(15, 'Gramática', '⚖️', 'Simple ou Continuous?', 'Hábito de sempre ou ação do momento.',
    [{ t: 'Comparação', p: 'Present Simple = rotina. Present Continuous = agora, temporário.', ex: [['I drink coffee every morning.', 'Eu tomo café toda manhã.'], ['I am drinking coffee now.', 'Estou tomando café agora.']] },
     { t: 'Palavras-pista', p: 'Simple: always, every day, usually. Continuous: now, right now, at the moment, today.', ex: [['He usually works at home, but today he is working at the office.', 'Ele costuma trabalhar em casa, mas hoje está no escritório.']] }],
    'Pergunte "é de sempre ou é agora?". A resposta decide o tempo verbal.');

  m(16, 'Gramática', '⏪', 'Past Simple: verbos regulares', 'Contar o que aconteceu.',
    [{ t: 'Forma', p: 'Verbo + -ed. A forma é igual para todas as pessoas.', ex: [['I worked yesterday.', 'Trabalhei ontem.'], ['They played soccer.', 'Eles jogaram futebol.']] },
     { t: 'Ortografia', p: 'Termina em e: só -d (live → lived). Consoante + y: -ied (study → studied). Uma sílaba curta: dobra (stop → stopped).', ex: [['She studied all night.', 'Ela estudou a noite toda.'], ['We stopped at a café.', 'Paramos em um café.']] },
     { t: 'Palavras-pista', p: 'yesterday, last week, two days ago, in 2020.', ex: [['I called you two hours ago.', 'Liguei para você há duas horas.']] }],
    'O -ed muda de som: walked (t), played (d), wanted (id). Veja o material 48.');

  m(17, 'Gramática', '🔀', 'Past Simple: verbos irregulares', 'Os 24 verbos que mais aparecem.',
    [{ t: 'Lista essencial (1/2)', p: 'be → was/were · have → had · go → went · do → did · see → saw · come → came · get → got · make → made · take → took · give → gave · say → said · eat → ate.', ex: [['I went to the beach.', 'Fui à praia.'], ['She made a cake.', 'Ela fez um bolo.']] },
     { t: 'Lista essencial (2/2)', p: 'buy → bought · know → knew · think → thought · write → wrote · read → read (lê-se "red") · speak → spoke · drink → drank · sleep → slept · leave → left · find → found · tell → told · run → ran.', ex: [['We bought new shoes.', 'Compramos sapatos novos.'], ['He told me a secret.', 'Ele me contou um segredo.']] }],
    'Aprenda cinco verbos irregulares por dia em frases completas, não em listas soltas.');
})();
