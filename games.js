import { app } from "./state.js";
import { shuffleArray } from "./utils.js";
import {
  memoryMatchEmojis,
  truthPrompts,
  darePrompts,
  loveQuizQuestions
} from "./data.js";

export function getMyGameRole() {
  if (!app.currentUser || !app.currentCouple || !app.currentCouple.partnerId) return null;
  var ids = [app.currentUser.id, app.currentCouple.partnerId].sort();
  return ids[0] === app.currentUser.id ? "P1" : "P2";
}

export async function loadGameState(gameType) {
  if (!app.currentCouple) return null;

  var result = await app.supabase
    .from("game_states")
    .select("state")
    .eq("couple_id", app.currentCouple.id)
    .eq("game_type", gameType)
    .maybeSingle();

  if (result.error) {
    console.error("loadGameState error:", result.error);
    return null;
  }

  return result.data ? result.data.state : null;
}

export async function saveGameState(gameType, state) {
  if (!app.currentCouple || !app.currentUser) return;

  app.lastSavedGameState[gameType] = JSON.stringify(state);

  await app.supabase
    .from("game_states")
    .upsert(
      {
        couple_id: app.currentCouple.id,
        game_type: gameType,
        state: state,
        updated_by: app.currentUser.id,
        updated_at: new Date().toISOString()
      },
      { onConflict: "couple_id,game_type" }
    );
}

// ─── Tic Tac Toe ───

const tttGrid = document.getElementById("tttGrid");
const tttCells = tttGrid.querySelectorAll(".ttt-cell");
const tttStatusEl = document.getElementById("tttStatus");
const tttRestartBtn = document.getElementById("tttRestart");
const tttScoreXEl = document.getElementById("tttScoreX");
const tttScoreOEl = document.getElementById("tttScoreO");
const tttScoreDEl = document.getElementById("tttScoreD");
const tttOnlineBar = document.getElementById("tttOnlineBar");
const tttMyRoleEl = document.getElementById("tttMyRole");
const tttTurnTextEl = document.getElementById("tttTurnText");
const tttWaiting = document.getElementById("tttWaiting");

const TTT_X = "❤️";
const TTT_O = "💜";
const TTT_WINS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

let tttBoard = ["","","","","","","","",""];
let tttCurrentPlayer = TTT_X;
let tttGameOver = false;
let tttScores = { x: 0, o: 0, d: 0 };

function initTTT(saveToDb) {
  tttBoard = ["","","","","","","","",""];
  tttCurrentPlayer = TTT_X;
  tttGameOver = false;

  tttCells.forEach(function (cell) {
    cell.textContent = "";
    cell.disabled = false;
    cell.classList.remove("winner");
  });

  renderTTTStatus();

  if (saveToDb !== false) {
    saveTTTState(null, null);
  }
}

function renderTTTStatus() {
  if (!app.currentCouple || app.currentCouple.memberCount < 2 || !app.myTttRole) {
    tttOnlineBar.style.display = "none";
    tttWaiting.style.display = "block";
    tttWaiting.textContent = "You need a partner to play!";
    tttGrid.classList.add("game-board-disabled");
    tttStatusEl.textContent = "";
    return;
  }

  tttWaiting.style.display = "none";
  tttOnlineBar.style.display = "flex";

  var mySymbol = app.myTttRole === "P1" ? TTT_X : TTT_O;
  tttMyRoleEl.textContent = "You are " + mySymbol;

  if (tttGameOver) {
    tttGrid.classList.add("game-board-disabled");
    return;
  }

  var isMyTurn = tttCurrentPlayer === mySymbol;
  tttGrid.classList.toggle("game-board-disabled", !isMyTurn);
  tttTurnTextEl.textContent = isMyTurn ? "Your turn!" : "Partner's turn...";
  tttTurnTextEl.className = isMyTurn ? "your-turn" : "their-turn";
  tttStatusEl.textContent = tttCurrentPlayer + "'s turn";
}

function checkTTTWinner() {
  for (let i = 0; i < TTT_WINS.length; i++) {
    const a = TTT_WINS[i][0];
    const b = TTT_WINS[i][1];
    const c = TTT_WINS[i][2];

    if (tttBoard[a] && tttBoard[a] === tttBoard[b] && tttBoard[a] === tttBoard[c]) {
      return { winner: tttBoard[a], line: TTT_WINS[i] };
    }
  }

  if (tttBoard.every(function (cell) { return cell !== ""; })) {
    return { winner: "draw", line: null };
  }

  return null;
}

