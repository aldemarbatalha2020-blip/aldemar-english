# Aldemar English

Plataforma de inglês com missões, pontos, ranking semanal, chat, presentes e plano Pro.
Node + Postgres (`pg`). Sem frameworks no servidor.

## Variáveis de ambiente
- `DATABASE_URL` — Postgres (obrigatória em produção)
- `SESSION_SECRET` — texto longo e aleatório
- `CHAVE_PROFESSOR` — chave que libera o painel do professor (Perfil → "Sou o professor")
- `CHAVE_ALUNO` — chave da turma exigida para criar conta (opcional)
- `NODE_ENV=production`
- opcionais: `PRO_PRECO`, `PRO_INSTRUCOES` (texto mostrado na tela do plano Pro)

## Notificações, fotos, posts e moderação
- Notificações: defina `VAPID_PUBLIC`, `VAPID_PRIVATE` (e `VAPID_SUBJECT` = URL do site). No iPhone o app precisa estar na Tela de Início.
- Fotos de perfil e posts (foto/vídeo até 30 s) só aparecem depois da aprovação do professor; fotos não são permitidas em conversas privadas.
- Denúncias exigem motivo; 3 denúncias escondem o conteúdo até o professor decidir; só o professor silencia alunos.
- Áudios do chat são apagados após 30 dias; limite de 350 MB de mídia no banco.

## Perfis, stories, reels, chamadas e desafios
- Perfil público ou privado; seguir (privado exige aceitar o pedido); grade de posts no perfil.
- Posts: foto, vídeo até 1:30, reel (até 1 min) e story (24 h). Alunos "de confiança" (marcados pelo professor) publicam sem aprovação prévia.
- Fotos no chat: sala geral e conversas entre quem se segue mutuamente. Chamadas de áudio/vídeo: idem (professor pode chamar qualquer aluno).
- Chamadas usam WebRTC com servidores STUN gratuitos. Para redes difíceis (4G de algumas operadoras), defina `TURN_URL`, `TURN_USER`, `TURN_PASS` (ex.: um serviço TURN gratuito/pago).
- Desafios do dia/semana automáticos + desafios criados pelo professor (moedas de recompensa).

## Plano Pro
Energia ilimitada. O professor gera códigos no painel (30/90/180/365 dias) e o aluno resgata no Perfil.
Não há cobrança automática: o pagamento (ex.: Pix) é combinado fora do app.
