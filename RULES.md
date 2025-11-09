# Quantum tic-tac-toe

## Background

The motivation to invent quantum tic-tac-toe was to explore what it means to be in two places at once. In classical physics, a single object cannot be in two places at once. In quantum physics, however, the mathematics used to describe quantum systems seems to imply that before being subjected to quantum measurement (or "observed") certain quantum particles can be in multiple places at once. (The textbook example of this is the double-slit experiment.) How the universe can be like this is rather counterintuitive. There is a disconnect between the mathematics and our mental images of reality, a disconnect that is absent in classical physics. This is why quantum mechanics supports multiple "interpretations".

The researchers who invented quantum tic-tac-toe were studying abstract quantum systems, formal systems whose axiomatic foundation included only a few of the axioms of quantum mechanics. Quantum tic-tac-toe became the most thoroughly studied abstract quantum system and offered insights that spawned new research. It also turned out to be a fun and engaging game, a game which also provides good pedagogy in the classroom.

The rules of quantum tic-tac-toe attempt to capture three phenomena of quantum systems:

- superposition

  the ability of quantum objects to be in two places at once.

- entanglement

  the phenomenon where distant parts of a quantum system display correlations that cannot be explained by either timelike causality or common cause.

- collapse

  the phenomenon where the quantum states of a system are reduced to classical states. Collapses occur when a measurement happens, but the mathematics of the current formulation of quantum mechanics is silent on the measurement process. Many of the interpretations of quantum mechanics derive from different efforts to deal with the measurement problem.

## Gameplay

Quantum tic-tac-toe captures the three quantum phenomena discussed above by modifying one basic rule of classical tic-tac-toe: the number of marks allowed in each square. Additional rules specify when and how a set of marks "collapses" into classical moves.

On each move, the current player marks two squares with their letter (X or O), instead of one, and each letter (X or O) is subscripted with the number of the move (beginning counting with 1). The pair of marks are called _spooky marks_. (Because X always moves first, the subscripts on X are always odd and the subscripts on O are always even.)

For example, player 1's first move might be to place "X<sub>1</sub>" in both the upper left and lower right squares. The two squares thus marked are called _entangled_. During the game, there may be as many as eight spooky marks in a single square (if the square is entangled with all eight other squares).

The phenomenon of collapse is captured by specifying that a "cyclic entanglement" causes a "measurement". A _cyclic entanglement_ is a [cycle (graph theory)](<https://en.wikipedia.org/wiki/Cycle_(graph_theory)>) in the entanglement graph; for example, if

- square 1 is entangled via move X<sub>1</sub> with square 4, and
- square 4 is entangled via move X<sub>3</sub> with square 8, and
- square 8 is in turn entangled via move O<sub>4</sub> with square 1,
  then these three squares form a cyclic entanglement. At the end of the turn on which the cyclic entanglement was created, the player whose turn it is _not_ — that is, the player who did not create the cycle — chooses one of two ways to "measure" the cycle and thus cause all the entangled squares to "collapse" into classical tic-tac-toe moves. In the preceding example, since player 2 created the cycle, player 1 decides how to "measure" it. Player 1's two options are:

* X<sub>1</sub> collapses into square 1. This forces O<sub>4</sub> to collapse into square 8 and X<sub>3</sub> to collapse into square 4.
* X<sub>1</sub> collapses into square 4. This forces X<sub>3</sub> to collapse into square 8 and O<sub>4</sub> to collapse into square 1.

Any other chains of entanglements hanging off the cycle would also collapse at this time; for example, if square 1 were also entangled via O<sub>2</sub> with square 5, then either measurement above would force O<sub>2</sub> to collapse into square 5. (Note that it is impossible for two or more cyclic entanglements to be created in a single turn.)

When a move collapses into a single square, that square is permanently marked (in larger print) with the letter and subscript of the collapsed move — a _classical mark_. A square containing a classical mark is fixed for the rest of the game; no more spooky marks may be placed in it.

The first player to achieve a tic-tac-toe (three in a row horizontally, vertically, or diagonally) consisting entirely of _classical marks_ is declared the winner. Since it is possible for a single measurement to collapse the entire board and give classical tic-tac-toes to both players simultaneously, the rules declare that the player whose tic-tac-toe has the _lower maximum subscript_ (representing the first completed line in the collapsed timeline) earns one point, and the player whose tic-tac-toe has the _higher maximum subscript_ earns only one-half point.
