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

## Plano Pro
Energia ilimitada. O professor gera códigos no painel (30/90/180/365 dias) e o aluno resgata no Perfil.
Não há cobrança automática: o pagamento (ex.: Pix) é combinado fora do app.
