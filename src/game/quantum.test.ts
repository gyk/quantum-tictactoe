import { describe, it, expect } from "vitest";
import { QuantumTicTacToe, type GameStatus } from "./quantum";

function isAwaitingMove(s: GameStatus): s is Extract<GameStatus, { kind: "awaitingMove" }> {
  return s.kind === "awaitingMove";
}
function isAwaitingMeasurement(
  s: GameStatus,
): s is Extract<GameStatus, { kind: "awaitingMeasurement" }> {
  return s.kind === "awaitingMeasurement";
}

describe("QuantumTicTacToe basic flow", () => {
  it("starts with X awaiting move 1", () => {
    const g = new QuantumTicTacToe();
    const s = g.status;
    expect(isAwaitingMove(s)).toBe(true);
    if (isAwaitingMove(s)) {
      expect(s.player).toBe("X");
      expect(s.moveNumber).toBe(1);
    }
  });

  it("rejects invalid plays", () => {
    const g = new QuantumTicTacToe();
    expect(() => g.play(0, 0)).toThrow();
  });

  it("creates a cycle and requires measurement", () => {
    const g = new QuantumTicTacToe();
    // X1: 0-1
    let s = g.play(0, 1);
    expect(isAwaitingMove(s)).toBe(true);
    // O2: 1-2
    s = g.play(1, 2);
    expect(isAwaitingMove(s)).toBe(true);
    // X3: 2-0 -> forms cycle (0-1-2-0)
    s = g.play(2, 0);
    expect(isAwaitingMeasurement(s)).toBe(true);
    if (isAwaitingMeasurement(s)) {
      expect(s.chooser).toBe("O");
      expect(s.moves.length).toBe(3);
      // squares may be oriented by search; assert set equality
      const set = new Set(s.squares);
      expect(set.has(0) && set.has(1) && set.has(2) && set.size === 3).toBe(true);
    }
  });

  it("measurement collapses deterministically along the cycle order", () => {
    const g = new QuantumTicTacToe();
    g.play(0, 1); // X1
    g.play(1, 2); // O2
    let s = g.play(2, 0); // X3 creates cycle, O chooses
    if (!isAwaitingMeasurement(s)) throw new Error("expected measurement");
    const choice = s.squares[0];
    const before = s;
    s = g.measureCollapse(choice);
    // If choose the first edge's first square, each edge i collapses to squares[i]
    const k = before.moves.length;
    for (let i = 0; i < k; i++) {
      const moveId = before.moves[i];
      const expected = before.squares[i];
      expect(g.getMove(moveId)!.collapsedTo).toBe(expected);
      expect(g.classical[expected]).toBeTruthy();
    }
  });

  it("cascade collapses along hanging branches", () => {
    const g = new QuantumTicTacToe();
    g.play(0, 4); // X1
    g.play(4, 8); // O2
    let s = g.play(8, 0); // X3 -> cycle 0-4-8-0, O to choose
    if (!isAwaitingMeasurement(s)) throw new Error("expected measurement");
    s = g.measureCollapse(s.squares[0]);
    // After measuring, expect classical on 0,4,8
    expect(g.classical[0]).toBeTruthy();
    expect(g.classical[4]).toBeTruthy();
    expect(g.classical[8]).toBeTruthy();
  });

  it("auto-collapses a 2-edge same-player cycle without requiring measurement", () => {
    const g = new QuantumTicTacToe();
    // X1: 0-1
    let s = g.play(0, 1);
    expect(isAwaitingMove(s)).toBe(true);
    // O2 somewhere disjoint
    s = g.play(3, 4);
    expect(isAwaitingMove(s)).toBe(true);
    // X3 repeats 0-1, forming a 2-edge cycle of only X moves -> auto-collapse
    s = g.play(0, 1);
    // Should NOT be awaiting measurement
    expect(isAwaitingMeasurement(s)).toBe(false);
    expect(isAwaitingMove(s)).toBe(true);
    // Both 0 and 1 should now be classical X
    expect(g.classical[0]?.player).toBe("X");
    expect(g.classical[1]?.player).toBe("X");
  });
});
