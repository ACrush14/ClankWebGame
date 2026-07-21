import { describe, expect, it } from "vitest";
import { getCard } from "../src/cards.js";
import { GameEngine } from "../src/game.js";

function twoPlayerGame() {
  return new GameEngine([
    { id: "p1", name: "Anderson" },
    { id: "p2", name: "Brena" },
  ]);
}

describe("setup", () => {
  it("cada jogador começa com mão de 5 cartas e 5 restantes no draw pile (10 - 5)", () => {
    const game = twoPlayerGame();
    for (const player of game.state.players) {
      expect(player.hand).toHaveLength(5);
      expect(player.drawPile).toHaveLength(5);
      expect(player.discardPile).toHaveLength(0);
    }
  });

  it("preenche a Dungeon Row com 6 cartas", () => {
    const game = twoPlayerGame();
    expect(game.state.dungeonRow.slots).toHaveLength(6);
    expect(game.state.dungeonRow.slots.every((s) => s !== null)).toBe(true);
  });

  it("inicia a Reserva com as contagens reais do jogo base (Goblin 1, Explore 15, Mercenary 15, Secret Tome 12)", () => {
    const game = twoPlayerGame();
    expect(game.state.reserve.remaining).toEqual({
      goblin: 1,
      explore: 15,
      mercenary: 15,
      "secret-tome": 12,
    });
  });

  it("o primeiro jogador da lista começa jogando", () => {
    const game = twoPlayerGame();
    expect(game.currentPlayer.id).toBe("p1");
  });
});

describe("playCard", () => {
  it("jogar Burgle dá 1 skill e move a carta pra playedThisTurn", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.hand = ["burgle", "burgle", "sidestep", "scramble", "stumble"];

    game.playCard(player.id, "burgle");

    expect(player.resources.skill).toBe(1);
    expect(player.hand).toEqual(["burgle", "sidestep", "scramble", "stumble"]);
    expect(player.playedThisTurn).toEqual(["burgle"]);
  });

  it("jogar Stumble não dá recurso, só 1 Clank", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.hand = ["stumble"];

    game.playCard(player.id, "stumble");

    expect(player.resources).toEqual({ skill: 0, swords: 0, boots: 0 });
    expect(player.clank).toBe(1);
  });

  it("joga carta acumulando múltiplos recursos (Scramble = skill + boot)", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.hand = ["scramble"];

    game.playCard(player.id, "scramble");

    expect(player.resources.skill).toBe(1);
    expect(player.resources.boots).toBe(1);
  });

  it("lança erro se a carta não está na mão", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    expect(() => game.playCard(player.id, "burgle-que-nao-existe-na-mao")).toThrow();
  });

  it("lança erro se não é a vez do jogador", () => {
    const game = twoPlayerGame();
    const other = game.state.players[1];
    expect(() => game.playCard(other.id, "burgle")).toThrow(/não é a vez/i);
  });

  it("Lie in Wait dá -2 Clank extra só quando jogada na Caverna de Cristal", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.clank = 3;
    player.hand = ["lie-in-wait"];

    game.playCard(player.id, "lie-in-wait");

    // fora da Caverna de Cristal: só o efeito base (skill 2 + swords 1), sem o -2 Clank condicional
    expect(player.clank).toBe(3);
    expect(player.resources.skill).toBe(2);
    expect(player.resources.swords).toBe(1);
  });

  it("Lie in Wait aplica o -2 Clank condicional na Caverna de Cristal", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.roomId = "crystal-cave";
    player.clank = 3;
    player.hand = ["lie-in-wait"];

    game.playCard(player.id, "lie-in-wait");

    expect(player.clank).toBe(1);
  });
});

