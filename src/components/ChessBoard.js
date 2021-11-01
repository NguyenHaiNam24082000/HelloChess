import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";

import { makeStyles } from "@material-ui/core/styles";
// import { createTheme } from '@material-ui/core/styles'
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";

import { useHistory } from "react-router-dom";

import some from "lodash/some";
import capitalize from "lodash/capitalize";
import random from "lodash/random";
import debounce from "lodash/debounce";

import { AnimateSharedLayout } from "framer-motion";

import Field from "./Field";
import useWindowFocus from "../hooks/useWindowFocus";
import createChessBoard from "../utils/createChessBoard";
import getNextChessBoard from "../utils/getNextChessBoard";
import getMoves from "../utils/getMoves";
import checkKingCheck from "../utils/checkKingCheck";
import getAllMoves from "../utils/getAllMoves";
import { COLORS, PIECES, CHESSBOARD_TYPE } from "../constants";

const borderRadius = 7;

const useStyles = makeStyles((theme) => ({
  root: ({ isComputerRound, chessBoardTheme }) => ({
    height: "100%",
    pointerEvents: isComputerRound ? "none" : "auto",
    display: "grid",
    placeContent: "center",
    gridTemplateRows: "repeat(8, 1fr)",
    gridTemplateColumns: "repeat(8, 1fr)",
    borderRadius: borderRadius + 2,
    border: `3px ${chessBoardTheme.BLACK} solid`,
    backgroundColor: chessBoardTheme.BLACK,
    boxShadow: "0 8px 8px -6px rgba(0, 0, 0, 0.25)",
    "& > :first-child": {
      borderTopLeftRadius: borderRadius,
    },
    "& > :nth-child(8)": {
      borderTopRightRadius: borderRadius,
    },
    "& > :nth-last-child(8)": {
      borderBottomLeftRadius: borderRadius,
    },
    "& > :last-child": {
      borderBottomRightRadius: borderRadius,
    },
  }),

  dialog: {
    minWidth: 180,
  },
}));

const reverseArray = (array) => {
  return array.slice().reverse();
};

const weights = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 };

const pawnEvalWhite = [
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
  [1.0, 1.0, 2.0, 3.0, 3.0, 2.0, 1.0, 1.0],
  [0.5, 0.5, 1.0, 2.5, 2.5, 1.0, 0.5, 0.5],
  [0.0, 0.0, 0.0, 2.0, 2.0, 0.0, 0.0, 0.0],
  [0.5, -0.5, -1.0, 0.0, 0.0, -1.0, -0.5, 0.5],
  [0.5, 1.0, 1.0, -2.0, -2.0, 1.0, 1.0, 0.5],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
];

const pawnEvalBlack = reverseArray(pawnEvalWhite);

const knightEval = [
  [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0],
  [-4.0, -2.0, 0.0, 0.0, 0.0, 0.0, -2.0, -4.0],
  [-3.0, 0.0, 1.0, 1.5, 1.5, 1.0, 0.0, -3.0],
  [-3.0, 0.5, 1.5, 2.0, 2.0, 1.5, 0.5, -3.0],
  [-3.0, 0.0, 1.5, 2.0, 2.0, 1.5, 0.0, -3.0],
  [-3.0, 0.5, 1.0, 1.5, 1.5, 1.0, 0.5, -3.0],
  [-4.0, -2.0, 0.0, 0.5, 0.5, 0.0, -2.0, -4.0],
  [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0],
];

const bishopEvalWhite = [
  [-2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0],
  [-1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0],
  [-1.0, 0.0, 0.5, 1.0, 1.0, 0.5, 0.0, -1.0],
  [-1.0, 0.5, 0.5, 1.0, 1.0, 0.5, 0.5, -1.0],
  [-1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, -1.0],
  [-1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0],
  [-1.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.5, -1.0],
  [-2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0],
];

const bishopEvalBlack = reverseArray(bishopEvalWhite);

