# Clank Web

Versão web (e mobile-friendly) do jogo de tabuleiro Clank!, feita pra jogar com amigos direto do navegador. Veja [PLANNING.md](./PLANNING.md) para o plano completo, decisões de stack e status do projeto.

## Estrutura

- `client/` — React + TypeScript + Vite + Tailwind CSS + Framer Motion.
- `server/` — servidor de salas em tempo real com [Colyseus](https://colyseus.io/).
- `engine/` — motor de regras do jogo (TypeScript puro, sem UI/rede, testável isoladamente com Vitest). Ainda não está plugado no `server/`.

## Rodando localmente

Requer Node.js 20+.

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

## Variáveis de ambiente (client)

Copie `client/.env.example` para `client/.env.local` se o servidor não estiver em `ws://localhost:2567` (ex: testando de outro dispositivo na rede ou já em produção).