describe("acquireCard", () => {
  it("compra a carta da Dungeon Row pagando skill e ela vai pro descarte do jogador", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;

    // garante carta de sobra no monte de compra pra testar o reabastecimento do slot
    game.state.dungeonRow.drawPile.unshift("bard");
    game.state.dungeonRow.slots[0] = "expert-guide";
    player.resources.skill = getCard("expert-guide").skillCost ?? 0;

    game.acquireCard(player.id, 0);

    expect(player.discardPile).toContain("expert-guide");
    expect(player.resources.skill).toBe(0);
    expect(game.state.dungeonRow.slots[0]).not.toBeNull();
  });

  it("Device vai pro descarte da masmorra, não pro baralho do jogador (regra oficial)", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;

    game.state.dungeonRow.drawPile.unshift("bard");
    game.state.dungeonRow.slots[0] = "darkened-alcove";
    player.clank = 2;
    player.resources.skill = getCard("darkened-alcove").skillCost ?? 0;

    game.acquireCard(player.id, 0);

    expect(player.discardPile).not.toContain("darkened-alcove");
    expect(game.state.dungeonRow.discardPile).toContain("darkened-alcove");
    expect(player.clank).toBe(0); // efeito de USE (-2 Clank!) ainda é aplicado na hora
  });

  it("lança erro se skill insuficiente", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.resources.skill = 0;
    // garante que a posição 0 não é uma carta de custo 0
    game.state.dungeonRow.slots[0] = "explore";

    expect(() => game.acquireCard(player.id, 0)).toThrow(/skill insuficiente/i);
  });

  it("lança erro ao tentar comprar um monstro com acquireCard", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    game.state.dungeonRow.slots[0] = "skeleton";
    player.resources.skill = 99;

    expect(() => game.acquireCard(player.id, 0)).toThrow(/monstro/i);
  });
});

describe("fightMonster", () => {
  it("vence o monstro pagando swords, ganha a recompensa, e a carta NÃO vai pro baralho do jogador", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    game.state.dungeonRow.drawPile.unshift("skeleton");
    game.state.dungeonRow.slots[0] = "skeleton";
    player.resources.swords = 1;

    game.fightMonster(player.id, 0);

    expect(player.resources.swords).toBe(0);
    expect(player.gold).toBe(2);
    expect(player.discardPile).not.toContain("skeleton");
    expect(game.state.dungeonRow.discardPile).toContain("skeleton");
  });

  it("lança erro se swords insuficientes", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    game.state.dungeonRow.slots[0] = "skeleton";
    player.resources.swords = 0;

    expect(() => game.fightMonster(player.id, 0)).toThrow(/swords insuficientes/i);
  });
});

describe("acquireFromReserve", () => {
  it("compra Explore da Reserva pagando skill e consome uma cópia da pilha (15 -> 14)", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.resources.skill = 3;

    game.acquireFromReserve(player.id, "explore");

    expect(player.discardPile).toContain("explore");
    expect(player.resources.skill).toBe(0);
    expect(game.state.reserve.remaining.explore).toBe(14);
  });

  it("Goblin nunca esgota a Reserva, mesmo lutado várias vezes", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.resources.swords = 10;

    game.acquireFromReserve(player.id, "goblin");
    game.acquireFromReserve(player.id, "goblin");
    game.acquireFromReserve(player.id, "goblin");

    expect(game.state.reserve.remaining.goblin).toBe(1);
    expect(player.gold).toBe(3);
  });

  it("lança erro quando a pilha da Reserva esgota", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    game.state.reserve.remaining["secret-tome"] = 0;
    player.resources.skill = 99;

    expect(() => game.acquireFromReserve(player.id, "secret-tome")).toThrow(/esgotou/i);
  });

  it("lança erro se skill/swords insuficientes na Reserva", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.resources.skill = 0;
    player.resources.swords = 0;

    expect(() => game.acquireFromReserve(player.id, "mercenary")).toThrow(/skill insuficiente/i);
    expect(() => game.acquireFromReserve(player.id, "goblin")).toThrow(/swords insuficientes/i);
  });
});

describe("endTurn", () => {
  it("descarta mão e cartas jogadas, compra 5 novas, zera recursos e passa a vez", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.hand = ["burgle", "burgle"];
    player.playedThisTurn = ["stumble"];
    player.resources.skill = 3;

    game.endTurn(player.id);

    expect(player.hand).toHaveLength(5);
    expect(player.playedThisTurn).toHaveLength(0);
    expect(player.resources).toEqual({ skill: 0, swords: 0, boots: 0 });
    expect(game.currentPlayer.id).toBe("p2");
  });

  it("lança erro se quem chama endTurn não é o jogador da vez", () => {
    const game = twoPlayerGame();
    const other = game.state.players[1];
    expect(() => game.endTurn(other.id)).toThrow(/não é a vez/i);
  });

  it("dá a volta pro primeiro jogador depois do último", () => {
    const game = twoPlayerGame();
    game.endTurn("p1");
    game.endTurn("p2");
    expect(game.currentPlayer.id).toBe("p1");
  });

  it("pula jogadores nocauteados ao avançar o turno", () => {
    const game = new GameEngine([
      { id: "p1", name: "A" },
      { id: "p2", name: "B" },
      { id: "p3", name: "C" },
    ]);
    game.state.players[1].knockedOut = true;

    game.endTurn("p1");

    expect(game.currentPlayer.id).toBe("p3");
  });
});

