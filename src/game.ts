interface SupportedLanguages {
  en: string, iw: string,
  pt: string, zh: string,
  el: string, fr: string,
  hi: string, es: string,
};

module game {
  export let $rootScope: angular.IScope = null;
  export let $timeout: angular.ITimeoutService = null;

  // Global variables are cleared when getting updateUI.
  // I export all variables to make it easy to debug in the browser by
  // simply typing in the console, e.g.,
  // game.currentUpdateUI
  export let currentUpdateUI: IUpdateUI = null;
  export let didMakeMove: boolean = false; // You can only make one move per updateUI
  export let animationEndedTimeout: ng.IPromise<any> = null;
  export let state: IState = null;
  // export let validMoves: number[][] = [] ; //newly added to store valid moves
  // For community games. //proposals for multiple player games
  export let proposals: number[][] = null;
  export let yourPlayerInfo: IPlayerInfo = null;
  export let nd_gameArea:any = null;
  export let evt_NoValidMove:any = null; 

  // Listen for the event.
  // nd_gameArea.addEventListener('noValidMove', makeNoMove, false);
  // dispatch the evt_NoValidMove event


  export function init($rootScope_: angular.IScope, $timeout_: angular.ITimeoutService) {
    $rootScope = $rootScope_;
    $timeout = $timeout_;
    registerServiceWorker();
    translate.setTranslations(getTranslations());
    translate.setLanguage('en');
    resizeGameAreaService.setWidthToHeight(1);
    gameService.setGame({
      updateUI: updateUI,
      getStateForOgImage: null,
    });
    nd_gameArea =  document.getElementById("gameArea");
    evt_NoValidMove = new Event('noValidMove');
    console.log("event binding: ", nd_gameArea);
    nd_gameArea.addEventListener('noValidMove', makeNoMove, false);
    
  }
  //when no valid moves we makeMove(null) for transit playerindex
  export function makeNoMove():any{
    let board: Board = state.board ;
    let turnIndexBeforeMove = currentUpdateUI.yourPlayerIndex ;  
    let validMoves = gameLogic.getTurnValidMove(board, turnIndexBeforeMove);
    console.log("Playerindex", turnIndexBeforeMove, "From makeNoMove event listener function: ", validMoves)
    // if( validMoves.length === 0 ){
    //   let nextMove: IMove = null;
    //   let turnIndex:number = stateBeforeMove.
    //   nextMove = {}
    // return {
    //   endMatchScores: null,
    //   turnIndex: turnIndex,
    //   state: state
    // };
    //   makeMove()
    // }
  }
  function registerServiceWorker() {
    // I prefer to use appCache over serviceWorker
    // (because iOS doesn't support serviceWorker, so we have to use appCache)
    // I've added this code for a future where all browsers support serviceWorker (so we can deprecate appCache!)
    if (!window.applicationCache && 'serviceWorker' in navigator) {
      let n: any = navigator;
      log.log('Calling serviceWorker.register');
      n.serviceWorker.register('service-worker.js').then(function(registration: any) {
        log.log('ServiceWorker registration successful with scope: ',    registration.scope);
      }).catch(function(err: any) {
        log.log('ServiceWorker registration failed: ', err);
      });
    }
  }

  function getTranslations(): Translations {
    return {};
  }

  export function isProposal(row: number, col: number) {
    return proposals && proposals[row][col] > 0;
  }

  export function getCellStyle(row: number, col: number): Object {
    if (!isProposal(row, col)) return {};
    // proposals[row][col] is > 0
    let countZeroBased = proposals[row][col] - 1;
    let maxCount = currentUpdateUI.numberOfPlayersRequiredToMove - 2;
    let ratio = maxCount == 0 ? 1 : countZeroBased / maxCount; // a number between 0 and 1 (inclusive).
    // scale will be between 0.6 and 0.8.
    let scale = 0.6 + 0.2 * ratio;
    // opacity between 0.5 and 0.7
    let opacity = 0.5 + 0.2 * ratio;
    return {
      transform: `scale(${scale}, ${scale})`,
      opacity: "" + opacity,
    };
  }
  
  function getProposalsBoard(playerIdToProposal: IProposals): number[][] {
    let proposals: number[][] = [];
    for (let i = 0; i < gameLogic.ROWS; i++) {
      proposals[i] = [];
      for (let j = 0; j < gameLogic.COLS; j++) {
        proposals[i][j] = 0;
      }
    }
    for (let playerId in playerIdToProposal) {
      let proposal = playerIdToProposal[playerId];
      let delta = proposal.data;
      proposals[delta.row][delta.col]++;
    }
    return proposals;
  }

  export function updateUI(params: IUpdateUI): void {
    log.info("Game got updateUI:", params);
    let playerIdToProposal = params.playerIdToProposal;
     // Only one move/proposal per updateUI
    didMakeMove = playerIdToProposal && playerIdToProposal[yourPlayerInfo.playerId] != undefined;
    yourPlayerInfo = params.yourPlayerInfo;
    proposals = playerIdToProposal ? getProposalsBoard(playerIdToProposal) : null;
    if (playerIdToProposal) {
      // If only proposals changed, then return.
      // I don't want to disrupt the player if he's in the middle of a move.
      // I delete playerIdToProposal field from params (and so it's also not in currentUpdateUI),
      // and compare whether the objects are now deep-equal.
      params.playerIdToProposal = null;
      if (currentUpdateUI && angular.equals(currentUpdateUI, params)) return;
    }
    // console.log("before update currentUpdateUI: " ,  gameLogic.getBoardChessNum(state.board));
    currentUpdateUI = params;
    clearAnimationTimeout();
    state = params.state;
    if (isFirstMove()) {
      state = gameLogic.getInitialState();
    }
    console.log("in Update UI: ", gameLogic.getBoardChessNum(state.board))
    let validMoves = gameLogic.getTurnValidMove(state.board, params.yourPlayerIndex)
    if(validMoves.length===0){
      log.info("Player ", params.yourPlayerIndex, " no where to move ")
      let newparams = angular.copy(params) ;
      newparams.yourPlayerIndex = 1- newparams.yourPlayerIndex;
      // ?? only updateUI enough, need dispatch the event 
      currentUpdateUI = newparams;
      let noneMove:IMove = {
        endMatchScores: null,
        turnIndex: newparams.yourPlayerIndex ,
        state: state
      };
      makeMove(noneMove); // 
      // updateUI(newparams) ;
    }
    // We calculate the AI move only after the animation finishes,
    // because if we call aiService now
    // then the animation will be paused until the javascript finishes.
    animationEndedTimeout = $timeout(animationEndedCallback, 500);
  }

