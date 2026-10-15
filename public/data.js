// Conteúdo do curso. Para adicionar lições, copie um bloco e troque as palavras/frases.
// words:   [inglês, português]   phrases: [inglês, português]
window.CURSO = [
  { id: 'u1', titulo: 'Primeiros passos', emoji: '👋', cor: '#35a7ff', lessons: [
    { titulo: 'Cumprimentos', words: [['hello','olá'],['goodbye','tchau'],['please','por favor'],['thank you','obrigado'],['yes','sim'],['no','não']],
      phrases: [['Good morning','Bom dia'],['Good night','Boa noite'],['See you later','Até mais tarde']] },
    { titulo: 'Apresentações', words: [['name','nome'],['friend','amigo'],['teacher','professor'],['student','aluno'],['nice','legal'],['meet','conhecer']],
      phrases: [['My name is Ana','Meu nome é Ana'],['Nice to meet you','Prazer em conhecer você'],['I am a student','Eu sou um aluno']] },
    { titulo: 'Números', words: [['one','um'],['two','dois'],['three','três'],['four','quatro'],['five','cinco'],['ten','dez']],
      phrases: [['I have two friends','Eu tenho dois amigos'],['She has five books','Ela tem cinco livros'],['It is number ten','É o número dez']] },
  ]},
  { id: 'u2', titulo: 'Pessoas e família', emoji: '👨‍👩‍👧', cor: '#3ee58b', lessons: [
    { titulo: 'Família', words: [['mother','mãe'],['father','pai'],['brother','irmão'],['sister','irmã'],['son','filho'],['daughter','filha']],
      phrases: [['This is my mother','Esta é minha mãe'],['He is my brother','Ele é meu irmão'],['I love my family','Eu amo minha família']] },
    { titulo: 'Verbo to be', words: [['I am','eu sou'],['you are','você é'],['he is','ele é'],['she is','ela é'],['we are','nós somos'],['they are','eles são']],
      phrases: [['She is my sister','Ela é minha irmã'],['We are happy','Nós estamos felizes'],['They are at home','Eles estão em casa']] },
    { titulo: 'Descrições', words: [['tall','alto'],['short','baixo'],['young','jovem'],['old','velho'],['happy','feliz'],['tired','cansado']],
      phrases: [['My father is tall','Meu pai é alto'],['The girl is young','A menina é jovem'],['I am very tired','Eu estou muito cansado']] },
  ]},
  { id: 'u3', titulo: 'Comida e bebida', emoji: '🍎', cor: '#ffd45a', lessons: [
    { titulo: 'Alimentos', words: [['apple','maçã'],['bread','pão'],['rice','arroz'],['beans','feijão'],['chicken','frango'],['cheese','queijo']],
      phrases: [['I eat bread','Eu como pão'],['She likes cheese','Ela gosta de queijo'],['We eat rice and beans','Nós comemos arroz e feijão']] },
    { titulo: 'Bebidas', words: [['water','água'],['coffee','café'],['milk','leite'],['juice','suco'],['tea','chá'],['cold','gelado']],
      phrases: [['I drink water','Eu bebo água'],['He wants coffee','Ele quer café'],['Do you like juice','Você gosta de suco']] },
    { titulo: 'No restaurante', words: [['menu','cardápio'],['bill','conta'],['hungry','com fome'],['thirsty','com sede'],['delicious','delicioso'],['table','mesa']],
      phrases: [['I am hungry','Eu estou com fome'],['The food is delicious','A comida está deliciosa'],['The bill, please','A conta, por favor']] },
  ]},
  { id: 'u4', titulo: 'Rotina diária', emoji: '⏰', cor: '#a56bff', lessons: [
    { titulo: 'Ações do dia', words: [['wake up','acordar'],['eat','comer'],['work','trabalhar'],['study','estudar'],['sleep','dormir'],['play','brincar']],
      phrases: [['I wake up at seven','Eu acordo às sete'],['She works every day','Ela trabalha todo dia'],['We study English','Nós estudamos inglês']] },
    { titulo: 'Horários', words: [['morning','manhã'],['afternoon','tarde'],['night','noite'],['today','hoje'],['tomorrow','amanhã'],['always','sempre']],
      phrases: [['I study in the morning','Eu estudo de manhã'],['He sleeps at night','Ele dorme à noite'],['See you tomorrow','Vejo você amanhã']] },
    { titulo: 'Lugares', words: [['home','casa'],['school','escola'],['church','igreja'],['street','rua'],['city','cidade'],['store','loja']],
      phrases: [['I go to school','Eu vou para a escola'],['They go to church','Eles vão à igreja'],['The store is open','A loja está aberta']] },
  ]},
  { id: 'u5', titulo: 'Present Continuous', emoji: '🎬', cor: '#ff5575', lessons: [
    { titulo: 'Fazendo agora', words: [['reading','lendo'],['writing','escrevendo'],['listening','ouvindo'],['walking','andando'],['running','correndo'],['singing','cantando']],
      phrases: [['I am reading a book','Eu estou lendo um livro'],['She is singing now','Ela está cantando agora'],['They are running','Eles estão correndo']] },
    { titulo: 'Perguntas', words: [['what','o que'],['where','onde'],['who','quem'],['why','por que'],['when','quando'],['how','como']],
      phrases: [['What are you doing','O que você está fazendo'],['Where is he going','Aonde ele está indo'],['Who is she calling','Para quem ela está ligando']] },
    { titulo: 'Negativas', words: [['not','não'],['now','agora'],['right now','neste momento'],['busy','ocupado'],['phone','telefone'],['music','música']],
      phrases: [['I am not sleeping','Eu não estou dormindo'],['He is not working now','Ele não está trabalhando agora'],['We are not watching TV','Nós não estamos assistindo TV']] },
  ]},
  { id: 'u6', titulo: 'Viagens', emoji: '✈️', cor: '#38bdf8', lessons: [
    { titulo: 'No aeroporto', words: [['airport','aeroporto'],['ticket','passagem'],['passport','passaporte'],['suitcase','mala'],['flight','voo'],['gate','portão']],
      phrases: [['Where is my suitcase','Onde está minha mala'],['I need my passport','Eu preciso do meu passaporte'],['The flight is late','O voo está atrasado']] },
    { titulo: 'Direções', words: [['left','esquerda'],['right','direita'],['straight','em frente'],['near','perto'],['far','longe'],['map','mapa']],
      phrases: [['Turn left here','Vire à esquerda aqui'],['Go straight ahead','Siga em frente'],['Is it far from here','Fica longe daqui']] },
    { titulo: 'Hotel', words: [['room','quarto'],['key','chave'],['bed','cama'],['bathroom','banheiro'],['breakfast','café da manhã'],['reservation','reserva']],
      phrases: [['I have a reservation','Eu tenho uma reserva'],['What time is breakfast','Que horas é o café da manhã'],['The room is clean','O quarto está limpo']] },
  ]},
];

