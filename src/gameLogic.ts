type Board = string[][];
interface BoardDelta {
  row: number;
  col: number;
}
type IProposalData = BoardDelta;
interface IState {
  board: Board;
  delta: BoardDelta;
}

interface dir_end{
  dir: number[];
  end: number[];
}

import gameService = gamingPlatform.gameService;
import alphaBetaService = gamingPlatform.alphaBetaService;
import translate = gamingPlatform.translate;
import resizeGameAreaService = gamingPlatform.resizeGameAreaService;
import log = gamingPlatform.log;
import dragAndDropService = gamingPlatform.dragAndDropService;

module gameLogic {
  export const ROWS = 8;
  export const COLS = 8;

  /** Returns the initial TicTacToe board, which is a ROWSxCOLS matrix containing ''. */
  export function getInitialBoard(): Board {
    let board: Board = [];
    for (let i = 0; i < ROWS; i++) {
      board[i] = [];
      for (let j = 0; j < COLS; j++) {
        board[i][j] = '';
        if ( i=== ROWS/2 -1 && j === i)
        { board[i][j] = 'O'; }
        if ( i=== ROWS/2 && j === i )
        { board[i][j] = 'O'; }

        if ( i=== ROWS/2 -1 && j === i+1)
        { board[i][j] = 'X'; }
        if ( i=== ROWS/2 && j === i-1)
        { board[i][j] = 'X'; }
      }
    }
    return board;
  }

  export function getInitialState(): IState {
    return {board: getInitialBoard(), delta: null};
  }

  /**
   * Returns true if the game ended in a tie because there are no empty cells.
   * E.g., isTie returns true for the following board:
   *     [['X', 'O', 'X'],
   *      ['X', 'O', 'O'],
   *      ['O', 'X', 'X']]
   */
  function isTie(board: Board): boolean {
    for (let i = 0; i < ROWS; i++) {
      for (let j = 0; j < COLS; j++) {
        if (board[i][j] === '') {
          // If there is an empty cell then we do not have a tie.
          return false;
        }
      }
    }
    // No empty cells, so we have a tie!
    return true;
  }
  
  function getBoardChessNum(board: Board):number[]{
    let finalChessNum:number[] = [0,0];
    for (let i = 0; i<ROWS; i++){
      for (let j = 0; j<COLS; j++){
        if (board[i][j] === 'X')  {finalChessNum[0] ++ ;}
        if (board[i][j] === 'O')  {finalChessNum[1] ++ ;}    
      }
    }
    return finalChessNum;
  }

  function getWinner(board: Board): string {
    if(!isFull(board)){ // only tell who win on Full Board
      return '';
    }
    let result:number[] = getBoardChessNum(board);
    if(result[0]>result[1]){ return 'X';}
    else {
      if(result[0]<result[1]){ return 'O';}
      else { return '' ;}
    }
  }

	function isFull(board: Board): boolean{
    for (let i = 0; i<ROWS; i++){
      for (let j = 0; j<COLS; j++){
        if(board[i][j] === ''){return false;}
      }
    }
    return true;
  }
  /**
   * Returns the move that should be performed when player
   * with index turnIndexBeforeMove makes a move in cell row X col.
   */
  function inBoard(pos:number[], ROWS:number, COLS:number ):boolean{
    if( ( pos[0]>= 0 && pos[0]<ROWS)  && ( pos[1]>= 0 && pos[1]<COLS) ) {
      return true;
    }else{
      return false;
    }
  }
  function reversePos( board: Board, row: number, col: number  ):any{
    if(board[row][col]!==''){
      board[row][col] = board[row][col]==='X'?'O':'X' ;
    }
  }

  function reverseLine( board: Board, row: number, col: number , dir:number[], end:number[]):any{
    //reverse logic is or , not and, one not equal, not reaching end
    for(let r = row+dir[0], c = col+dir[1];(r!==end[0]||c!==end[1]); r+=dir[0], c+=dir[1]){
      console.log("reverse position: " , r, "," ,c);
      reversePos(board, r, c);
    }    
  }
  function getReversibleRivalDirEnd(board: Board, row: number, col: number, rivalDirs:number[][], turnIndexBeforeMove: number):dir_end[] {
    let dir_ends:dir_end[] = [];
    let turnChar = turnIndexBeforeMove === 0 ? 'X' : 'O';
    for (let rivalDir of rivalDirs ){
      let endTurnChar = ifFollowedSpecString(turnChar, board, row, col,rivalDir ,turnIndexBeforeMove);
      if (endTurnChar !== null){
        dir_ends.push({dir:rivalDir, end:endTurnChar});
      }
    }
    return dir_ends;
  }
  