  function animationEndedCallback() {
    log.info("Animation ended");
    maybeSendComputerMove();
  }

  function clearAnimationTimeout() {
    if (animationEndedTimeout) {
      $timeout.cancel(animationEndedTimeout);
      animationEndedTimeout = null;
    }
  }

  function maybeSendComputerMove() {
    if (!isComputerTurn()) return;
    let currentMove:IMove = {
      endMatchScores: currentUpdateUI.endMatchScores,
      state: currentUpdateUI.state,
      turnIndex: currentUpdateUI.turnIndex,
    }
    let move = aiService.findComputerMove(currentMove);
    log.info("Computer move: ", move);
    makeMove(move);
  }

  function makeMove(move: IMove) {
    if (didMakeMove) { // Only one move per updateUI
      return;
    }
    didMakeMove = true;
    let delta = move.state.delta;
    let chatDescription = '' + (delta.row + 1) + 'x' + (delta.col + 1);
    if (!proposals) {
      gameService.makeMove(move, null, chatDescription);
    } else {
      let myProposal:IProposal = {
        data: delta,
        playerInfo: yourPlayerInfo,
      };
      // Decide whether we make a move or not (if we have <currentCommunityUI.numberOfPlayersRequiredToMove-1> other proposals supporting the same thing).
      if (proposals[delta.row][delta.col] < currentUpdateUI.numberOfPlayersRequiredToMove - 1) {
        move = null;
      }
      gameService.makeMove(move, myProposal, chatDescription);
    }
  }

  function isFirstMove() {
    return !currentUpdateUI.state;
  }

  function yourPlayerIndex() {
    return currentUpdateUI.yourPlayerIndex;
  }

  function isComputer() {
    let playerInfo = currentUpdateUI.playersInfo[currentUpdateUI.yourPlayerIndex];
    // In community games, playersInfo is [].
    return playerInfo && playerInfo.playerId === '';
  }

  function isComputerTurn() {
    return isMyTurn() && isComputer();
  }

  function isHumanTurn() {
    return isMyTurn() && !isComputer();
  }

  function isMyTurn() {
    return !didMakeMove && // you can only make one move per updateUI.
      currentUpdateUI.turnIndex >= 0 && // game is ongoing not -1(over)
      currentUpdateUI.yourPlayerIndex === currentUpdateUI.turnIndex; // it's my turn
  }


  export function cellClicked(row: number, col: number): void {
    log.info("Clicked on cell:", row, col);
    if (!isHumanTurn()) return;
    // let validMoves = gameLogic.getTurnValidMove(state.board, currentUpdateUI.turnIndex);
    // if( validMoves.length === 0) {

    //     currentUpdateUI.turnIndex = 1 - currentUpdateUI.turnIndex;
    //     return;
    // }

    let nextMove: IMove = null;
    try {
      nextMove = gameLogic.createMove(
          state, row, col, currentUpdateUI.turnIndex);
    } catch (e) { // catch the error
      log.info(["cannot make a move on position: ", row, col, " whose value is ", state.board[row][col]]);
      log.info("ERROR INFO: ", e)
      return;
    }
    // Move is legal, make it!
    makeMove(nextMove);
    console.log("turnindex after makeMove", nextMove.turnIndex);
    console.log ("board after move", state.board);
    let chessNum = gameLogic.getBoardChessNum(state.board);
    console.log ("black vs. white: ", chessNum[0], chessNum[1]);
  }

  export function shouldShowImage(row: number, col: number): boolean {
    return state.board[row][col] !== "" || isProposal(row, col);
  }

  function isPiece(row: number, col: number, turnIndex: number, pieceKind: string): boolean {
    return state.board[row][col] === pieceKind || (isProposal(row, col) && currentUpdateUI.turnIndex == turnIndex);
  }
  
  export function isPieceX(row: number, col: number): boolean {
    return isPiece(row, col, 0, 'X');
  }

  export function isPieceO(row: number, col: number): boolean {
    return isPiece(row, col, 1, 'O');
  }

  export function isValidMove(row:number, col:number):boolean {
    if(state.board[row][col] === ''){
      
      let validMoves = gameLogic.getTurnValidMove(state.board, currentUpdateUI.turnIndex) ;
      for ( let validMove of validMoves )
      {
        if (row === validMove[0] && col === validMove[1])
        {
          return true;
        }
      }
    }
    return false;
  }

  export function shouldSlowlyAppear(row: number, col: number): boolean {
    return state.delta &&
        state.delta.row === row && state.delta.col === col;
  }
}

angular.module('myApp', ['gameServices'])
  .run(['$rootScope', '$timeout',
    function ($rootScope: angular.IScope, $timeout: angular.ITimeoutService) {
      $rootScope['game'] = game;
      game.init($rootScope, $timeout);
    }]);
