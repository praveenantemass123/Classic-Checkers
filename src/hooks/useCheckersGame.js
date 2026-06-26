import { useState, useCallback } from 'react';

// 0: empty, 1: red, 2: black, 3: red king, 4: black king
const INITIAL_BOARD = Array(8).fill(null).map(() => Array(8).fill(0));

// Setup initial pieces
for (let r = 0; r < 8; r++) {
  for (let c = 0; c < 8; c++) {
    if ((r + c) % 2 === 1) {
      if (r < 3) INITIAL_BOARD[r][c] = 2; // Black at top
      else if (r > 4) INITIAL_BOARD[r][c] = 1; // Red at bottom
    }
  }
}

export const useCheckersGame = () => {
  const [board, setBoard] = useState(INITIAL_BOARD);
  const [turn, setTurn] = useState(1); // 1 = red, 2 = black
  const [selectedPiece, setSelectedPiece] = useState(null); // { r, c }
  const [validMoves, setValidMoves] = useState([]); // Array of { r, c, isJump, jumpR, jumpC }
  const [winner, setWinner] = useState(null);

  const getValidMoves = (r, c, b, currentTurn, requireJump = false) => {
    const piece = b[r][c];
    if (piece !== currentTurn && piece !== currentTurn + 2) return [];

    const isKing = piece > 2;
    const moves = [];
    
    // Red moves up (-1), Black moves down (+1). Kings move both.
    const directions = [];
    if (piece === 1 || isKing) directions.push(-1);
    if (piece === 2 || isKing) directions.push(1);

    directions.forEach((dr) => {
      [-1, 1].forEach((dc) => {
        const nr = r + dr;
        const nc = c + dc;
        
        // Normal move (only if we aren't mid-jump sequence where a jump is required)
        if (!requireJump && nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr][nc] === 0) {
          moves.push({ r: nr, c: nc, isJump: false });
        }

        // Jump move
        const jr = r + dr * 2;
        const jc = c + dc * 2;
        if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && b[nr][nc] !== 0 && b[nr][nc] !== piece && b[nr][nc] !== (piece > 2 ? piece - 2 : piece + 2)) {
          // If the adjacent square has an opponent piece, and the landing square is empty
          if (b[jr][jc] === 0) {
            // Check if it's actually an opponent piece
            const isOpponent = (currentTurn === 1 && (b[nr][nc] === 2 || b[nr][nc] === 4)) || 
                               (currentTurn === 2 && (b[nr][nc] === 1 || b[nr][nc] === 3));
            if (isOpponent) {
              moves.push({ r: jr, c: jc, isJump: true, jumpR: nr, jumpC: nc });
            }
          }
        }
      });
    });

    return moves;
  };

  const handleSquareClick = (r, c) => {
    if (winner) return;

    // If clicking a valid move square
    const move = validMoves.find((m) => m.r === r && m.c === c);
    if (move && selectedPiece) {
      executeMove(move);
      return;
    }

    // Select a piece
    if (board[r][c] === turn || board[r][c] === turn + 2) {
      // First, check if ANY piece has a forced jump
      let hasGlobalJump = false;
      for (let ir = 0; ir < 8; ir++) {
        for (let ic = 0; ic < 8; ic++) {
          if (board[ir][ic] === turn || board[ir][ic] === turn + 2) {
            if (getValidMoves(ir, ic, board, turn).some(m => m.isJump)) {
              hasGlobalJump = true;
            }
          }
        }
      }

      const moves = getValidMoves(r, c, board, turn);
      // Filter out non-jumps if a jump is available globally
      const filteredMoves = hasGlobalJump ? moves.filter(m => m.isJump) : moves;
      
      if (filteredMoves.length > 0) {
        setSelectedPiece({ r, c });
        setValidMoves(filteredMoves);
      } else {
        setSelectedPiece(null);
        setValidMoves([]);
      }
    } else {
      setSelectedPiece(null);
      setValidMoves([]);
    }
  };

  const executeMove = (move) => {
    const newBoard = board.map(row => [...row]);
    let piece = newBoard[selectedPiece.r][selectedPiece.c];
    
    // Move piece
    newBoard[move.r][move.c] = piece;
    newBoard[selectedPiece.r][selectedPiece.c] = 0;

    let justJumped = false;
    // Remove jumped piece
    if (move.isJump) {
      newBoard[move.jumpR][move.jumpC] = 0;
      justJumped = true;
    }

    // King promotion
    let promoted = false;
    if (piece === 1 && move.r === 0) {
      newBoard[move.r][move.c] = 3;
      promoted = true;
    } else if (piece === 2 && move.r === 7) {
      newBoard[move.r][move.c] = 4;
      promoted = true;
    }

    setBoard(newBoard);

    // Check for double jump if we just jumped and didn't promote
    if (justJumped && !promoted) {
      const furtherMoves = getValidMoves(move.r, move.c, newBoard, turn, true).filter(m => m.isJump);
      if (furtherMoves.length > 0) {
        setSelectedPiece({ r: move.r, c: move.c });
        setValidMoves(furtherMoves);
        return; // Turn does not change
      }
    }

    // End turn
    setSelectedPiece(null);
    setValidMoves([]);
    
    const nextTurn = turn === 1 ? 2 : 1;
    setTurn(nextTurn);
    checkWinner(newBoard, nextTurn);
  };

  const checkWinner = (b, nextTurn) => {
    let redCount = 0;
    let blackCount = 0;
    let nextHasMoves = false;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (b[r][c] === 1 || b[r][c] === 3) redCount++;
        if (b[r][c] === 2 || b[r][c] === 4) blackCount++;
        
        if (b[r][c] === nextTurn || b[r][c] === nextTurn + 2) {
          if (getValidMoves(r, c, b, nextTurn).length > 0) {
            nextHasMoves = true;
          }
        }
      }
    }

    if (redCount === 0 || (nextTurn === 1 && !nextHasMoves)) setWinner(2);
    else if (blackCount === 0 || (nextTurn === 2 && !nextHasMoves)) setWinner(1);
  };

  const resetGame = () => {
    setBoard(INITIAL_BOARD.map(row => [...row]));
    setTurn(1);
    setSelectedPiece(null);
    setValidMoves([]);
    setWinner(null);
  };

  return {
    board,
    turn,
    selectedPiece,
    validMoves,
    winner,
    handleSquareClick,
    resetGame
  };
};