function applyTTTResult(result) {
  if (!result) return;

  tttGameOver = true;

  if (result.winner === "draw") {
    tttStatusEl.textContent = "It's a draw!";
    tttTurnTextEl.textContent = "Draw!";
    tttTurnTextEl.className = "";
    tttScores.d++;
    tttScoreDEl.textContent = tttScores.d;
  } else {
    var mySymbol = app.myTttRole === "P1" ? TTT_X : TTT_O;
    var iWon = result.winner === mySymbol;
    tttStatusEl.textContent = result.winner + " wins!";
    tttTurnTextEl.textContent = iWon ? "You win!" : "Partner wins!";
    tttTurnTextEl.className = iWon ? "your-turn" : "their-turn";

    result.line.forEach(function (idx) {
      tttCells[idx].classList.add("winner");
    });

    if (result.winner === TTT_X) {
      tttScores.x++;
      tttScoreXEl.textContent = tttScores.x;
    } else {
      tttScores.o++;
      tttScoreOEl.textContent = tttScores.o;
    }
  }

  tttCells.forEach(function (cell) { cell.disabled = true; });
}

function saveTTTState(winner, winLine) {
  saveGameState("tictactoe", {
    board: tttBoard.slice(),
    currentPlayer: tttCurrentPlayer,
    gameOver: tttGameOver,
    scores: { x: tttScores.x, o: tttScores.o, d: tttScores.d },
    winner: winner,
    winLine: winLine
  });
}

function handleTTTClick(index) {
  if (tttGameOver || tttBoard[index] !== "") return;
  if (!app.currentCouple || app.currentCouple.memberCount < 2) return;

  var mySymbol = app.myTttRole === "P1" ? TTT_X : TTT_O;
  if (tttCurrentPlayer !== mySymbol) return;

  tttBoard[index] = tttCurrentPlayer;
  tttCells[index].textContent = tttCurrentPlayer;

  var result = checkTTTWinner();
  var winner = null;
  var winLine = null;

  if (result) {
    applyTTTResult(result);
    winner = result.winner;
    winLine = result.line;
  } else {
    tttCurrentPlayer = tttCurrentPlayer === TTT_X ? TTT_O : TTT_X;
  }

  renderTTTStatus();
  saveTTTState(winner, winLine);
}

export function onTTTStateFromDB(state) {
  if (!state) return;

  tttBoard = state.board || ["","","","","","","","",""];
  tttCurrentPlayer = state.currentPlayer || TTT_X;
  tttGameOver = state.gameOver || false;
  tttScores = {
    x: (state.scores && state.scores.x) || 0,
    o: (state.scores && state.scores.o) || 0,
    d: (state.scores && state.scores.d) || 0
  };

  tttCells.forEach(function (cell, i) {
    cell.textContent = tttBoard[i];
    cell.disabled = tttGameOver;
    cell.classList.remove("winner");
  });

  tttScoreXEl.textContent = tttScores.x;
  tttScoreOEl.textContent = tttScores.o;
  tttScoreDEl.textContent = tttScores.d;

  if (tttGameOver && state.winner) {
    var mySymbol = app.myTttRole === "P1" ? TTT_X : TTT_O;
    if (state.winner === "draw") {
      tttStatusEl.textContent = "It's a draw!";
      tttTurnTextEl.textContent = "Draw!";
      tttTurnTextEl.className = "";
    } else {
      var iWon = state.winner === mySymbol;
      tttStatusEl.textContent = state.winner + " wins!";
      tttTurnTextEl.textContent = iWon ? "You win!" : "Partner wins!";
      tttTurnTextEl.className = iWon ? "your-turn" : "their-turn";
    }

    if (state.winLine) {
      state.winLine.forEach(function (idx) {
        tttCells[idx].classList.add("winner");
      });
    }
  }

  renderTTTStatus();
}

tttCells.forEach(function (cell) {
  cell.addEventListener("click", function () {
    handleTTTClick(parseInt(cell.dataset.index));
  });
});

tttRestartBtn.addEventListener("click", function () {
  initTTT(true);
});


// ─── Memory Match ───

const memoryGrid = document.getElementById("memoryGrid");
const memoryPairsEl = document.getElementById("memoryPairs");
const memoryMyScoreEl = document.getElementById("memoryMyScore");
const memoryPartnerScoreEl = document.getElementById("memoryPartnerScore");
const memoryRestartBtn = document.getElementById("memoryRestart");
const memoryOnlineBar = document.getElementById("memoryOnlineBar");
const memoryMyRoleEl = document.getElementById("memoryMyRole");
const memoryTurnTextEl = document.getElementById("memoryTurnText");
const memoryWaiting = document.getElementById("memoryWaiting");
const memoryStatsEl = document.getElementById("memoryStats");