const rookEvalWhite = [
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  [0.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5],
  [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
  [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
  [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
  [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
  [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
  [0.0, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0],
];

const rookEvalBlack = reverseArray(rookEvalWhite);

const evalQueen = [
  [-2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0],
  [-1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0],
  [-1.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -1.0],
  [-0.5, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -0.5],
  [0.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -0.5],
  [-1.0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.0, -1.0],
  [-1.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, -1.0],
  [-2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0],
];

const kingEvalWhite = [
  [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
  [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
  [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
  [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
  [-2.0, -3.0, -3.0, -4.0, -4.0, -3.0, -3.0, -2.0],
  [-1.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -1.0],
  [2.0, 2.0, 0.0, 0.0, 0.0, 0.0, 2.0, 2.0],
  [2.0, 3.0, 1.0, 0.0, 0.0, 1.0, 3.0, 2.0],
];

const kingEvalBlack = reverseArray(kingEvalWhite);

const getPieceValue = (piece, x, y) => {
  if (piece === null) {
    return 0;
  }
  const getAbsoluteValue = (piece, isWhite, x, y) => {
    // console.log("aaa",isWhite);
    if (piece.name === PIECES.PAWN) {
      return weights["p"] + (isWhite ? pawnEvalWhite[y][x] : pawnEvalBlack[y][x]);
    } else if (piece.name === PIECES.ROOK) {
      return weights["r"] + (isWhite ? rookEvalWhite[y][x] : rookEvalBlack[y][x]);
    } else if (piece.name === PIECES.BISHOP) {
      return weights["b"] + (isWhite ? bishopEvalWhite[y][x] : bishopEvalBlack[y][x]);
    } else if (piece.name === PIECES.KNIGHT) {
      return weights["n"] + knightEval[y][x];
    } else if (piece.name === PIECES.QUEEN) {
      return weights["q"] + evalQueen[y][x];
    } else if (piece.name === PIECES.KING) {
      return weights["k"] + (isWhite ? kingEvalWhite[y][x] : kingEvalBlack[y][x]);
    }
  };
  const absoluteValue = getAbsoluteValue(
    piece,
    piece.color === COLORS.WHITE,
    x,
    y
  );
  console.log("abababa",absoluteValue);
  return piece.color === COLORS.WHITE ? absoluteValue : -absoluteValue;
};

const evaluateBoard = (board) => {
  let totalEvaluation = 0;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      totalEvaluation = totalEvaluation + getPieceValue(board[i][j], i, j);
      // console.log(board[i][j]);
    }
  }
  return totalEvaluation;
};

const minimax = function (depth, game, alpha, beta, isMaximisingPlayer) {
  debugger;
  if (depth === 0) {
    return -evaluateBoard(game.chessBoard);
  }

  var newGameMoves = game.allMoves;
  // console.log("hihi",game);
  var bestMove;
  if (isMaximisingPlayer) {
    bestMove = -9999;
    for (var i = 0; i < newGameMoves.length; i++) {
      const { position, move } = newGameMoves[i];
      const nextChessBoard = {
        chessBoard: getNextChessBoard(position, move, game.chessBoard),
        allMoves: getAllMoves(COLORS.BLACK,getNextChessBoard(position, move, game.chessBoard)),
      };
      bestMove = Math.max(
        bestMove,
        minimax(depth - 1, nextChessBoard, alpha, beta, !isMaximisingPlayer)
      );
      alpha = Math.max(alpha, bestMove);
      if (beta <= alpha) {
        return bestMove;
      }
    }
    return bestMove;
  } else {
    bestMove = 9999;
    for (var j = 0; j < newGameMoves.length; j++) {
      const { position, move } = newGameMoves[j];
      const nextChessBoard = {
        chessBoard: getNextChessBoard(position, move, game.chessBoard),
        allMoves: getAllMoves(COLORS.BLACK,getNextChessBoard(position, move, game.chessBoard)),
      };
      bestMove = Math.min(
        bestMove,
        minimax(depth - 1, nextChessBoard, alpha, beta, !isMaximisingPlayer)
      );
      beta = Math.min(beta, bestMove);
      if (beta <= alpha) {
        return bestMove;
      }
    }
    return bestMove;
  }
  debugger;
};

const minimaxRoot = function (depth, game, isMaximisingPlayer) {
  debugger;
  var newGameMoves = game.allMoves;
  var bestMove = -9999;
  var bestMoveFound;
  // console.log("le",newGameMoves.length);

  for (var i = 0; i < newGameMoves.length; i++) {
    // const { position, move } = newGameMoves[i];
    // const nextChessBoard = getNextChessBoard(position, move, game.chessBoard);
    // console.log("le",nextChessBoard);
    var newGameMove = newGameMoves[i];
    const { position, move } = newGameMove;
    const nextChessBoard = {
      chessBoard: getNextChessBoard(position, move, game.chessBoard),
      allMoves: getAllMoves(COLORS.BLACK,getNextChessBoard(position, move, game.chessBoard)),
    };
    // console.log(nextChessBoard);
    var value = minimax(
      depth - 1,
      nextChessBoard,
      -10000,
      10000,
      !isMaximisingPlayer
    );
    if (value >= bestMove) {
      bestMove = value;
      bestMoveFound = newGameMove;
    }
  }
  debugger;
  return bestMoveFound;
};

var getBestMove = function (depth, game) {
  var bestMove = minimaxRoot(depth, game, true);
  // console.log(depth, game);
  return bestMove;
};

function ChessBoard(props) {
  const { chessBoardTheme, chessBoardType } = props;

  const [chessBoardHistory, setChessBoardHistory] = useState(() => {
    const localValue = localStorage.getItem(chessBoardType);

    return localValue !== null && chessBoardType !== CHESSBOARD_TYPE.AUTOPLAY
      ? JSON.parse(localValue)
      : [createChessBoard()];
  });

  const chessBoard = chessBoardHistory[chessBoardHistory.length - 1];

  const setChessBoard = (chessBoard) =>
    setChessBoardHistory([...chessBoardHistory, chessBoard]);

  const [selectedPosition, setSelectedPosition] = useState(null);

  const [dialogText, setDialogText] = useState(null);

  const windowIsFocused = useWindowFocus();

  const history = useHistory();

  const ref = useRef();

  const playerColor =
    chessBoardHistory.length % 2 === 0 ? COLORS.BLACK : COLORS.WHITE;

  const enemyColor =
    chessBoardHistory.length % 2 === 0 ? COLORS.WHITE : COLORS.BLACK;

  const isComputerRound =
    chessBoardType === CHESSBOARD_TYPE.AUTOPLAY ||
    (chessBoardType === CHESSBOARD_TYPE.COMPUTER &&
      playerColor === COLORS.BLACK);

  const moves = useMemo(
    () => getMoves(selectedPosition, chessBoard),
    [selectedPosition, chessBoard]
  );

  const classes = useStyles({
    isComputerRound,
    chessBoardTheme,
  });

  // doComputerMove function will only change when chessBoard changes
  // this will ensure that the debounce function will work
  //Todo: bot ai alpha-beta prunning
  const doComputerMove = useCallback(
    // debounce(
    //   () => {
    //     const allMoves = getAllMoves(playerColor, chessBoard);
    //     console.log("kkk",allMoves);

    //     const randomMove = allMoves[random(allMoves.length - 1)];
    //     console.log(randomMove,"hahah");

    //     if (randomMove === undefined) return;

    //     const { position, move } = randomMove;
    //     console.log(position,move);

    //     const nextChessBoard = getNextChessBoard(position, move, chessBoard);
    //     console.log("jsjsjs",chessBoard);

    //     setChessBoard(nextChessBoard);
    //   },
    //   chessBoardType === CHESSBOARD_TYPE.AUTOPLAY ? 3000 : 1000
    // ),

    debounce(
      () => {
        const allMoves = getAllMoves(playerColor, chessBoard);
        console.log(allMoves);
        const { position, move } = getBestMove(3, { chessBoard, allMoves });
        const nextChessBoard = getNextChessBoard(position, move, chessBoard);
        setChessBoard(nextChessBoard);
      },
      chessBoardType === CHESSBOARD_TYPE.AUTOPLAY ? 1000 : 1000
    ),
    [chessBoard]
  );

  // run this code when chessBoard changes or on window focus
  useEffect(() => {
    if (!windowIsFocused) return;

    if (chessBoardType !== CHESSBOARD_TYPE.AUTOPLAY) {
      // add state to localStorage
      chessBoardHistory.length > 1 &&
        localStorage.setItem(chessBoardType, JSON.stringify(chessBoardHistory));

      // check if game is over
      const allMoves = getAllMoves(playerColor, chessBoard);

      if (allMoves.length === 0) {
        const kingIsChecked = checkKingCheck(playerColor, chessBoard);

        const dialogMessage = kingIsChecked
          ? `${capitalize(enemyColor)} won by checkmate.`
          : "Draw by stalemate";

        setTimeout(() => setDialogText(dialogMessage), 1000);

        localStorage.removeItem(chessBoardType);
      }
    }

    // do a computer move if it is a computer round
    isComputerRound && doComputerMove();
  }, [
    chessBoard,
    windowIsFocused,
    chessBoardHistory,
    chessBoardType,
    doComputerMove,
    enemyColor,
    isComputerRound,
    playerColor,
  ]);

  function handleClick({ position, clientCoords }) {
    if (clientCoords) {
      const { clientX, clientY } = clientCoords;

      const elements = document.elementsFromPoint(clientX, clientY);

      const fieldUnderPointer = elements.find(
        (element) => element.parentNode === ref.current
      );

      const index = [...ref.current.children].indexOf(fieldUnderPointer);

      if (index < 0) return;

      position = {
        y: Math.floor(index / 8),
        x: index % 8,
      };

      if (!some(moves, position)) return;
    }

    const { y, x } = position;

    const clickedPiece = chessBoard[y][x];

    // if selected and position is a move, set next chess board
    if (selectedPosition && some(moves, position)) {
      const nextChessBoard = getNextChessBoard(
        { y: selectedPosition.y, x: selectedPosition.x },
        position,
        chessBoard
      );

      setChessBoard(nextChessBoard);

      setSelectedPosition(null);

      // else if a piece was clicked, select
    } else if (clickedPiece) {
      setSelectedPosition(position);

      // else if something is currently selected, deselect
    } else if (selectedPosition) {
      setSelectedPosition(null);
    }
  }

  const fields = chessBoard.flatMap((row, y) =>
    row.map((piece, x) => {
      const position = { y, x };

      const isMove = some(moves, position);

      const isSelected =
        selectedPosition &&
        chessBoard[selectedPosition.y][selectedPosition.x] === piece;

      const isChecked =
        piece &&
        piece.name === PIECES.KING &&
        checkKingCheck(piece.color, chessBoard);

      return (
        <Field
          key={`${y}${x}`}
          piece={piece}
          playerColor={playerColor}
          position={position}
          backgroundColor={
            chessBoardTheme[(y + x) % 2 === 0 ? COLORS.WHITE : COLORS.BLACK]
          }
          isSelected={isSelected}
          isMove={isMove}
          isChecked={isChecked}
          onClick={handleClick}
        />
      );
    })
  );

  return (
    <div className={classes.root} ref={ref}>
      <AnimateSharedLayout>{fields}</AnimateSharedLayout>

      <Dialog onClose={() => history.push("/")} open={dialogText !== null}>
        <DialogTitle>Game Over</DialogTitle>
        <DialogContent>
          <DialogContentText className={classes.dialog}>
            {dialogText}
          </DialogContentText>
          <DialogActions>
            <Button onClick={() => history.push("/")} color="primary">
              Continue
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ChessBoard;
