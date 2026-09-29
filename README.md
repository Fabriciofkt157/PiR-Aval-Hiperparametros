# Avaliação cega — LoRAs do πR (Vercel)

Cada avaliador vê **1 pergunta + 11 respostas** (ordem embaralhada por avaliador e por pergunta, segredo no servidor) e dá 3 notas 0–5 (precisão factual, persona, português) → total 0–15.
Feito para celular: uma resposta por vez, 3 linhas de botões grandes (0–5); ao completar as 3 notas, avança sozinho para a próxima resposta. Os círculos numerados no topo pulam entre respostas; ao completar as 11, toque em “Salvar e próxima”. (No computador, as teclas 0–5, ← → e Enter também funcionam.)

## Deploy
1. Suba esta pasta para um **repositório PRIVADO** no GitHub (`data/questions.json` liga resposta→modelo) e importe na Vercel (sem build).
2. Token GitHub fine-grained só nesse repo, permissão **Contents: Read and write**.
3. Variáveis de ambiente na Vercel:

| Nome | Valor |
|---|---|
| `GITHUB_TOKEN` | token do passo 2 |
| `GITHUB_REPO` | `usuario/repo` |
| `AVALIADORES` | `ana:codigo1,bruno:codigo2,carla:codigo3,diego:codigo4` (códigos longos e aleatórios) |
| `BLIND_SALT` | string aleatória (`openssl rand -hex 32`) — não mude depois de começar |
| `ADMIN_TOKEN` | outro segredo, só seu |

4. Links pessoais: `https://SEU-APP.vercel.app/?k=codigo1` etc.

## Onde ficam os dados
- Um CSV por avaliador na branch **`resultados`** (criada automaticamente; deploy desativado nela pelo `vercel.json`): `results/<avaliador>.csv` com `avaliador,idx,modelo,precisao,persona,escrita,total,ts`. Reavaliar uma pergunta sobrescreve as linhas dela.
- **Você (admin):** `/api/export?k=ADMIN_TOKEN&format=csv` ou `&format=json` → todos os avaliadores, com prompt, resposta e modelo.
- **Avaliador:** botão “Baixar meu JSON” → só as próprias notas, **sem** nome de modelo (para não desfazer o cego).

## Trocar os dados
Coloque os `.jsonl` em `scripts/jsonl/` (um por modelo, campos `idx`, `prompt`, `resposta`) e rode `python3 scripts/build-data.py`.
