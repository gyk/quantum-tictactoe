import { useMemo, useState, type ReactNode } from "react";
import "./App.css";
import { QuantumTicTacToe, type Player, type Square } from "./game/quantum";

const PLAYER_LABEL: Record<Player, string> = { X: "Player X", O: "Player O" };

const joinClasses = (...parts: Array<string | false | undefined>) =>
  parts.filter((part): part is string => Boolean(part)).join(" ");

function useGame() {
  const [game, _] = useState(() => new QuantumTicTacToe());
  // Force re-render key, increment when state changed via imperative game methods
  const [tick, setTick] = useState(0);
  const rerender = () => setTick((t) => t + 1);
  return { game, tick, rerender };
}

function SquareButton({
  idx,
  onClick,
  disabled,
  content,
  highlighted,
  firstPick,
}: {
  idx: Square;
  onClick: (i: Square) => void;
  disabled?: boolean;
  content?: ReactNode;
  highlighted?: boolean;
  firstPick?: boolean;
}) {
  return (
    <button
      className={"sq" + (highlighted ? " highlight" : "") + (firstPick ? " first-pick" : "")}
      disabled={disabled}
      onClick={() => onClick(idx)}
    >
      {firstPick && <span className="first-pick-ring" aria-hidden />}
      {content}
    </button>
  );
}

function Board({
  onSelectSquare,
  game,
  highlight,
  currentTurn,
  measuring,
  entangledMoveId,
  firstPickSquare,
}: {
  onSelectSquare: (i: Square) => void;
  game: QuantumTicTacToe;
  highlight?: Set<number>;
  currentTurn?: Player;
  measuring?: boolean;
  entangledMoveId?: number;
  firstPickSquare?: Square | null;
}) {
  const classical = game.classical;
  const moveMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of game.listMoves()) {
      const sub = m.id;
      const ch = m.player;
      map.set(m.id, `${ch}${sub}`);
    }
    return map;
  }, [game, game.listMoves().length]);

  const tokens: Array<
    Array<{
      player: Player;
      text: string;
      kind: "classical" | "spooky";
      pos?: Square;
      id?: number;
    }>
  > = Array.from({ length: 9 }, () => []);
  for (let i = 0; i < 9; i++) {
    const mark = classical[i];
    if (mark)
      tokens[i].push({
        player: mark.player,
        text: `${mark.player}${mark.moveId}`,
        kind: "classical",
        id: mark.moveId,
      });
  }
  for (const m of game.listMoves()) {
    if (m.collapsedTo !== undefined) continue;
    const name = moveMap.get(m.id)!;
    if (!game.classical[m.a])
      tokens[m.a].push({
        player: m.player,
        text: name,
        kind: "spooky",
        pos: m.b,
        id: m.id,
      });
    if (!game.classical[m.b])
      tokens[m.b].push({
        player: m.player,
        text: name,
        kind: "spooky",
        pos: m.a,
        id: m.id,
      });
  }
  const contents = Array.from({ length: 9 }, (_, i) => {
    const counts = new Map<number, number>();
    for (const t of tokens[i]) {
      if (t.kind === "spooky" && t.pos !== undefined) {
        counts.set(t.pos, (counts.get(t.pos) ?? 0) + 1);
      }
    }
    return (
      <div className="tokens">
        {tokens[i].map((t, idx) => {
          const overlapped =
            t.kind === "spooky" && t.pos !== undefined && (counts.get(t.pos) ?? 0) > 1;
          const tokenClassName = joinClasses(
            "token",
            t.player === "X" ? "x" : "o",
            t.kind,
            t.kind === "spooky" && t.pos !== undefined ? `pos-${t.pos}` : "center",
            t.kind === "spooky" && t.id === entangledMoveId ? "entangled" : undefined,
            overlapped ? "shift" : undefined,
          );

          return (
            <span key={idx} className={tokenClassName}>
              {t.kind === "classical" ? (
                <>
                  <span className="letter">{t.player}</span>
                  <sub className="sub">{t.id}</sub>
                </>
              ) : (
                t.text
              )}
            </span>
          );
        })}
      </div>
    );
  });

  const disabled = (i: number) => !!classical[i];

  const boardClassName = joinClasses(
    "board",
    currentTurn === "X"
      ? "x-turn"
      : currentTurn === "O"
        ? "o-turn"
        : undefined,
    measuring ? "measuring" : undefined,
  );

  return (
    <div className={boardClassName}>
      {Array.from({ length: 9 }, (_, i) => (
        <SquareButton
          key={i}
          idx={i as Square}
          onClick={onSelectSquare}
          disabled={disabled(i)}
          content={contents[i]}
          highlighted={highlight?.has(i)}
          firstPick={firstPickSquare !== null && firstPickSquare === i}
        />
      ))}
    </div>
  );
}

