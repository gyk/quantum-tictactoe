export type Player = "X" | "O";
export type Square = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface ClassicalMark {
  player: Player;
  moveId: number;
}

export interface SpookyMove {
  id: number;
  player: Player;
  a: Square;
  b: Square;
  collapsedTo?: Square;
}

export type Line = [Square, Square, Square];

export const LINES: Line[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export type Winners = Array<{
  player: Player;
  lines: Line[];
  earliestLineMaxMove: number;
  points: number;
}>;

export type GameStatus =
  | { kind: "awaitingMove"; player: Player; moveNumber: number }
  | {
      kind: "awaitingMeasurement";
      // The ordered cycle path squares and moves. Edges i connect squares[i] -> squares[i+1] via
      // moves[i].
      squares: Square[]; // length k, implicitly squares[k] wraps to squares[0]
      moves: number[]; // length k, move ids forming the cycle in same order
      chooser: Player; // the opponent of the player who created the cycle
    }
  | {
      kind: "finished";
      winners: Winners;
    };

export class QuantumTicTacToe {
  readonly classical: (ClassicalMark | null)[] = Array(9).fill(null);
  private moves = new Map<number, SpookyMove>();
  private _moveNumber = 1;
  private _awaitingMeasurement: null | {
    squares: Square[];
    moves: number[];
    chooser: Player;
  } = null;

  get status(): GameStatus {
    if (this._awaitingMeasurement)
      return { kind: "awaitingMeasurement", ...this._awaitingMeasurement };
    const end = this.checkWinners();
    if (end) return { kind: "finished", winners: end };
    return {
      kind: "awaitingMove",
      player: this.currentPlayer,
      moveNumber: this._moveNumber,
    };
  }

  get currentPlayer(): Player {
    return this._moveNumber % 2 === 1 ? "X" : "O";
  }

  getMove(id: number): SpookyMove | undefined {
    return this.moves.get(id);
  }

  listMoves(): ReadonlyArray<SpookyMove> {
    return Array.from(this.moves.values()).sort((a, b) => a.id - b.id);
  }

  play(a: Square, b: Square): GameStatus {
    if (this._awaitingMeasurement) throw new Error("Measurement must be resolved before next move");
    if (a === b) throw new Error("A move must choose two distinct squares");
    if (this.classical[a] || this.classical[b])
      throw new Error("Cannot place on a classical square");

    const id = this._moveNumber;
    const player = this.currentPlayer;
    const move: SpookyMove = { id, player, a, b };
    this.moves.set(id, move);

    const cycle = this.findCycleThroughNewEdge(a, b, id);
    if (cycle) {
      // If all moves in the cycle belong to the same player, the outcome is independent of choice.
      const uniquePlayers = new Set(cycle.moves.map((mid) => this.moves.get(mid)!.player));
      if (uniquePlayers.size === 1) {
        // Auto-collapse deterministically (equivalent to choosing squares[0]).
        const assignments = new Map<number, Square>();
        for (let i = 0; i < cycle.moves.length; i++) {
          assignments.set(cycle.moves[i], cycle.squares[i]);
        }
        this.applyCollapse(assignments);
        this.resolveCascades();
        // After collapse, check for end; otherwise advance move number
        const end = this.checkWinners();
        if (!end) this._moveNumber++;
        return this.status;
      }
      // The opponent chooses the measurement
      const chooser: Player = player === "X" ? "O" : "X";
      this._awaitingMeasurement = { ...cycle, chooser };
      return this.status;
    } else {
      // No cycle, advance to next move
      this._moveNumber++;
      return this.status;
    }
  }

  // Measurement choice: choose where the first move in the cycle collapses to. The choice is one of
  // the two squares that the first edge touches: squares[0] or squares[1].
  measureCollapse(choiceSquare: Square): GameStatus {
    const pending = this._awaitingMeasurement;
    if (!pending) throw new Error("No measurement pending");
    const { squares, moves } = pending;

    // Validate choice
    const s0 = squares[0];
    const s1 = squares[1];
    if (choiceSquare !== s0 && choiceSquare !== s1)
      throw new Error("Choice must be first edge square of the cycle");

    // Apply deterministic collapse along the cycle
    const k = moves.length;
    const assignments = new Map<number, Square>();
    if (choiceSquare === s0) {
      for (let i = 0; i < k; i++) {
        const moveId = moves[i];
        const to = i === 0 ? s0 : squares[i];
        assignments.set(moveId, to);
      }
    } else {
      for (let i = 0; i < k; i++) {
        const moveId = moves[i];
        const to = squares[(i + 1) % k];
        assignments.set(moveId, to);
      }
    }

    // Perform collapse for cycle edges first
    this.applyCollapse(assignments);

    // Cascading collapses for attached branches
    this.resolveCascades();

    // Clear pending measurement
    this._awaitingMeasurement = null;
    // After collapse, check end then advance move number to next player if game not finished
    const end = this.checkWinners();
    if (!end) this._moveNumber++;
    return this.status;
  }

  private resolveCascades() {
    // Repeatedly find any move that touches a now-classical square and collapse it to its other
    // square
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const m of Array.from(this.moves.values())) {
        if (m.collapsedTo !== undefined) continue;
        const aClass = this.classical[m.a];
        const bClass = this.classical[m.b];
        if (aClass && bClass) {
          throw new Error("Invalid state: both endpoints are already classical during cascade");
        }
        if (aClass || bClass) {
          const to: Square = aClass ? m.b : m.a;
          this.applyCollapse(new Map([[m.id, to]]));
          progressed = true;
        }
      }
    }
  }

  private applyCollapse(assignments: Map<number, Square>) {
    for (const [moveId, to] of assignments) {
      const m = this.moves.get(moveId);
      if (!m) throw new Error("Unknown move in collapse");
      if (m.collapsedTo !== undefined) continue; // already collapsed via cascade
      if (to !== m.a && to !== m.b)
        throw new Error("Collapse destination must be one of the move squares");
      if (this.classical[to]) throw new Error("Collapse destination already classical");
      // Mark classical
      this.classical[to] = { player: m.player, moveId: m.id };
      // Mark move collapsed
      m.collapsedTo = to;
    }
  }

  private findCycleThroughNewEdge(
    a: Square,
    b: Square,
    newMoveId: number,
  ): null | { squares: Square[]; moves: number[] } {
    // Build adjacency map using all non-collapsed moves except the new edge, then search path from
    // a to b
    const adj = new Map<Square, Array<{ next: Square; moveId: number }>>();
    const addEdge = (u: Square, v: Square, moveId: number) => {
      let arr = adj.get(u);
      if (!arr) adj.set(u, (arr = []));
      arr.push({ next: v, moveId });
    };
    for (const m of this.moves.values()) {
      if (m.id === newMoveId) continue; // skip the new edge; we add it later to form the cycle
      if (m.collapsedTo !== undefined) continue;
      addEdge(m.a, m.b, m.id);
      addEdge(m.b, m.a, m.id);
    }

    // BFS from a to find b
    const visited = new Set<Square>();
    const parent = new Map<Square, { prev: Square; moveId: number }>();
    const queue: Square[] = [a];
    visited.add(a);
    while (queue.length) {
      const u = queue.shift() as Square;
      for (const edge of adj.get(u) ?? []) {
        const v = edge.next;
        if (visited.has(v)) continue;
        visited.add(v);
        parent.set(v, { prev: u, moveId: edge.moveId });
        if (v === b) {
          // Reconstruct path a -> b
          const pathSquares: Square[] = [];
          const pathMoves: number[] = [];
          let cur: Square = b;
          while (cur !== a) {
            const p = parent.get(cur)!;
            pathSquares.push(cur);
            pathMoves.push(p.moveId);
            cur = p.prev;
          }
          pathSquares.push(a);
          pathSquares.reverse();
          pathMoves.reverse();
          // Now the cycle is path plus the new edge closing b -> a
          const squares: Square[] = pathSquares;
          const moves: number[] = [...pathMoves, newMoveId];
          return { squares, moves };
        }
        queue.push(v);
      }
    }
    return null;
  }

  private checkWinners(): Winners | null {
    const xLines: Line[] = [];
    const oLines: Line[] = [];
    const earliestMaxMove = (lines: Line[]) =>
      Math.min(...lines.map((ln) => Math.max(...ln.map((s) => this.classical[s]!.moveId))));
    for (const ln of LINES) {
      const [a, b, c] = ln;
      const ma = this.classical[a];
      const mb = this.classical[b];
      const mc = this.classical[c];
      if (ma && mb && mc) {
        if (ma.player === "X" && mb.player === "X" && mc.player === "X") xLines.push(ln);
        if (ma.player === "O" && mb.player === "O" && mc.player === "O") oLines.push(ln);
      }
    }
    if (xLines.length === 0 && oLines.length === 0) return null;
    if (xLines.length > 0 && oLines.length === 0) {
      return [
        {
          player: "X",
          lines: xLines,
          earliestLineMaxMove: earliestMaxMove(xLines),
          points: 1,
        },
      ];
    }
    if (oLines.length > 0 && xLines.length === 0) {
      return [
        {
          player: "O",
          lines: oLines,
          earliestLineMaxMove: earliestMaxMove(oLines),
          points: 1,
        },
      ];
    }
    // Both have lines: simultaneous win -> compare earliestLineMaxMove
    const xEarliest = earliestMaxMove(xLines);
    const oEarliest = earliestMaxMove(oLines);
    if (xEarliest < oEarliest) {
      return [
        {
          player: "X",
          lines: xLines,
          earliestLineMaxMove: xEarliest,
          points: 1,
        },
        {
          player: "O",
          lines: oLines,
          earliestLineMaxMove: oEarliest,
          points: 0.5,
        },
      ];
    } else if (oEarliest < xEarliest) {
      return [
        {
          player: "O",
          lines: oLines,
          earliestLineMaxMove: oEarliest,
          points: 1,
        },
        {
          player: "X",
          lines: xLines,
          earliestLineMaxMove: xEarliest,
          points: 0.5,
        },
      ];
    } else {
      // Extremely rare exact tie; award equal points
      return [
        {
          player: "X",
          lines: xLines,
          earliestLineMaxMove: xEarliest,
          points: 0.75,
        },
        {
          player: "O",
          lines: oLines,
          earliestLineMaxMove: oEarliest,
          points: 0.75,
        },
      ];
    }
  }
}