describe("movePlayer", () => {
  it("lança erro se boots insuficientes", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.resources.boots = 0;
    expect(() => game.movePlayer(player.id, "mine-entry")).toThrow(/boots insuficientes/i);
  });

  it("move pra sala vizinha gastando 1 boot", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.resources.boots = 1;
    game.movePlayer(player.id, "mine-entry");
    expect(player.roomId).toBe("mine-entry");
    expect(player.resources.boots).toBe(0);
  });

  it("túnel de pegada custa 2 boots", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.roomId = "mine-entry";
    player.resources.boots = 2;
    game.movePlayer(player.id, "narrow-passage");
    expect(player.roomId).toBe("narrow-passage");
    expect(player.resources.boots).toBe(0);
  });

  it("túnel com monstro: paga swords automaticamente quando tem o suficiente", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.roomId = "mine-entry"; // guard-post só liga em mine-entry, não na entrada
    player.resources.boots = 1;
    player.resources.swords = 1;
    game.movePlayer(player.id, "guard-post");
    expect(player.resources.swords).toBe(0);
    expect(player.damage).toBe(0);
  });

  it("túnel com monstro sem swords suficientes causa 1 de dano em vez de bloquear", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.roomId = "mine-entry";
    player.resources.boots = 1;
    player.resources.swords = 0;
    game.movePlayer(player.id, "guard-post");
    expect(player.roomId).toBe("guard-post");
    expect(player.damage).toBe(1);
  });

  it("lança erro se não há túnel direto pra sala destino", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.resources.boots = 99;
    expect(() => game.movePlayer(player.id, "depths-east")).toThrow(/não há túnel/i);
  });
});

describe("takeArtifact", () => {
  it("pega um artefato pequeno (7 pts) e avança a Trilha de Fúria em +1", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.roomId = "depths-west"; // 7 pontos
    const rageBefore = game.state.dragon.rageTrackPosition;

    game.takeArtifact(player.id);

    expect(player.points).toBe(7);
    expect(game.state.dragon.rageTrackPosition).toBe(rageBefore + 1);
    expect(game.state.claimedArtifacts["depths-west"]).toBe(true);
  });

  it("pega um artefato grande (25 pts) e a Trilha de Fúria avança os mesmos +1 fixos (regra oficial, não escala com o valor)", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.hasMasterKey = true;
    player.roomId = "sealed-vault"; // 25 pontos
    const rageBefore = game.state.dragon.rageTrackPosition;

    game.takeArtifact(player.id);

    expect(player.points).toBe(25);
    expect(game.state.dragon.rageTrackPosition).toBe(rageBefore + 1);
  });

  it("lança erro se a sala atual não tem artefato", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    expect(() => game.takeArtifact(player.id)).toThrow(/não tem artefato/i);
  });

  it("lança erro se o artefato já foi pego", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.roomId = "depths-east";
    game.takeArtifact(player.id);
    expect(() => game.takeArtifact(player.id)).toThrow(/já foi pego/i);
  });

  it("sem Mochila só carrega 1 artefato por vez", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.hasMasterKey = true;
    player.roomId = "depths-west";
    game.takeArtifact(player.id);
    expect(player.artifactsCarried).toBe(1);

    player.roomId = "sealed-vault";
    expect(() => game.takeArtifact(player.id)).toThrow(/já está carregando o máximo/i);
    // não pontuou o segundo artefato nem marcou a sala como já pega
    expect(player.points).toBe(7);
    expect(game.state.claimedArtifacts["sealed-vault"]).toBeUndefined();
  });

  it("com a Mochila dá pra carregar 2 artefatos", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.hasMasterKey = true;
    player.hasBackpack = true;
    player.roomId = "depths-west";
    game.takeArtifact(player.id);

    player.roomId = "sealed-vault";
    game.takeArtifact(player.id);

    expect(player.artifactsCarried).toBe(2);
    expect(player.points).toBe(7 + 25);
  });
});

