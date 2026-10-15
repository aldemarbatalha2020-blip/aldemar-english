// Livro de referência — materiais 18 a 34 (Gramática e Vocabulário).
(function () {
  var E = window.ESTUDOS = window.ESTUDOS || [];
  function m(n, cat, ic, t, r, b, d) { E.push({ id: 'e' + n, cat: cat, ic: ic, t: t, r: r, b: b, d: d }); }

  m(18, 'Gramática', '🚫', 'Past Simple: negativa e perguntas', 'Did resolve tudo: o verbo volta ao normal.',
    [{ t: 'Negativa', p: 'didn\'t + verbo na forma base (sem -ed).', ex: [['I didn\'t go to work.', 'Eu não fui trabalhar.'], ['She didn\'t call me.', 'Ela não me ligou.']] },
     { t: 'Perguntas', p: 'Did + sujeito + verbo base.', ex: [['Did you see the movie?', 'Você viu o filme?'], ['What did they eat?', 'O que eles comeram?']] },
     { t: 'Resposta curta', p: 'Yes, I did. / No, I didn\'t.', ex: [['Did he win? No, he didn\'t.', 'Ele ganhou? Não.']] }],
    'Com "did", o verbo principal NÃO vai para o passado: "Did you went?" está errado. Diga "Did you go?".');

  m(19, 'Gramática', '🔮', 'Futuro com will', 'Decisões na hora, previsões e promessas.',
    [{ t: 'Forma', p: 'will + verbo base, igual para todas as pessoas. Forma curta: \'ll. Negativa: won\'t.', ex: [['I\'ll help you.', 'Eu te ajudo.'], ['It won\'t rain tomorrow.', 'Não vai chover amanhã.']] },
     { t: 'Quando usar', p: 'Decisão no momento da fala, previsão, promessa, oferta.', ex: [['The phone is ringing. I\'ll answer it.', 'O telefone está tocando. Eu atendo.'], ['I think she will win.', 'Acho que ela vai ganhar.']] },
     { t: 'Pergunta', p: 'Will + sujeito + verbo.', ex: [['Will you come to the party?', 'Você virá à festa?']] }],
    'Pedidos educados: "Will you help me?" ou, mais suave, "Could you help me?".');

  m(20, 'Gramática', '🎯', 'Going to: planos', 'Planos e coisas que já estão decididas.',
    [{ t: 'Forma', p: 'am/is/are + going to + verbo base.', ex: [['I\'m going to study tonight.', 'Vou estudar hoje à noite.'], ['They\'re going to travel in July.', 'Eles vão viajar em julho.']] },
     { t: 'Will ou going to?', p: 'Going to = plano já feito ou evidência. Will = decisão na hora ou previsão.', ex: [['Look at the clouds! It\'s going to rain.', 'Olhe as nuvens! Vai chover.'], ['I\'ve decided: I\'m going to learn guitar.', 'Decidi: vou aprender violão.']] },
     { t: 'Na fala', p: 'Em conversa rápida, "going to" vira "gonna".', ex: [['What are you gonna do?', 'O que você vai fazer?']] }],
    'Use "gonna" só falando. Na escrita formal, escreva "going to".');

  m(21, 'Gramática', '💪', 'Can, could e may', 'Habilidade, permissão e pedidos.',
    [{ t: 'Can', p: 'Habilidade e permissão informal. Depois de can, verbo base. Negativa: can\'t.', ex: [['I can swim.', 'Eu sei nadar.'], ['Can I sit here?', 'Posso sentar aqui?']] },
     { t: 'Could', p: 'Pedido mais educado ou habilidade no passado.', ex: [['Could you open the window?', 'Você poderia abrir a janela?'], ['I could run fast when I was young.', 'Eu corria rápido quando era jovem.']] },
     { t: 'May', p: 'Permissão formal.', ex: [['May I come in?', 'Posso entrar?']] }],
    'Escala de educação: can < could < may. Em um restaurante, prefira "Could I have...?".');

  m(22, 'Gramática', '📏', 'Should, must e have to', 'Conselhos, regras e obrigações.',
    [{ t: 'Should', p: 'Conselho, opinião. Negativa: shouldn\'t.', ex: [['You should sleep more.', 'Você deveria dormir mais.'], ['He shouldn\'t drive fast.', 'Ele não deveria dirigir rápido.']] },
     { t: 'Must e have to', p: 'Obrigação. "Must" soa forte e vem de dentro. "Have to" é uma obrigação externa (regra, trabalho).', ex: [['I must call my mother.', 'Preciso ligar para minha mãe.'], ['I have to wear a uniform.', 'Tenho que usar uniforme.']] },
     { t: 'Atenção na negativa', p: '"Mustn\'t" = proibido. "Don\'t have to" = não é obrigatório.', ex: [['You mustn\'t smoke here.', 'Você não pode fumar aqui.'], ['You don\'t have to come.', 'Você não precisa vir.']] }],
    'Cuidado: "mustn\'t" e "don\'t have to" têm significados bem diferentes.');

  m(23, 'Gramática', '📈', 'Comparativos e superlativos', 'Maior, mais caro, o melhor.',
    [{ t: 'Palavras curtas', p: 'Adicione -er (comparativo) e the + -est (superlativo).', ex: [['tall → taller → the tallest', 'alto → mais alto → o mais alto'], ['big → bigger → the biggest', 'grande → maior → o maior']] },
     { t: 'Palavras longas', p: 'Use more e the most.', ex: [['This book is more interesting than that one.', 'Este livro é mais interessante que aquele.'], ['She is the most creative student.', 'Ela é a aluna mais criativa.']] },
     { t: 'Irregulares', p: 'good → better → the best · bad → worse → the worst · far → farther → the farthest.', ex: [['Your English is better than mine.', 'Seu inglês é melhor que o meu.']] },
     { t: 'Igualdade', p: 'as + adjetivo + as.', ex: [['He is as tall as his father.', 'Ele é tão alto quanto o pai.']] }],
    'Use "than" para comparar duas coisas: "taller than me".');

  m(24, 'Gramática', '📍', 'There is e There are', 'Dizer o que existe em um lugar.',
    [{ t: 'Forma', p: 'There is + singular. There are + plural. Negativa: there isn\'t / there aren\'t.', ex: [['There is a park near my house.', 'Há um parque perto de casa.'], ['There are three bedrooms.', 'Há três quartos.']] },
     { t: 'Perguntas', p: 'Is there...? Are there...?', ex: [['Is there a bank near here?', 'Há um banco aqui perto?'], ['Are there any students?', 'Há algum aluno?']] },
     { t: 'Some e any', p: 'Some na afirmativa, any na negativa e na pergunta.', ex: [['There are some apples.', 'Há algumas maçãs.'], ['There aren\'t any eggs.', 'Não há ovos.']] }],
    '"Have" não serve para existência ("have a park here" soa errado). Use there is/are.');

  m(25, 'Vocabulário', '👪', 'Família', 'Falar das pessoas da sua casa.',
    [{ t: 'Palavras-base', p: 'mother, father, parents, sister, brother, grandmother, grandfather, grandparents, aunt, uncle, cousin, son, daughter, husband, wife.', ex: [['I have two brothers and one sister.', 'Tenho dois irmãos e uma irmã.'], ['My grandmother lives with us.', 'Minha avó mora conosco.']] },
     { t: 'Mais íntimo', p: 'mom/dad (informal) · mother-in-law (sogra) · stepfather (padrasto) · nephew (sobrinho) · niece (sobrinha).', ex: [['My cousin is my best friend.', 'Meu primo é meu melhor amigo.']] },
     { t: 'Descrevendo', p: 'Use have/has e adjetivos.', ex: [['My father has a big family.', 'Meu pai tem uma família grande.']] }],
    'Desenhe sua árvore genealógica e escreva uma frase para cada pessoa.');

  m(26, 'Vocabulário', '🍽️', 'Comida e bebida', 'Pedir, gostar e não gostar de comida.',
    [{ t: 'Comidas', p: 'bread, rice, beans, chicken, beef, fish, egg, cheese, salad, soup, fruit, vegetables, pasta.', ex: [['I eat rice and beans every day.', 'Como arroz e feijão todo dia.']] },
     { t: 'Bebidas', p: 'water, juice, coffee, tea, milk, soda.', ex: [['Do you want some coffee?', 'Quer um café?']] },
     { t: 'Refeições', p: 'breakfast (café da manhã), lunch, dinner, snack (lanche).', ex: [['We have dinner at eight.', 'Jantamos às oito.']] },
     { t: 'Gostos', p: 'like, love, hate, can\'t stand.', ex: [['I can\'t stand mushrooms.', 'Não suporto cogumelos.']] }],
    'Peça "Could I have a coffee, please?": o "please" faz diferença.');

  m(27, 'Vocabulário', '🏠', 'Casa e cômodos', 'Descrever onde você mora.',
    [{ t: 'Cômodos', p: 'living room, kitchen, bedroom, bathroom, dining room, garage, garden, balcony.', ex: [['My kitchen is small but cozy.', 'Minha cozinha é pequena, mas aconchegante.']] },
     { t: 'Móveis e objetos', p: 'sofa, table, chair, bed, wardrobe, fridge, stove, TV, lamp, shelf.', ex: [['There is a lamp next to the bed.', 'Tem uma lâmpada ao lado da cama.']] },
     { t: 'Descrevendo a casa', p: 'Use there is/are e preposições.', ex: [['My house has two floors and a small garden.', 'Minha casa tem dois andares e um jardim pequeno.']] }],
    'Etiquete os objetos da sua casa com post-its em inglês por uma semana.');

  m(28, 'Vocabulário', '👕', 'Roupas e cores', 'Falar do que veste e comprar roupas.',
    [{ t: 'Roupas', p: 'shirt, T-shirt, pants, jeans, dress, skirt, jacket, coat, shoes, sneakers, socks, hat.', ex: [['She is wearing a blue dress.', 'Ela está usando um vestido azul.']] },
     { t: 'Cores', p: 'red, blue, green, yellow, black, white, gray, pink, purple, orange, brown.', ex: [['I like your green jacket.', 'Gosto da sua jaqueta verde.']] },
     { t: 'Provando', p: 'try on (experimentar), fit (servir), size (tamanho).', ex: [['Can I try this on?', 'Posso experimentar isto?'], ['It doesn\'t fit me.', 'Não serviu em mim.']] }],
    'Cor vem ANTES do substantivo: "a red car", e não "a car red".');

  m(29, 'Vocabulário', '🩺', 'Corpo e saúde', 'Dizer o que dói e pedir ajuda.',
    [{ t: 'Partes do corpo', p: 'head, eyes, ears, nose, mouth, neck, arm, hand, finger, leg, knee, foot, back, stomach.', ex: [['I have a headache.', 'Estou com dor de cabeça.']] },
     { t: 'Problemas comuns', p: 'a cold, a fever, a cough, a sore throat, a stomachache, a toothache.', ex: [['She has a fever.', 'Ela está com febre.'], ['My back hurts.', 'Minhas costas doem.']] },
     { t: 'No médico', p: 'doctor, nurse, medicine, appointment, pharmacy.', ex: [['I need an appointment with a doctor.', 'Preciso marcar uma consulta.']] }],
    'Para dor: "My ___ hurts" ou "I have a ___ache".');

  m(30, 'Vocabulário', '💼', 'Profissões', 'Falar do trabalho: what do you do?',
    [{ t: 'Profissões', p: 'teacher, doctor, nurse, driver, engineer, lawyer, waiter, cook, designer, programmer, police officer, salesperson.', ex: [['I\'m a nurse.', 'Sou enfermeira.'], ['He works as a driver.', 'Ele trabalha como motorista.']] },
     { t: 'Perguntas', p: '"What do you do?" ou "What\'s your job?" Responda com "I\'m a...".', ex: [['What do you do? I\'m an engineer.', 'O que você faz? Sou engenheiro.']] },
     { t: 'Lugares', p: 'office, hospital, school, factory, store, restaurant, home.', ex: [['She works at a hospital.', 'Ela trabalha em um hospital.']] }],
    'Antes de profissão use a/an: "I\'m a teacher", nunca "I\'m teacher".');

  m(31, 'Vocabulário', '🏙️', 'Cidade e direções', 'Perguntar onde fica e dar direções.',
    [{ t: 'Lugares', p: 'bank, bakery, supermarket, pharmacy, post office, hospital, bus stop, park, church, library.', ex: [['Is there a pharmacy near here?', 'Tem uma farmácia por aqui?']] },
     { t: 'Direções', p: 'turn left, turn right, go straight, at the corner, next to, across from, between.', ex: [['Go straight and turn left at the bank.', 'Siga em frente e vire à esquerda no banco.']] },
     { t: 'Perguntas', p: '"Excuse me, how do I get to...?" ou "Where is the...?".', ex: [['Excuse me, how do I get to the station?', 'Com licença, como chego à estação?']] }],
    'Responda com o número de quadras: "It\'s two blocks from here".');

  m(32, 'Vocabulário', '✈️', 'Transporte e viagens', 'Aeroporto, ônibus, hotel e passeios.',
    [{ t: 'Transportes', p: 'bus, train, subway, taxi, plane, bike, ferry. Use "by": by bus, by car, by plane. A pé: on foot.', ex: [['I go to work by bus.', 'Vou ao trabalho de ônibus.']] },
     { t: 'Viagem', p: 'ticket, passport, luggage, flight, gate, reservation, hotel, check-in, check-out.', ex: [['I have a reservation under Silva.', 'Tenho uma reserva em nome de Silva.']] },
     { t: 'Perguntas úteis', p: 'How long does it take? What time does it leave? How much is the ticket?', ex: [['What time does the train leave?', 'A que horas o trem parte?']] }],
    'Guarde 5 frases para aeroporto no celular: elas resolvem 90% da viagem.');

  m(33, 'Vocabulário', '⛅', 'Clima e estações', 'Falar do tempo, assunto número um do small talk.',
    [{ t: 'Clima', p: 'sunny, cloudy, rainy, windy, hot, cold, warm, cool, foggy, snowy, storm.', ex: [['It\'s sunny and hot today.', 'Está ensolarado e quente hoje.']] },
     { t: 'Perguntas', p: '"What\'s the weather like?" e "How\'s the weather?".', ex: [['What\'s the weather like in Recife?', 'Como está o tempo em Recife?']] },
     { t: 'Estações', p: 'spring, summer, fall (autumn), winter.', ex: [['Winter is my favorite season.', 'O inverno é minha estação favorita.']] }],
    'Para o tempo, o sujeito é sempre "it": "It is raining".');

  m(34, 'Vocabulário', '😊', 'Emoções e adjetivos', 'Dizer como você se sente.',
    [{ t: 'Sentimentos', p: 'happy, sad, angry, tired, nervous, excited, bored, scared, proud, worried.', ex: [['I\'m excited about the trip.', 'Estou animado com a viagem.']] },
     { t: '-ed e -ing', p: '-ed descreve como você se sente. -ing descreve o que causa o sentimento.', ex: [['I\'m bored.', 'Estou entediado.'], ['This movie is boring.', 'Este filme é chato.']] },
     { t: 'Perguntas', p: '"How are you feeling?" e "What\'s wrong?".', ex: [['What\'s wrong? I\'m just tired.', 'O que houve? Só estou cansado.']] }],
    'Troque "I\'m fine" por "I\'m doing great" ou "I\'m pretty good". Soa mais natural.');
})();