// (unused component kept previously)
function App() {
  const { game, rerender } = useGame();
  const status = game.status;

  const [pendingA, setPendingA] = useState<Square | null>(null);

  const hasStarted = game.listMoves().length > 0;

  const handleSquareClick = (i: Square) => {
    try {
      if (status.kind === "awaitingMove") {
        if (pendingA === null) {
          setPendingA(i);
          return;
        }
        if (pendingA === i) { setPendingA(null); return; }
        game.play(pendingA, i);
        setPendingA(null);
        rerender();
        return;
      }
      if (status.kind === "awaitingMeasurement") {
        // choice must be squares[0] or squares[1]
        const a = status.squares[0];
        const b = status.squares[1];
        if (i !== a && i !== b) return;
        game.measureCollapse(i);
        setPendingA(null);
        rerender();
        return;
      }
    } catch (e) {
      console.error(e);
    }
  };

  const reset = () => {
    // Simply create a new instance
    const fresh = new QuantumTicTacToe();
    // Replace stateful fields in the current instance
    Object.assign(game, fresh);
    setPendingA(null);
    rerender();
  };

  // Highlight choices when awaiting measurement or first pick
  const highlight = new Set<number>();
  if (status.kind === "awaitingMeasurement") {
    highlight.add(status.squares[0]);
    highlight.add(status.squares[1]);
  }
  if (pendingA !== null) highlight.add(pendingA);

  const statusClassName = joinClasses(
    "status",
    status.kind === "awaitingMeasurement"
      ? "warn"
      : status.kind === "finished"
        ? "win"
        : "info",
  );

  const statusMessage = (() => {
    if (status.kind === "awaitingMove") {
      if (pendingA !== null) {
        const firstPickSegments = [
          `Move ${status.moveNumber} — ${PLAYER_LABEL[status.player]}:`,
          `First square selected: ${pendingA}.`,
          "Pick another empty square to complete your quantum move.",
        ];

        return firstPickSegments.join(" ");
      }

      return `Move ${status.moveNumber} — Current: ${PLAYER_LABEL[status.player]}`;
    }

    if (status.kind === "awaitingMeasurement") {
      const chooserClassName = joinClasses(
        "player",
        status.chooser === "X" ? "x" : "o",
      );

      return (
        <>
          Cycle detected — Chooser: <span className={chooserClassName}>
            <strong>{PLAYER_LABEL[status.chooser]}</strong>
          </span>
          . Click one of the two highlighted squares to collapse.
        </>
      );
    }

    if (status.winners.length === 0) {
      return "Game finished — Draw";
    }
    const winnersSummary = status.winners
      .map((w) => `${PLAYER_LABEL[w.player]} +${w.points}`)
      .join(" ");

    return `Game finished — ${winnersSummary}`;
  })();

  const measurementHintText = [
    "Click one of the two highlighted squares",
    "(first edge of the cycle) to choose collapse.",
  ].join(" ");

  return (
    <div className="app">
      <h1 className="title">Quantum Tic-Tac-Toe</h1>
      <div className="status-area">
        <div className={statusClassName}>
          {statusMessage}
        </div>
      </div>
      <Board
        onSelectSquare={handleSquareClick}
        game={game}
        highlight={highlight}
        currentTurn={
          status.kind === "awaitingMove"
            ? status.player
            : status.kind === "awaitingMeasurement"
              ? status.chooser
              : undefined
        }
        measuring={status.kind === "awaitingMeasurement"}
        entangledMoveId={status.kind === "awaitingMeasurement" ? status.moves[0] : undefined}
        firstPickSquare={pendingA}
      />
      <div className="controls">
        <button
          onClick={() => { if (!hasStarted || window.confirm("Are you sure you want to reset the game?")) reset(); }}
          disabled={!hasStarted}
        >
          Reset
        </button>
      </div>
      {status.kind === "awaitingMeasurement" && (
        <div className="hint">
          {measurementHintText}
        </div>
      )}
    </div>
  );
}

export default App;