describe("ataque do dragão (disparado ao repor a Dungeon Row)", () => {
  it("dano o jogador cujo cubo é sorteado do saco", () => {
    const game = new GameEngine(
      [
        { id: "p1", name: "A" },
        { id: "p2", name: "B" },
      ],
      () => 0, // rng determinístico: sempre escolhe o primeiro ticket do saco
    );
    const player = game.currentPlayer;
    player.clank = 1;
    player.resources.swords = 2;
    game.state.dragon.rageTrackPosition = 2; // sorteia 1 cubo (posição - 1)
    game.state.dungeonRow.slots[0] = "keymaster"; // monstro sem recompensa de gold/clank
    game.state.dungeonRow.drawPile.unshift("crystal-kobold"); // tem o símbolo de ataque do dragão

    game.fightMonster(player.id, 0);

    expect(player.damage).toBe(1);
    expect(player.clank).toBe(0);
  });

  it("na posição 1 da trilha não sorteia nenhum cubo (sem ataque)", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.clank = 1;
    player.resources.swords = 2;
    game.state.dungeonRow.slots[0] = "keymaster";
    game.state.dungeonRow.drawPile.unshift("crystal-kobold");

    game.fightMonster(player.id, 0);

    expect(player.damage).toBe(0);
  });
});

describe("túneis com cadeado e de mão única", () => {
  it("lança erro ao tentar passar por um túnel com cadeado sem a Chave-mestra", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.roomId = "deep-tunnel";
    player.resources.boots = 1;
    expect(() => game.movePlayer(player.id, "sealed-vault")).toThrow(/cadeado/i);
  });

  it("com a Chave-mestra, passa livremente", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.roomId = "deep-tunnel";
    player.hasMasterKey = true;
    player.resources.boots = 1;
    game.movePlayer(player.id, "sealed-vault");
    expect(player.roomId).toBe("sealed-vault");
  });

  it("o escorregador da Câmara Selada só funciona num sentido", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.roomId = "sealed-vault";
    player.resources.boots = 1;
    game.movePlayer(player.id, "entrance");
    expect(player.roomId).toBe("entrance");

    // não existe túnel de volta da entrada pro cofre
    player.resources.boots = 99;
    expect(() => game.movePlayer(player.id, "sealed-vault")).toThrow(/não há túnel/i);
  });
});

describe("buyMarketItem", () => {
  function inMarket(game: GameEngine) {
    const player = game.currentPlayer;
    player.roomId = "market-room";
    return player;
  }

  it("lança erro se não estiver numa sala de Mercado", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.gold = 99;
    expect(() => game.buyMarketItem(player.id, "key")).toThrow(/sala de mercado/i);
  });

  it("lança erro se gold insuficiente", () => {
    const game = twoPlayerGame();
    const player = inMarket(game);
    player.gold = 0;
    expect(() => game.buyMarketItem(player.id, "key")).toThrow(/gold insuficiente/i);
  });

  it("compra a Chave-mestra, gasta 7 gold, e ela não pode ser comprada de novo", () => {
    const game = twoPlayerGame();
    const player = inMarket(game);
    player.gold = 7;

    game.buyMarketItem(player.id, "key");

    expect(player.hasMasterKey).toBe(true);
    expect(player.gold).toBe(0);
    expect(game.state.market.masterKeyAvailable).toBe(false);

    const other = game.state.players[1];
    other.roomId = "market-room";
    other.gold = 7;
    game.endTurn(player.id);
    expect(() => game.buyMarketItem(other.id, "key")).toThrow(/já foi comprada/i);
  });

  it("compra coroas em ordem decrescente de valor (10, depois 9)", () => {
    const game = twoPlayerGame();
    const player = inMarket(game);
    player.gold = 14;

    game.buyMarketItem(player.id, "crown");
    expect(player.points).toBe(10);

    game.buyMarketItem(player.id, "crown");
    expect(player.points).toBe(19);
    expect(game.state.market.crownsAvailable).toEqual([8]);
  });
});