  function getRivalChessDir(board: Board, row: number, col: number, turnIndexBeforeMove: number): number[][] {
    let rivalIndex: number = 1 - turnIndexBeforeMove ;
    let turnChar = turnIndexBeforeMove === 0 ? 'X' : 'O'; //don't use if block statement, will cause scope issue
    let rivalChar = turnIndexBeforeMove === 0 ? 'O' : 'X';

    let dels:number[] = [-1, 0, 1];
    let eightDir :number[][] = [];
    for (let dr of dels){ //for .. of loop iterates on values, for .. in loop interates on keys
      for (let dc of dels){
        if (!(dr===0 && dc===0)){
          let checkRow = row + dr;
          let checkCol = col + dc;
          if(inBoard([checkRow, checkCol], ROWS, COLS) && board[checkRow][checkCol] === rivalChar ){
            eightDir.push([dr,dc]); 
          }
        }
      }
    }
    return eightDir; //direction of rival chess
  }

  function ifFollowedSpecString(followStr:string, board: Board, row: number, col: number, rivaldir:number[], turnIndexBeforeMove: number):any{
    let turnChar = turnIndexBeforeMove === 0 ? 'X' : 'O'; //don't use if block statement, will cause scope issue
    let rivalChar = turnIndexBeforeMove === 0 ? 'O' : 'X';
    // let checkRow = row + (2*rivaldir[0]) ;
    // let checkCol = col + (2*rivaldir[1]) ;
    let checkRow = row + (2*rivaldir[0]), checkCol = col + (2*rivaldir[1]) ;
    while ( inBoard( [checkRow, checkCol], ROWS, COLS) ){
      if( board[checkRow][checkCol]  === followStr ){
        return [checkRow, checkCol]; //return end position
      }
      if( board[checkRow][checkCol]  === rivalChar ){
        checkRow = checkRow + rivaldir[0] ; //update varible
        checkCol = checkCol + rivaldir[1] ; //update col adding rivaldir[1]
      }else{ // equal '' nothing, not valid for the rivaldir direction from row,col
        return null;
      }
    }
    return null; //out borad
  }

//check if one player can play in this turn code
function getTurnChessPos(board: Board, turnIndexBeforeMove: number):number[][]{
  let turnChar = turnIndexBeforeMove === 0 ? 'X' : 'O';
  let ret = [];
  for(let i = 0; i<ROWS; i++){
    for(let j = 0; j<COLS; j++){
      if(board[i][j] === turnChar){
        ret.push([i,j]);
      }
    }
  }
  return ret;
}

export function getTurnValidMove(board: Board, turnIndexBeforeMove: number):number[][]{
  let turnPos = getTurnChessPos(board, turnIndexBeforeMove);
  let ret:number[][] = [];
  for(let eachPos of turnPos ) //current players chess positions
  {
    let rivalDirs =getRivalChessDir(board, eachPos[0], eachPos[1], turnIndexBeforeMove);
    for(let rivalDir of rivalDirs){
      let end = ifFollowedSpecString('', board, eachPos[0], eachPos[1], rivalDir, turnIndexBeforeMove)
      if(end !== null){
        ret.push(end) ;
      }
    }
  }
  return ret ;
}


  export function createMove(
      stateBeforeMove: IState, row: number, col: number, turnIndexBeforeMove: number): IMove {
    if (!stateBeforeMove) {
      stateBeforeMove = getInitialState();
    }
    let board: Board = stateBeforeMove.board;
    if (board[row][col] !== '') {
      throw new Error("One can only make a move in an empty position!");
    }
    if (isFull(board)||getWinner(board) !== '' ) { // when to make move, not full and no winner
      throw new Error("Can only make a move if the game is not over!"); //cannot move
    }
//created validMoves before createMove
// let validMoves = getTurnValidMove(board, turnIndexBeforeMove);
// console.log( "Valid Moves: ", validMoves);

    let boardAfterMove = angular.copy(board);

    //************ begin change board ************
    boardAfterMove[row][col] = turnIndexBeforeMove === 0 ? 'X' : 'O';
    let rivalDirs = getRivalChessDir(boardAfterMove, row, col,turnIndexBeforeMove);
    let dir_ends:dir_end[] =getReversibleRivalDirEnd(boardAfterMove, row, col,rivalDirs, turnIndexBeforeMove);
    
    for (let dir_end of dir_ends){
      reverseLine(boardAfterMove, row, col, dir_end.dir, dir_end.end);
    }

    let winner = getWinner(boardAfterMove);
    let endMatchScores: number[];
    let turnIndex: number;
    if (winner !== '' || isTie(boardAfterMove)) {
      // Game over.
      turnIndex = -1;
      endMatchScores = winner === 'X' ? [1, 0] : winner === 'O' ? [0, 1] : [0, 0];
    } else {
      // Game continues. Now it's the opponent's turn (the turn switches from 0 to 1 and 1 to 0).
      turnIndex = 1 - turnIndexBeforeMove;
      endMatchScores = null;
    }
    let delta: BoardDelta = {row: row, col: col};
    let state: IState = {delta: delta, board: boardAfterMove};
    return {
      endMatchScores: endMatchScores,
      turnIndex: turnIndex,
      state: state
    };
  }
  
  export function createInitialMove(): IMove {
    return {endMatchScores: null, turnIndex: 0, 
        state: getInitialState()};  
  }

  export function forSimpleTestHtml() {
    var move = gameLogic.createMove(null, 0, 0, 0);
    log.log("move=", move);
  }
}

