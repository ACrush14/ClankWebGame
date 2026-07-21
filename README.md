# Clank Web

Versão web (e mobile-friendly) do jogo de tabuleiro Clank!, feita pra jogar com amigos direto do navegador. Veja [PLANNING.md](./PLANNING.md) para o plano completo, decisões de stack e status do projeto.

## Estrutura

- `client/` — React + TypeScript + Vite + Tailwind CSS + Framer Motion.
- `server/` — servidor de salas em tempo real com [Colyseus](https://colyseus.io/). Tem o motor de regras (`engine/`) plugado — é ele quem roda o jogo de verdade.
- `engine/` — motor de regras do jogo (TypeScript puro, sem UI/rede, testável isoladamente com Vitest).

## Rodando localmente (desenvolvimento — dois processos)

Requer Node.js 20+. Ideal pra desenvolver: o Vite dá hot-reload instantâneo no cliente.

```bash
npm install          # instala as três workspaces (client, server e engine)
npm run dev           # sobe client (http://localhost:5173) e server (ws://localhost:2567) juntos
npm run test:engine   # roda os testes unitários do motor de regras
```

Ou separadamente:

```bash
npm run dev:server    # só o servidor Colyseus
npm run dev:client    # só o cliente Vite
```

Para testar multiplayer localmente, abra `http://localhost:5173` em duas abas/dispositivos na mesma rede — a segunda entra usando o código de sala mostrado na primeira.

## Rodando em modo combinado (um processo só — igual produção)

O mesmo servidor Express que roda o Colyseus também serve os arquivos estáticos do cliente, se `client/dist` existir. Assim front e back viram **um processo só, uma porta só** — útil pra testar como vai ficar em produção, e simplifica o deploy (só precisa de **um** serviço de hospedagem, não dois).

```bash
npm run build:client   # builda o cliente (client/dist)
npm start               # sobe o server, que já serve o client/dist junto
```

Abra `http://localhost:2567` — tudo (front + WebSocket) na mesma porta. Sem `client/dist`, o servidor sobe normalmente e só atende o WebSocket (modo antigo).

## Variáveis de ambiente (client)

Copie `client/.env.example` para `client/.env.local` se o servidor não estiver em `ws://localhost:2567` (ex: testando de outro dispositivo na rede ou já em produção).