describe("leaveDungeon e fim de jogo", () => {
  it("lança erro se não estiver na sala de Entrada", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.roomId = "mine-entry";
    expect(() => game.leaveDungeon(player.id)).toThrow(/entrada/i);
  });

  it("sair pela primeira vez começa a Trilha de Contagem Regressiva", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;

    game.leaveDungeon(player.id);

    expect(player.hasLeftDungeon).toBe(true);
    expect(game.state.countdownTrack).toBe(1);
    expect(game.state.phase).toBe("playing"); // o outro jogador ainda está na masmorra
  });

  it("termina a partida e calcula a pontuação quando todos saem/são nocauteados", () => {
    const game = twoPlayerGame();
    const [p1, p2] = game.state.players;
    p1.points = 10; // artefato pego

    game.leaveDungeon(p1.id); // já avança a vez sozinho (não tem mais o que fazer depois de sair)
    expect(game.currentPlayer.id).toBe(p2.id);

    game.leaveDungeon(p2.id);

    expect(game.state.phase).toBe("ended");
    expect(game.state.finalScores).toBeDefined();
    expect(game.state.finalScores![p1.id]).toBe(10);
  });

  it("Mastery: +20 pontos pra quem escapa carregando um artefato antes de ser nocauteado", () => {
    const game = twoPlayerGame();
    const [p1, p2] = game.state.players;
    p1.roomId = "depths-west"; // 7 pontos
    game.takeArtifact(p1.id); // p1 pega o artefato de verdade (artifactsCarried = 1)
    p1.roomId = "entrance";

    game.leaveDungeon(p1.id); // escapou carregando artefato -> ganha Mastery
    game.leaveDungeon(p2.id); // p2 não tem artefato -> sem Mastery

    expect(game.state.finalScores![p1.id]).toBe(7 + 20);
    expect(game.state.finalScores![p2.id]).toBe(0);
  });

  it("jogador nocauteado sem nenhum artefato/coroa pontua 0 (eliminado)", () => {
    const game = twoPlayerGame();
    const [p1, p2] = game.state.players;
    p1.points = 0;
    p1.damage = 10;
    p1.knockedOut = true;
    p2.points = 5;
    game.state.currentPlayerIndex = 1; // p1 nocauteado manualmente, não passou pelo advanceTurn

    game.leaveDungeon(p2.id);

    expect(game.state.finalScores![p1.id]).toBe(0);
  });

  it("só o primeiro a sair usa a Trilha de Contagem Regressiva — anda nos PRÓPRIOS turnos seguintes, não em qualquer ataque do dragão", () => {
    const game = new GameEngine(
      [
        { id: "p1", name: "A" },
        { id: "p2", name: "B" },
      ],
      () => 0.99, // evita sortear cubo de jogador nos ataques normais (cai nos cubos pretos)
    );
    const [p1, p2] = game.state.players;
    game.leaveDungeon(p1.id); // p1 vira o "marcador" da trilha (casa 1); vez passa pro p2 sozinha
    expect(game.state.countdownPlayerId).toBe(p1.id);
    expect(game.state.countdownTrack).toBe(1);
    expect(game.currentPlayer.id).toBe(p2.id);

    // um ataque de dragão normal (disparado por reposição da Row) NÃO deve mexer na trilha.
    game.state.dungeonRow.drawPile.unshift("crystal-kobold");
    game.state.dungeonRow.slots[0] = "crystal-kobold";
    game.state.dragon.rageTrackPosition = 2;
    const triggerRefill = (game as unknown as { refillDungeonSlot: (i: number) => void }).refillDungeonSlot.bind(
      game,
    );
    triggerRefill(0);
    expect(game.state.countdownTrack).toBe(1);

    // p2 termina o turno -> como só sobra p1 (o marcador) no rodízio, ele processa a
    // trilha em vez de jogar (casa 1 -> 2), e a vez volta pro p2.
    game.endTurn(p2.id);
    expect(game.state.countdownTrack).toBe(2);
    expect(game.currentPlayer.id).toBe(p2.id);

    game.endTurn(p2.id); // casa 2 -> 3
    game.endTurn(p2.id); // casa 3 -> 4
    expect(game.state.countdownTrack).toBe(4);

    game.endTurn(p2.id); // casa 4 -> 5: nocauteia quem ainda está dentro
    expect(p2.knockedOut).toBe(true);
    expect(game.state.countdownTrack).toBe(5);
    expect(game.state.phase).toBe("ended");
  });
});