let memoryCards = [];
let memoryFlipped = [];
let memoryMatchedIndices = [];
let memoryTotalMatched = 0;
let memoryScores = { P1: 0, P2: 0 };
let memoryCurrentTurn = "P1";
let memoryLocked = false;
let memoryInitialized = false;

function initMemoryGame(saveToDb) {
  memoryFlipped = [];
  memoryMatchedIndices = [];
  memoryTotalMatched = 0;
  memoryScores = { P1: 0, P2: 0 };
  memoryCurrentTurn = "P1";
  memoryLocked = false;
  memoryInitialized = false;

  if (!app.currentCouple || app.currentCouple.memberCount < 2 || !app.myMemoryRole) {
    renderMemoryStatus();
    return;
  }

  var pairs = memoryMatchEmojis.concat(memoryMatchEmojis);
  memoryCards = shuffleArray(pairs);
  buildMemoryGrid();
  memoryInitialized = true;

  renderMemoryStatus();

  if (saveToDb !== false) {
    saveMemoryState();
  }
}

function buildMemoryGrid() {
  memoryGrid.innerHTML = "";

  for (var i = 0; i < memoryCards.length; i++) {
    var card = document.createElement("button");
    card.type = "button";
    card.classList.add("memory-card");
    card.dataset.index = i;

    var back = document.createElement("span");
    back.classList.add("memory-card-back");
    back.textContent = "?";

    var emoji = document.createElement("span");
    emoji.classList.add("memory-card-emoji");
    emoji.textContent = memoryCards[i];

    card.appendChild(back);
    card.appendChild(emoji);

    (function (idx, cardEl) {
      cardEl.addEventListener("click", function () {
        handleMemoryCardClick(idx, cardEl);
      });
    })(i, card);

    memoryGrid.appendChild(card);
  }

  updateMemoryScoreDisplay();
}

function renderMemoryStatus() {
  if (!app.currentCouple || app.currentCouple.memberCount < 2 || !app.myMemoryRole) {
    memoryOnlineBar.style.display = "none";
    memoryWaiting.style.display = "block";
    memoryWaiting.textContent = "You need a partner to play!";
    memoryGrid.classList.add("game-board-disabled");
    memoryStatsEl.style.display = "none";
    return;
  }

  memoryWaiting.style.display = "none";
  memoryOnlineBar.style.display = "flex";
  memoryStatsEl.style.display = "flex";

  memoryMyRoleEl.textContent = app.myMemoryRole === "P1" ? "Player 1" : "Player 2";

  if (memoryTotalMatched >= 8) {
    memoryGrid.classList.add("game-board-disabled");
    return;
  }

  var isMyTurn = memoryCurrentTurn === app.myMemoryRole;
  memoryGrid.classList.toggle("game-board-disabled", !isMyTurn || memoryLocked);
  memoryTurnTextEl.textContent = isMyTurn ? "Your turn!" : "Partner's turn...";
  memoryTurnTextEl.className = isMyTurn ? "your-turn" : "their-turn";
}

function updateMemoryScoreDisplay() {
  var myScore = memoryScores[app.myMemoryRole] || 0;
  var partnerRole = app.myMemoryRole === "P1" ? "P2" : "P1";
  var partnerScore = memoryScores[partnerRole] || 0;

  memoryMyScoreEl.textContent = myScore;
  memoryPartnerScoreEl.textContent = partnerScore;
  memoryPairsEl.textContent = "Pairs: " + memoryTotalMatched + " / 8";
}

function saveMemoryState() {
  saveGameState("memory", {
    cards: memoryCards,
    matched: memoryMatchedIndices.slice(),
    flipped: memoryFlipped.map(function (f) { return f.index; }),
    totalMatched: memoryTotalMatched,
    scores: { P1: memoryScores.P1, P2: memoryScores.P2 },
    currentTurn: memoryCurrentTurn,
    initialized: memoryInitialized
  });
}

function handleMemoryCardClick(index, cardElement) {
  if (memoryLocked) return;
  if (!app.currentCouple || app.currentCouple.memberCount < 2 || !memoryInitialized) return;
  if (memoryCurrentTurn !== app.myMemoryRole) return;
  if (cardElement.classList.contains("flipped")) return;
  if (cardElement.classList.contains("matched")) return;

  flipMemoryCard(index, cardElement);

  if (memoryFlipped.length === 2) {
    evaluateMemoryPair();
  } else {
    saveMemoryState();
  }
}