// ---------- Capítulos novos ----------
window.CURSO.push(
  { id: 'u7', titulo: 'Casa e objetos', emoji: '🏠', cor: '#f59e0b', lessons: [
    { titulo: 'Cômodos', words: [['kitchen','cozinha'],['bedroom','quarto'],['living room','sala de estar'],['garden','jardim'],['garage','garagem'],['window','janela']],
      phrases: [['The kitchen is small','A cozinha é pequena'],['My bedroom is upstairs','Meu quarto fica no andar de cima'],['We have a big garden','Nós temos um jardim grande']] },
    { titulo: 'Objetos da casa', words: [['chair','cadeira'],['sofa','sofá'],['lamp','luminária'],['door','porta'],['mirror','espelho'],['fridge','geladeira']],
      phrases: [['There is a lamp on the table','Há uma luminária sobre a mesa'],['The door is open','A porta está aberta'],['There are two chairs here','Há duas cadeiras aqui']] },
    { titulo: 'Onde está?', words: [['on','sobre'],['under','embaixo de'],['next to','ao lado de'],['behind','atrás de'],['in front of','na frente de'],['between','entre']],
      phrases: [['The cat is under the table','O gato está embaixo da mesa'],['The key is next to the phone','A chave está ao lado do telefone'],['The book is on the sofa','O livro está no sofá']] },
  ]},
  { id: 'u8', titulo: 'Cores e roupas', emoji: '👕', cor: '#ec4899', lessons: [
    { titulo: 'Cores', words: [['red','vermelho'],['blue','azul'],['green','verde'],['yellow','amarelo'],['black','preto'],['white','branco']],
      phrases: [['The sky is blue','O céu é azul'],['I like the red car','Eu gosto do carro vermelho'],['Her shirt is white','A camisa dela é branca']] },
    { titulo: 'Roupas', words: [['shirt','camisa'],['pants','calça'],['dress','vestido'],['shoes','sapatos'],['hat','chapéu'],['jacket','jaqueta']],
      phrases: [['I wear black shoes','Eu uso sapatos pretos'],['She has a new dress','Ela tem um vestido novo'],['He is wearing a hat','Ele está usando um chapéu']] },
    { titulo: 'Compras', words: [['cheap','barato'],['expensive','caro'],['size','tamanho'],['money','dinheiro'],['price','preço'],['discount','desconto']],
      phrases: [['How much is this shirt','Quanto custa esta camisa'],['It is too expensive','É caro demais'],['Do you have a smaller size','Você tem um tamanho menor']] },
  ]},
  { id: 'u9', titulo: 'Corpo e saúde', emoji: '💪', cor: '#22c55e', lessons: [
    { titulo: 'Partes do corpo', words: [['head','cabeça'],['hand','mão'],['foot','pé'],['arm','braço'],['leg','perna'],['eye','olho']],
      phrases: [['My head hurts','Minha cabeça dói'],['She has green eyes','Ela tem olhos verdes'],['Raise your hand','Levante a mão']] },
    { titulo: 'Sintomas', words: [['fever','febre'],['cough','tosse'],['headache','dor de cabeça'],['sick','doente'],['medicine','remédio'],['pain','dor']],
      phrases: [['I have a fever','Eu estou com febre'],['He has a bad cough','Ele está com uma tosse forte'],['I need some medicine','Eu preciso de um remédio']] },
    { titulo: 'Conselhos', words: [['rest','descansar'],['doctor','médico'],['healthy','saudável'],['exercise','exercício'],['hospital','hospital'],['nurse','enfermeiro']],
      phrases: [['You should see a doctor','Você deveria ir ao médico'],['He should rest today','Ele deveria descansar hoje'],['We should drink more water','Nós deveríamos beber mais água']] },
  ]},
  { id: 'u10', titulo: 'Trabalho e profissões', emoji: '💼', cor: '#6366f1', lessons: [
    { titulo: 'Profissões', words: [['engineer','engenheiro'],['lawyer','advogado'],['driver','motorista'],['cook','cozinheiro'],['farmer','agricultor'],['singer','cantor']],
      phrases: [['I am an engineer','Eu sou engenheiro'],['She is a lawyer','Ela é advogada'],['My father is a driver','Meu pai é motorista']] },
    { titulo: 'Locais de trabalho', words: [['office','escritório'],['factory','fábrica'],['restaurant','restaurante'],['bank','banco'],['company','empresa'],['boss','chefe']],
      phrases: [['I work in an office','Eu trabalho em um escritório'],['My boss is very kind','Meu chefe é muito gentil'],['She works at a bank','Ela trabalha em um banco']] },
    { titulo: 'Rotina profissional', words: [['job','emprego'],['salary','salário'],['meeting','reunião'],['schedule','horário'],['email','e-mail'],['interview','entrevista']],
      phrases: [['What do you do','O que você faz da vida'],['I have a meeting at ten','Eu tenho uma reunião às dez'],['She has a job interview','Ela tem uma entrevista de emprego']] },
  ]},
  { id: 'u11', titulo: 'Passado simples', emoji: '⏪', cor: '#14b8a6', lessons: [
    { titulo: 'Verbos regulares', words: [['worked','trabalhou'],['played','jogou'],['watched','assistiu'],['cooked','cozinhou'],['cleaned','limpou'],['visited','visitou']],
      phrases: [['I visited my aunt yesterday','Eu visitei minha tia ontem'],['She cooked dinner last night','Ela cozinhou o jantar ontem à noite'],['We watched a movie','Nós assistimos a um filme']] },
    { titulo: 'Verbos irregulares', words: [['went','foi'],['ate','comeu'],['saw','viu'],['bought','comprou'],['wrote','escreveu'],['came','veio']],
      phrases: [['He went to the beach','Ele foi à praia'],['I bought a new phone','Eu comprei um celular novo'],['They saw a big dog','Eles viram um cachorro grande']] },
    { titulo: 'Perguntas e negativas', words: [['yesterday','ontem'],['last week','semana passada'],['ago','atrás'],['before','antes'],['after','depois'],['never','nunca']],
      phrases: [['Did you study yesterday','Você estudou ontem'],['I did not go to school','Eu não fui à escola'],['She called me two days ago','Ela me ligou há dois dias']] },
  ]},
  { id: 'u12', titulo: 'Futuro e planos', emoji: '🔮', cor: '#a855f7', lessons: [
    { titulo: 'Planos', words: [['plan','plano'],['trip','viagem'],['party','festa'],['birthday','aniversário'],['holiday','feriado'],['next','próximo']],
      phrases: [['I am going to travel next month','Eu vou viajar no mês que vem'],['We are going to have a party','Nós vamos fazer uma festa'],['She is going to study tonight','Ela vai estudar hoje à noite']] },
    { titulo: 'Decisões com will', words: [['maybe','talvez'],['soon','logo'],['promise','prometer'],['help','ajudar'],['sure','certo'],['probably','provavelmente']],
      phrases: [['I will help you','Eu vou ajudar você'],['It will rain tomorrow','Vai chover amanhã'],['I will call you later','Eu vou te ligar mais tarde']] },
    { titulo: 'Sonhos e metas', words: [['dream','sonho'],['goal','meta'],['future','futuro'],['career','carreira'],['learn','aprender'],['succeed','ter sucesso']],
      phrases: [['My dream is to travel the world','Meu sonho é viajar pelo mundo'],['I will learn English well','Eu vou aprender inglês bem'],['She wants a good career','Ela quer uma boa carreira']] },
  ]}
);

