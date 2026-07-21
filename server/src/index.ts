import { createServer } from "http";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { ClankRoom } from "./rooms/ClankRoom.js";

const port = Number(process.env.PORT ?? 2567);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/**
 * Serve o front-end já buildado (client/dist) no mesmo servidor, se ele existir.
 * Só precisa disso em produção — em dev, o Vite serve o cliente separadamente
 * (npm run dev na raiz), com hot-reload de verdade. Rodar `npm run build:client`
 * antes de `npm start` deixa front + back juntos num único processo/host.
 */
const clientDist = path.resolve(__dirname, "../../client/dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/health|\/matchmake|\/colyseus).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
  console.log(`Servindo o cliente buildado de ${clientDist}`);
} else {
  console.log("client/dist não encontrado — rode `npm run build:client` na raiz pra servir o front junto (ou use `npm run dev` pra desenvolvimento com hot-reload).");
}

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("clank", ClankRoom);

httpServer.listen(port, () => {
  console.log(`Clank server ouvindo em ws://localhost:${port}`);
});