function flipMemoryCard(index, cardElement) {
  if (!cardElement) {
    cardElement = memoryGrid.querySelectorAll(".memory-card")[index];
  }
  if (!cardElement || cardElement.classList.contains("flipped") || cardElement.classList.contains("matched")) return;

  cardElement.classList.add("flipped");
  memoryFlipped.push({ index: index, element: cardElement });
}

function evaluateMemoryPair() {
  memoryLocked = true;
  var first = memoryFlipped[0];
  var second = memoryFlipped[1];

  if (memoryCards[first.index] === memoryCards[second.index]) {
    first.element.classList.add("matched");
    second.element.classList.add("matched");
    memoryMatchedIndices.push(first.index, second.index);
    memoryScores[memoryCurrentTurn]++;
    memoryTotalMatched++;
    memoryFlipped = [];
    memoryLocked = false;

    updateMemoryScoreDisplay();
    renderMemoryStatus();
    saveMemoryState();

    if (memoryTotalMatched >= 8) {
      showMemoryEndState();
    }
  } else {
    window.setTimeout(function () {
      first.element.classList.remove("flipped");
      second.element.classList.remove("flipped");
      memoryFlipped = [];
      memoryCurrentTurn = memoryCurrentTurn === "P1" ? "P2" : "P1";
      memoryLocked = false;
      renderMemoryStatus();
      saveMemoryState();
    }, 700);
  }
}

function showMemoryEndState() {
  var myScore = memoryScores[app.myMemoryRole] || 0;
  var partnerRole = app.myMemoryRole === "P1" ? "P2" : "P1";
  var partnerScore = memoryScores[partnerRole] || 0;

  if (myScore > partnerScore) {
    memoryTurnTextEl.textContent = "You win!";
    memoryTurnTextEl.className = "your-turn";
  } else if (partnerScore > myScore) {
    memoryTurnTextEl.textContent = "Partner wins!";
    memoryTurnTextEl.className = "their-turn";
  } else {
    memoryTurnTextEl.textContent = "It's a tie!";
    memoryTurnTextEl.className = "";
  }
}

export function onMemoryStateFromDB(state) {
  if (!state || !state.initialized) return;

  memoryCards = state.cards;
  memoryTotalMatched = state.totalMatched || 0;
  memoryScores = { P1: (state.scores && state.scores.P1) || 0, P2: (state.scores && state.scores.P2) || 0 };
  memoryCurrentTurn = state.currentTurn || "P1";
  memoryMatchedIndices = state.matched || [];
  memoryInitialized = true;
  memoryLocked = false;

  buildMemoryGrid();

  var cardElements = memoryGrid.querySelectorAll(".memory-card");

  memoryMatchedIndices.forEach(function (idx) {
    cardElements[idx].classList.add("flipped", "matched");
  });

  memoryFlipped = [];
  if (state.flipped && state.flipped.length > 0) {
    state.flipped.forEach(function (idx) {
      cardElements[idx].classList.add("flipped");
      memoryFlipped.push({ index: idx, element: cardElements[idx] });
    });

    if (memoryFlipped.length === 2) {
      evaluateMemoryPair();
      return;
    }
  }

  updateMemoryScoreDisplay();
  renderMemoryStatus();

  if (memoryTotalMatched >= 8) {
    showMemoryEndState();
  }
}

memoryRestartBtn.addEventListener("click", function () {
  initMemoryGame(true);
});


// ─── Truth or Dare ───

const truthBtn = document.getElementById("truthBtn");
const dareBtn = document.getElementById("dareBtn");
const tdResult = document.getElementById("tdResult");
const tdResultLabel = document.getElementById("tdResultLabel");
const tdResultText = document.getElementById("tdResultText");
const tdNextBtn = document.getElementById("tdNext");

let tdLastType = null;

function showTruthOrDare(type) {
  const prompts = type === "truth" ? truthPrompts : darePrompts;
  const prompt = prompts[Math.floor(Math.random() * prompts.length)];

  tdResultLabel.textContent = type.toUpperCase();
  tdResultText.textContent = prompt;
  tdLastType = type;

  tdResult.classList.remove("td-result-truth", "td-result-dare");
  tdResult.classList.add("td-result-" + type);
  tdNextBtn.style.display = "block";
}

truthBtn.addEventListener("click", function () {
  showTruthOrDare("truth");
});

dareBtn.addEventListener("click", function () {
  showTruthOrDare("dare");
});

tdNextBtn.addEventListener("click", function () {
  if (tdLastType) {
    showTruthOrDare(tdLastType);
  }
});