// ---------- Teoria (explicações) de cada capítulo ----------
// blocos: título + texto + exemplos [inglês, português]; cuidados: erros comuns
window.TEORIA = {
  u1: { titulo: 'Cumprimentos e números', resumo: 'As primeiras frases que você usa em qualquer conversa em inglês.', blocos: [
    { t: 'Dizer olá', p: 'Hello e Hi servem a qualquer hora. Good morning é até o meio-dia, Good afternoon vai até o fim da tarde e Good evening é para a noite.', ex: [['Good morning, teacher!','Bom dia, professor!'],['Hi, how are you?','Oi, como vai você?']] },
    { t: 'Despedidas', p: 'Goodbye e Bye servem sempre. Good night é só para se despedir à noite, na hora de dormir (não use para cumprimentar).', ex: [['See you later','Até mais tarde'],['Good night, mom','Boa noite, mãe']] },
    { t: 'Conhecendo alguém', p: 'Use My name is… para dizer seu nome e Nice to meet you para o prazer em conhecer.', ex: [['My name is Ana','Meu nome é Ana'],['Nice to meet you','Prazer em conhecer você']] },
    { t: 'Números de 1 a 10', p: 'one, two, three, four, five, six, seven, eight, nine, ten. Depois do número, o substantivo vai para o plural: two friends.', ex: [['I have two friends','Eu tenho dois amigos']] },
  ], cuidados: ['Good night não é “boa noite” ao chegar: ao chegar à noite diga Good evening.', 'A pronúncia de thank you começa com o “th” com a língua entre os dentes.'] },
  u2: { titulo: 'Verbo to be e família', resumo: 'O verbo to be (ser/estar) é o mais usado do inglês.', blocos: [
    { t: 'Formas do verbo to be', p: 'I am · you are · he is · she is · it is · we are · you are · they are. Na fala usamos as formas curtas: I’m, you’re, he’s, she’s, we’re, they’re.', ex: [['I am a student','Eu sou um aluno'],['She is my sister','Ela é minha irmã'],['We are happy','Nós estamos felizes']] },
    { t: 'Possessivos', p: 'my (meu/minha), your (seu), his (dele), her (dela), our (nosso), their (deles). Eles vêm antes do substantivo.', ex: [['This is my mother','Esta é minha mãe'],['His brother is tall','O irmão dele é alto']] },
    { t: 'Negativa e pergunta', p: 'Para negar, coloque not depois do verbo: She is not (isn’t) tall. Para perguntar, inverta: Is she tall?', ex: [['He is not tired','Ele não está cansado'],['Are you happy?','Você está feliz?']] },
  ], cuidados: ['Para idade o inglês usa to be: I am 20 (não “I have 20”).', 'O inglês sempre pede o sujeito: It is cold (não “is cold”).'] },
  u3: { titulo: 'Comida e bebida', resumo: 'Como falar do que você come, bebe e gosta.', blocos: [
    { t: 'Gostar de algo', p: 'Use like + substantivo. Com he/she/it, o verbo ganha -s: She likes cheese.', ex: [['I like rice and beans','Eu gosto de arroz e feijão'],['He likes coffee','Ele gosta de café']] },
    { t: 'Pedir com educação', p: 'I would like… (I’d like) é mais educado do que I want. Use em restaurantes.', ex: [['I would like some water','Eu gostaria de um pouco de água'],['The bill, please','A conta, por favor']] },
    { t: 'A / an / some', p: 'Use a antes de som de consoante (a banana) e an antes de som de vogal (an apple). Para quantidades de coisas não contáveis, use some: some water, some bread.', ex: [['I eat an apple','Eu como uma maçã'],['I drink some juice','Eu bebo um pouco de suco']] },
  ], cuidados: ['Say “I am hungry”, não “I have hunger”.', 'Water, rice e bread não têm plural: não existe “breads” para o pão do dia a dia.'] },
  u4: { titulo: 'Rotina: Present Simple', resumo: 'O Present Simple fala de hábitos e de fatos que sempre acontecem.', blocos: [
    { t: 'Afirmativa', p: 'Use o verbo na forma base: I work, you work, we work. Com he/she/it acrescente -s (ou -es): she works, he watches.', ex: [['I wake up at seven','Eu acordo às sete'],['She works every day','Ela trabalha todo dia']] },
    { t: 'Negativa e pergunta', p: 'Use do/does. Com does, o verbo volta para a forma base: Does he work? He does not (doesn’t) work.', ex: [['Do you study English?','Você estuda inglês?'],['He does not sleep late','Ele não dorme tarde']] },
    { t: 'Advérbios de frequência', p: 'always, usually, often, sometimes, never ficam antes do verbo principal (e depois do verbo to be).', ex: [['I always eat breakfast','Eu sempre tomo café da manhã'],['She is never late','Ela nunca se atrasa']] },
    { t: 'Horários', p: 'Use at com horas (at seven), in com períodos do dia (in the morning) e on com dias (on Monday).', ex: [['I study in the morning','Eu estudo de manhã']] },
  ], cuidados: ['Errado: She work. Certo: She works.', 'Em Does he work? o verbo NÃO leva -s.'] },
  u5: { titulo: 'Present Continuous', resumo: 'Fala do que está acontecendo agora ou neste período.', blocos: [
    { t: 'Como formar', p: 'am / is / are + verbo com -ing. Exemplo: I am reading, she is singing, they are running.', ex: [['I am reading a book','Eu estou lendo um livro'],['They are running','Eles estão correndo']] },
    { t: 'Negativa e pergunta', p: 'Negativa: coloque not depois do verbo to be. Pergunta: inverta o verbo to be com o sujeito.', ex: [['I am not sleeping','Eu não estou dormindo'],['What are you doing?','O que você está fazendo?']] },
    { t: 'Palavras de apoio', p: 'now, right now, at the moment, today e this week mostram que a ação está em andamento.', ex: [['He is working now','Ele está trabalhando agora']] },
    { t: 'Regras de escrita', p: 'Verbo terminado em -e perde o e (make → making). Verbo curto com consoante final dobra a letra (run → running).', ex: [['She is making a cake','Ela está fazendo um bolo']] },
  ], cuidados: ['Verbos de estado (know, like, love, want) quase nunca usam -ing: I know (não “I am knowing”).', 'Não esqueça o verbo to be: He singing é errado; He is singing é certo.'] },
  u6: { titulo: 'Viagens e direções', resumo: 'Frases úteis para se virar no aeroporto, na rua e no hotel.', blocos: [
    { t: 'Pedir informação', p: 'Where is…? pergunta o lugar. Excuse me chama a atenção com educação.', ex: [['Excuse me, where is the gate?','Com licença, onde fica o portão?'],['Is it far from here?','Fica longe daqui?']] },
    { t: 'Direções', p: 'turn left (vire à esquerda), turn right (vire à direita), go straight ahead (siga em frente).', ex: [['Turn left here','Vire à esquerda aqui'],['Go straight ahead','Siga em frente']] },
    { t: 'Reservas', p: 'I have a reservation avisa que você já reservou. I need… pede algo que você precisa.', ex: [['I have a reservation','Eu tenho uma reserva'],['I need my passport','Eu preciso do meu passaporte']] },
  ], cuidados: ['Say “Excuse me” para chamar alguém e “Sorry” para pedir desculpas.', 'A palavra gate é “portão de embarque”; door é a porta comum.'] },
  u7: { titulo: 'There is / There are', resumo: 'Como dizer que algo existe ou onde fica.', blocos: [
    { t: 'There is e there are', p: 'There is (há) para um item; there are (há) para vários. Negativa: there isn’t / there aren’t. Pergunta: Is there…? / Are there…?', ex: [['There is a lamp on the table','Há uma luminária sobre a mesa'],['There are two chairs here','Há duas cadeiras aqui']] },
    { t: 'Preposições de lugar', p: 'on (sobre), under (embaixo), next to (ao lado), behind (atrás), in front of (na frente), between (entre), in (dentro).', ex: [['The cat is under the table','O gato está embaixo da mesa'],['The key is next to the phone','A chave está ao lado do telefone']] },
  ], cuidados: ['Não diga “have a lamp on the table” para “há”: use there is.', 'in = dentro; on = em cima de uma superfície.'] },
  u8: { titulo: 'Adjetivos, cores e preços', resumo: 'Em inglês o adjetivo vem antes do substantivo e nunca muda.', blocos: [
    { t: 'Ordem na frase', p: 'Adjetivo + substantivo: a red shirt (uma camisa vermelha). O adjetivo não tem plural: two red shirts.', ex: [['I like the red car','Eu gosto do carro vermelho'],['She has a new dress','Ela tem um vestido novo']] },
    { t: 'Vestir', p: 'wear (usar, vestir) e be wearing (estar usando agora).', ex: [['I wear black shoes','Eu uso sapatos pretos'],['He is wearing a hat','Ele está usando um chapéu']] },
    { t: 'Perguntar preço', p: 'How much is it? para um item; How much are they? para vários.', ex: [['How much is this shirt?','Quanto custa esta camisa?'],['It is too expensive','É caro demais']] },
  ], cuidados: ['Errado: a shirt red. Certo: a red shirt.', 'Pants e shoes sempre estão no plural: these pants.'] },
  u9: { titulo: 'Saúde e conselhos', resumo: 'Falar de dores, sintomas e dar conselhos com should.', blocos: [
    { t: 'Sintomas', p: 'Para doenças e sintomas usamos have: I have a fever, I have a headache. Para dor numa parte do corpo, use hurts: My head hurts.', ex: [['I have a fever','Eu estou com febre'],['My head hurts','Minha cabeça dói']] },
    { t: 'Dar conselhos', p: 'should + verbo base dá um conselho: You should rest. A negativa é should not (shouldn’t).', ex: [['You should see a doctor','Você deveria ir ao médico'],['He should not work today','Ele não deveria trabalhar hoje']] },
  ], cuidados: ['Depois de should o verbo fica sem -s: She should rest (não “shoulds”).', 'I am sick = estou doente; I feel sick = estou enjoado.'] },
  u10: { titulo: 'Profissões e trabalho', resumo: 'Como falar do que você e as pessoas fazem.', blocos: [
    { t: 'Dizer a profissão', p: 'Use to be + a/an + profissão: I am a teacher, she is an engineer (an antes de som de vogal).', ex: [['I am an engineer','Eu sou engenheiro'],['She is a lawyer','Ela é advogada']] },
    { t: 'Perguntar', p: 'What do you do? significa “Qual é a sua profissão?” (e não “o que você está fazendo agora”).', ex: [['What do you do?','O que você faz da vida?'],['I work at a bank','Eu trabalho em um banco']] },
    { t: 'In, at e on', p: 'work in an office (dentro de um local), work at a company/bank (no local), on Monday (dia da semana).', ex: [['I have a meeting at ten','Eu tenho uma reunião às dez']] },
  ], cuidados: ['Em inglês o artigo é obrigatório: I am a doctor (não “I am doctor”).'] },
  u11: { titulo: 'Past Simple', resumo: 'Ações terminadas no passado.', blocos: [
    { t: 'Verbos regulares', p: 'Acrescente -ed ao verbo: work → worked, play → played, cook → cooked. Se terminar em -e, só -d: dance → danced.', ex: [['We watched a movie','Nós assistimos a um filme'],['I visited my aunt yesterday','Eu visitei minha tia ontem']] },
    { t: 'Verbos irregulares', p: 'Têm forma própria e precisam ser decorados: go → went, eat → ate, see → saw, buy → bought, write → wrote, come → came.', ex: [['He went to the beach','Ele foi à praia'],['I bought a new phone','Eu comprei um celular novo']] },
    { t: 'Negativa e pergunta', p: 'Use did / did not (didn’t) + verbo na forma base: Did you study? I did not go.', ex: [['Did you study yesterday?','Você estudou ontem?'],['I did not go to school','Eu não fui à escola']] },
  ], cuidados: ['Depois de did o verbo volta ao normal: Did she go? (não “Did she went?”).', 'Palavras do passado: yesterday, last week, two days ago.'] },
  u12: { titulo: 'Futuro: will e going to', resumo: 'Duas maneiras de falar do que vai acontecer.', blocos: [
    { t: 'Going to', p: 'am/is/are going to + verbo é para planos já decididos: I am going to travel next month.', ex: [['We are going to have a party','Nós vamos fazer uma festa'],['She is going to study tonight','Ela vai estudar hoje à noite']] },
    { t: 'Will', p: 'will + verbo é para decisões na hora, promessas e previsões: I will help you. It will rain tomorrow.', ex: [['I will call you later','Eu vou te ligar mais tarde'],['It will rain tomorrow','Vai chover amanhã']] },
  ], cuidados: ['Depois de will o verbo fica na forma base, sem -s: He will come (não “he wills comes”).', 'Evite will + going to juntos: use só um dos dois.'] },
};
