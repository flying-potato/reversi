var aiService;
(function (aiService) {
    /** Returns the move that the computer player should do for the given state in move. */
    function findComputerMove(move) {
        return createComputerMove(move, 
        // at most 1 second for the AI to choose a move (but might be much quicker)
        { millisecondsLimit: 1000 });
    }
    aiService.findComputerMove = findComputerMove;
    /**
     * Returns all the possible moves for the given state and turnIndexBeforeMove.
     * Returns an empty array if the game is over.
     */
    function getPossibleMoves(state, turnIndexBeforeMove) {
        var possibleMoves = [];
        if (!state) {
            state = gameLogic.getInitialState();
        }
        var validMoves = gameLogic.getTurnValidMove(state.board, turnIndexBeforeMove);
        for (var _i = 0, validMoves_1 = validMoves; _i < validMoves_1.length; _i++) {
            var validMove = validMoves_1[_i];
            try {
                possibleMoves.push(gameLogic.createMove(state, validMove[0], validMove[1], turnIndexBeforeMove));
            }
            catch (e) {
                // The cell in that position was full.
            }
        }
        // for (let i = 0; i < gameLogic.ROWS; i++) {
        //   for (let j = 0; j < gameLogic.COLS; j++) {
        //     try {
        //       possibleMoves.push(gameLogic.createMove(state, i, j, turnIndexBeforeMove));
        //     } catch (e) {
        //       // The cell in that position was full.
        //     }
        //   }
        // }
        return possibleMoves;
    }
    aiService.getPossibleMoves = getPossibleMoves;
    /**
     * Returns the move that the computer player should do for the given state.
     * alphaBetaLimits is an object that sets a limit on the alpha-beta search,
     * and it has either a millisecondsLimit or maxDepth field:
     * millisecondsLimit is a time limit, and maxDepth is a depth limit.
     */
    function createComputerMove(move, alphaBetaLimits) {
        // We use alpha-beta search, where the search states are TicTacToe moves.
        return alphaBetaService.alphaBetaDecision(move, move.turnIndex, getNextStates, getStateScoreForIndex0, null, alphaBetaLimits);
    }
    aiService.createComputerMove = createComputerMove;
    function getStateScoreForIndex0(move, playerIndex) {
        var endMatchScores = move.endMatchScores;
        if (endMatchScores) {
            return endMatchScores[0] > endMatchScores[1] ? Number.POSITIVE_INFINITY
                : endMatchScores[0] < endMatchScores[1] ? Number.NEGATIVE_INFINITY
                    : 0;
        }
        return 0;
    }
    function getNextStates(move, playerIndex) {
        return getPossibleMoves(move.state, playerIndex);
    }
})(aiService || (aiService = {}));
//# sourceMappingURL=aiService.js.map