// ─── Love Quiz ───

const quizContent = document.getElementById("quizContent");
const quizEnd = document.getElementById("quizEnd");
const quizProgressEl = document.getElementById("quizProgress");
const quizQuestionEl = document.getElementById("quizQuestion");
const quizOptionsEl = document.getElementById("quizOptions");
const quizNoteEl = document.getElementById("quizNote");
const quizEndScoreEl = document.getElementById("quizEndScore");
const quizRestartBtn = document.getElementById("quizRestart");

let quizCurrentIndex = 0;
let quizAnswered = 0;
let quizShuffled = [];

function initQuiz() {
  quizShuffled = shuffleArray(loveQuizQuestions);
  quizCurrentIndex = 0;
  quizAnswered = 0;
  quizContent.style.display = "block";
  quizEnd.style.display = "none";
  showQuizQuestion();
}

function showQuizQuestion() {
  if (quizCurrentIndex >= quizShuffled.length) {
    quizContent.style.display = "none";
    quizEnd.style.display = "block";
    quizEndScoreEl.textContent = "You answered " + quizAnswered + " out of " + quizShuffled.length + " questions together. Compare your answers and see how well you really know each other!";
    return;
  }

  const q = quizShuffled[quizCurrentIndex];
  quizProgressEl.textContent = "Question " + (quizCurrentIndex + 1) + " / " + quizShuffled.length;
  quizQuestionEl.textContent = q.question;
  quizNoteEl.textContent = q.note;
  quizNoteEl.classList.remove("visible");

  quizOptionsEl.innerHTML = "";

  for (let i = 0; i < q.options.length; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.classList.add("quiz-option");
    btn.textContent = q.options[i];

    btn.addEventListener("click", function () {
      quizOptionsEl.querySelectorAll(".quiz-option").forEach(function (b) {
        b.classList.remove("selected");
      });
      btn.classList.add("selected");
      quizNoteEl.classList.add("visible");
      quizAnswered++;

      window.setTimeout(function () {
        quizCurrentIndex++;
        showQuizQuestion();
      }, 1800);
    });

    quizOptionsEl.appendChild(btn);
  }
}

quizRestartBtn.addEventListener("click", initQuiz);


// ─── Game Launcher ───

const gamesGrid = document.getElementById("gamesGrid");
const gamePanels = {
  memory: document.getElementById("gameMemory"),
  tictactoe: document.getElementById("gameTictactoe"),
  truthdare: document.getElementById("gameTruthdare"),
  quiz: document.getElementById("gameQuiz")
};

const gameInitFunctions = {
  truthdare: function () {},
  quiz: initQuiz
};

export function initGames(recordEngagement) {
  gamesGrid.querySelectorAll(".game-launcher").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      var gameId = btn.dataset.game;
      gamesGrid.style.display = "none";
      gamePanels[gameId].style.display = "block";

      if (gameId === "tictactoe") {
        var tttState = await loadGameState("tictactoe");
        if (tttState) {
          onTTTStateFromDB(tttState);
        } else {
          initTTT(true);
        }
      } else if (gameId === "memory") {
        var memState = await loadGameState("memory");
        if (memState && memState.initialized) {
          onMemoryStateFromDB(memState);
        } else {
          initMemoryGame(true);
        }
      } else {
        gameInitFunctions[gameId]();
      }

      recordEngagement();
    });
  });

  document.querySelectorAll(".game-back-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var gameId = btn.dataset.close;
      gamePanels[gameId].style.display = "none";
      gamesGrid.style.display = "grid";
    });
  });
}

export async function subscribeToGameStates(onDateStateFromDB) {
  if (!app.currentCouple) return;

  if (app.gameChannel) {
    await app.supabase.removeChannel(app.gameChannel);
  }

  app.gameChannel = app.supabase
    .channel("game-states-" + app.currentCouple.id)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "game_states",
        filter: "couple_id=eq." + app.currentCouple.id
      },
      function (payload) {
        if (!payload.new) return;
        var gameType = payload.new.game_type;
        var stateStr = JSON.stringify(payload.new.state);

        if (stateStr === app.lastSavedGameState[gameType]) {
          app.lastSavedGameState[gameType] = null;
          return;
        }

        if (gameType === "tictactoe") {
          onTTTStateFromDB(payload.new.state);
        } else if (gameType === "memory") {
          onMemoryStateFromDB(payload.new.state);
        } else if (gameType === "date") {
          onDateStateFromDB(payload.new.state);
        }
      }
    )
    .subscribe();
}
