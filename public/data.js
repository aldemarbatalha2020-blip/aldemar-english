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
