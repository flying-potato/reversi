var gameService = gamingPlatform.gameService;
var alphaBetaService = gamingPlatform.alphaBetaService;
var translate = gamingPlatform.translate;
var resizeGameAreaService = gamingPlatform.resizeGameAreaService;
var log = gamingPlatform.log;
var dragAndDropService = gamingPlatform.dragAndDropService;
var gameLogic;
(function (gameLogic) {
    gameLogic.ROWS = 8;
    gameLogic.COLS = 8;
    /** Returns the initial TicTacToe board, which is a ROWSxCOLS matrix containing ''. */
    function getInitialBoard() {
        var board = [];
        for (var i = 0; i < gameLogic.ROWS; i++) {
            board[i] = [];
            for (var j = 0; j < gameLogic.COLS; j++) {
                board[i][j] = '';
                if (i === gameLogic.ROWS / 2 - 1 && j === i) {
                    board[i][j] = 'O';
                }
                if (i === gameLogic.ROWS / 2 && j === i) {
                    board[i][j] = 'O';
                }
                if (i === gameLogic.ROWS / 2 - 1 && j === i + 1) {
                    board[i][j] = 'X';
                }
                if (i === gameLogic.ROWS / 2 && j === i - 1) {
                    board[i][j] = 'X';
                }
            }
        }
        return board;
    }
    gameLogic.getInitialBoard = getInitialBoard;
    function getInitialState() {
        return { board: getInitialBoard(), delta: null };
    }
    gameLogic.getInitialState = getInitialState;
    /**
     * Returns true if the game ended in a tie because there are no empty cells.
     * E.g., isTie returns true for the following board:
     *     [['X', 'O', 'X'],
     *      ['X', 'O', 'O'],
     *      ['O', 'X', 'X']]
     */
    function isTie(board) {
        for (var i = 0; i < gameLogic.ROWS; i++) {
            for (var j = 0; j < gameLogic.COLS; j++) {
                if (board[i][j] === '') {
                    // If there is an empty cell then we do not have a tie.
                    return false;
                }
            }
        }
        var result = getBoardChessNum(board);
        if (result[0] === result[1]) {
            return true;
        }
        else {
            return false;
        }
    }
    function getBoardChessNum(board) {
        var finalChessNum = [0, 0];
        for (var i = 0; i < gameLogic.ROWS; i++) {
            for (var j = 0; j < gameLogic.COLS; j++) {
                if (board[i][j] === 'X') {
                    finalChessNum[0]++;
                }
                if (board[i][j] === 'O') {
                    finalChessNum[1]++;
                }
            }
        }
        return finalChessNum;
    }
    gameLogic.getBoardChessNum = getBoardChessNum;
    function getWinner(board) {
        var result = getBoardChessNum(board);
        if (!isFull(board)) {
            if (result[1] === 0) {
                // alert("black win\n"+ "black("+ result[0] +  ") : white(" + result[1] + ")" ); 
                return 'X';
            }
            if (result[0] === 0) {
                // alert("white win\n"+ "black("+ result[0] +  ") : white(" + result[1] + ")" ); 
                return 'O';
            }
            if (getTurnValidMove(board, 0).length === 0 && getTurnValidMove(board, 1).length === 0) {
                if (result[0] > result[1]) {
                    // alert("black win\n"+ "black("+ result[0] +  ") : white(" + result[1] + ")" ); 
                    return 'X';
                }
                else {
                    // alert("white win\n"+ "black("+ result[0] +  ") : white(" + result[1] + ")" ); 
                    return 'O';
                }
            }
            else {
                return '';
            }
        }
        if (result[0] > result[1]) {
            return 'X';
        }
        else {
            if (result[0] < result[1]) {
                return 'O';
            }
            else {
                return '';
            }
        }
    }
    function isFull(board) {
        for (var i = 0; i < gameLogic.ROWS; i++) {
            for (var j = 0; j < gameLogic.COLS; j++) {
                if (board[i][j] === '') {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Returns the move that should be performed when player
     * with index turnIndexBeforeMove makes a move in cell row X col.
     */
    function inBoard(pos, ROWS, COLS) {
        if ((pos[0] >= 0 && pos[0] < ROWS) && (pos[1] >= 0 && pos[1] < COLS)) {
            return true;
        }
        else {
            return false;
        }
    }
    function reversePos(board, row, col) {
        if (board[row][col] !== '') {
            board[row][col] = board[row][col] === 'X' ? 'O' : 'X';
        }
    }
    function reverseLine(board, row, col, dir, end) {
        //reverse logic is or , not and, one not equal, not reaching end
        for (var r = row + dir[0], c = col + dir[1]; (r !== end[0] || c !== end[1]); r += dir[0], c += dir[1]) {
            reversePos(board, r, c);
        }
    }
    function getReversibleRivalDirEnd(board, row, col, rivalDirs, turnIndexBeforeMove) {
        var dir_ends = [];
        var turnChar = turnIndexBeforeMove === 0 ? 'X' : 'O';
        for (var _i = 0, rivalDirs_1 = rivalDirs; _i < rivalDirs_1.length; _i++) {
            var rivalDir = rivalDirs_1[_i];
            var endTurnChar = ifFollowedSpecString(turnChar, board, row, col, rivalDir, turnIndexBeforeMove);
            if (endTurnChar !== null) {
                dir_ends.push({ dir: rivalDir, end: endTurnChar });
            }
        }
        return dir_ends;
    }
    function getRivalChessDir(board, row, col, turnIndexBeforeMove) {
        var rivalIndex = 1 - turnIndexBeforeMove;
        var turnChar = turnIndexBeforeMove === 0 ? 'X' : 'O'; //don't use if block statement, will cause scope issue
        var rivalChar = turnIndexBeforeMove === 0 ? 'O' : 'X';
        var dels = [-1, 0, 1];
        var eightDir = [];
        for (var _i = 0, dels_1 = dels; _i < dels_1.length; _i++) {
            var dr = dels_1[_i];
            for (var _a = 0, dels_2 = dels; _a < dels_2.length; _a++) {
                var dc = dels_2[_a];
                if (!(dr === 0 && dc === 0)) {
                    var checkRow = row + dr;
                    var checkCol = col + dc;
                    if (inBoard([checkRow, checkCol], gameLogic.ROWS, gameLogic.COLS) && board[checkRow][checkCol] === rivalChar) {
                        eightDir.push([dr, dc]);
                    }
                }
            }
        }
        return eightDir; //direction of rival chess
    }
    function ifFollowedSpecString(followStr, board, row, col, rivaldir, turnIndexBeforeMove) {
        var turnChar = turnIndexBeforeMove === 0 ? 'X' : 'O'; //don't use if block statement, will cause scope issue
        var rivalChar = turnIndexBeforeMove === 0 ? 'O' : 'X';
        // let checkRow = row + (2*rivaldir[0]) ;
        // let checkCol = col + (2*rivaldir[1]) ;
        var checkRow = row + (2 * rivaldir[0]), checkCol = col + (2 * rivaldir[1]);
        while (inBoard([checkRow, checkCol], gameLogic.ROWS, gameLogic.COLS)) {
            if (board[checkRow][checkCol] === followStr) {
                return [checkRow, checkCol]; //return end position
            }
            if (board[checkRow][checkCol] === rivalChar) {
                checkRow = checkRow + rivaldir[0]; //update varible
                checkCol = checkCol + rivaldir[1]; //update col adding rivaldir[1]
            }
            else {
                return null;
            }
        }
        return null; //out borad
    }
    //check if one player can play in this turn code
    function getTurnChessPos(board, turnIndexBeforeMove) {
        var turnChar = turnIndexBeforeMove === 0 ? 'X' : 'O';
        var ret = [];
        for (var i = 0; i < gameLogic.ROWS; i++) {
            for (var j = 0; j < gameLogic.COLS; j++) {
                if (board[i][j] === turnChar) {
                    ret.push([i, j]);
                }
            }
        }
        return ret;
    }
    function getTurnValidMove(board, turnIndexBeforeMove) {
        var turnPos = getTurnChessPos(board, turnIndexBeforeMove);
        var ret = [];
        for (var _i = 0, turnPos_1 = turnPos; _i < turnPos_1.length; _i++) {
            var eachPos = turnPos_1[_i];
            var rivalDirs = getRivalChessDir(board, eachPos[0], eachPos[1], turnIndexBeforeMove);
            for (var _a = 0, rivalDirs_2 = rivalDirs; _a < rivalDirs_2.length; _a++) {
                var rivalDir = rivalDirs_2[_a];
                var end = ifFollowedSpecString('', board, eachPos[0], eachPos[1], rivalDir, turnIndexBeforeMove);
                if (end !== null) {
                    ret.push(end);
                }
            }
        }
        return ret;
    }
    gameLogic.getTurnValidMove = getTurnValidMove;
    function ifMoveValid(row, col, validMoves) {
        for (var _i = 0, validMoves_1 = validMoves; _i < validMoves_1.length; _i++) {
            var validMove = validMoves_1[_i];
            if (row === validMove[0] && col === validMove[1]) {
                return true;
            }
        }
        return false;
    }
    function createMove(stateBeforeMove, row, col, turnIndexBeforeMove) {
        if (!stateBeforeMove) {
            stateBeforeMove = getInitialState();
        }
        var board = stateBeforeMove.board;
        if (board[row][col] !== '') {
            throw new Error("One can only make a move in an empty position!");
        }
        if (isFull(board) || getWinner(board) !== '' || isTie(board)) {
            throw new Error("Can only make a move if the game is not over!"); //cannot move
        }
        // created validMoves before createMove
        var validMoves = getTurnValidMove(board, turnIndexBeforeMove);
        if (!ifMoveValid(row, col, validMoves)) {
            throw new Error("Please choose a valid position with yellow dot");
        }
        // console.log( "Valid Moves: ", validMoves);
        var boardAfterMove = angular.copy(board);
        //************ begin change board ************
        boardAfterMove[row][col] = turnIndexBeforeMove === 0 ? 'X' : 'O';
        var rivalDirs = getRivalChessDir(boardAfterMove, row, col, turnIndexBeforeMove);
        var dir_ends = getReversibleRivalDirEnd(boardAfterMove, row, col, rivalDirs, turnIndexBeforeMove);
        for (var _i = 0, dir_ends_1 = dir_ends; _i < dir_ends_1.length; _i++) {
            var dir_end = dir_ends_1[_i];
            reverseLine(boardAfterMove, row, col, dir_end.dir, dir_end.end);
        }
        var winner = getWinner(boardAfterMove);
        var endMatchScores;
        var turnIndex;
        if (winner !== '' || isTie(boardAfterMove)) {
            // Game over.
            turnIndex = -1;
            endMatchScores = winner === 'X' ? [1, 0] : winner === 'O' ? [0, 1] : [0, 0];
            /*      let result: number[] = getBoardChessNum(boardAfterMove);
                  if(winner === 'X'){
                    alert("black win\n"+ "black("+ result[0] +  ") : white(" + result[1] + ")" );
                  }
                  if(winner === 'O'){
                    alert("black win\n"+ "black("+ result[0] +  ") : white(" + result[1] + ")" );
                  }*/
        }
        else {
            // Game continues. Now it's the opponent's turn (the turn switches from 0 to 1 and 1 to 0).
            turnIndex = 1 - turnIndexBeforeMove;
            endMatchScores = null;
        }
        var delta = { row: row, col: col };
        var state = { delta: delta, board: boardAfterMove };
        return {
            endMatchScores: endMatchScores,
            turnIndex: turnIndex,
            state: state
        };
    }
    gameLogic.createMove = createMove;
    function createInitialMove() {
        return { endMatchScores: null, turnIndex: 0,
            state: getInitialState() };
    }
    gameLogic.createInitialMove = createInitialMove;
    function forSimpleTestHtml() {
        var move = gameLogic.createMove(null, 0, 0, 0);
        log.log("move=", move);
    }
    gameLogic.forSimpleTestHtml = forSimpleTestHtml;
})(gameLogic || (gameLogic = {}));
//# sourceMappingURL=gameLogic.js.map