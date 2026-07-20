import { createServer } from "http";
import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { ClankRoom } from "./rooms/ClankRoom.js";

const port = Number(process.env.PORT ?? 2567);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("clank", ClankRoom);

httpServer.listen(port, () => {
  console.log(`Clank server ouvindo em ws://localhost:${port}`);
});
