import { useState, useEffect, useCallback } from 'react';

// 10x10 Board for International Checkers
const INITIAL_BOARD = Array(10).fill(null).map(() => Array(10).fill(0));

// Setup initial pieces (20 per player)
for (let r = 0; r < 10; r++) {
  for (let c = 0; c < 10; c++) {
    if ((r + c) % 2 === 1) {
      if (r < 4) INITIAL_BOARD[r][c] = 2; // Black at top
      else if (r > 5) INITIAL_BOARD[r][c] = 1; // Red at bottom
    }
  }
}

export const useCheckersGame = () => {
  const [board, setBoard] = useState(() => {
    const saved = localStorage.getItem('checkers_board');
    return saved ? JSON.parse(saved) : INITIAL_BOARD;
  });
  const [turn, setTurn] = useState(() => {
    const saved = localStorage.getItem('checkers_turn');
    return saved ? JSON.parse(saved) : 1;
  }); 
  const [selectedPiece, setSelectedPiece] = useState(null); 
  const [validMoves, setValidMoves] = useState([]); 
  const [winner, setWinner] = useState(() => {
    const saved = localStorage.getItem('checkers_winner');
    return saved ? JSON.parse(saved) : null;
  });
  
  // Track ongoing multi-jumps
  const [ongoingJumpPath, setOngoingJumpPath] = useState(null); 

  // Calculate captured pieces dynamically
  let currentRed = 0;
  let currentBlack = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (board[r][c] === 1 || board[r][c] === 3) currentRed++;
      if (board[r][c] === 2 || board[r][c] === 4) currentBlack++;
    }
  }
  const redCaptured = 20 - currentBlack;
  const blackCaptured = 20 - currentRed;

  useEffect(() => {
    localStorage.setItem('checkers_board', JSON.stringify(board));
    localStorage.setItem('checkers_turn', JSON.stringify(turn));
    localStorage.setItem('checkers_winner', JSON.stringify(winner));
  }, [board, turn, winner]);

  // Recursively find all jump sequences
  const getJumpPaths = useCallback((r, c, b, currentTurn, currentPath = []) => {
    const startPiece = b[r][c];
    // If mid-jump, the piece might be different due to promotion or just tracking
    const piece = currentPath.length > 0 ? currentPath[currentPath.length - 1].piece : startPiece;
    const isKing = piece > 2;
    const isOpponent = (p) => (currentTurn === 1 && (p === 2 || p === 4)) || (currentTurn === 2 && (p === 1 || p === 3));
    
    let paths = [];
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    directions.forEach(([dr, dc]) => {
      if (isKing) {
        let step = 1;
        while (true) {
          const checkR = r + dr * step;
          const checkC = c + dc * step;
          if (checkR < 0 || checkR >= 10 || checkC < 0 || checkC >= 10) break;
          
          const targetPiece = b[checkR][checkC];
          if (targetPiece !== 0 && !isOpponent(targetPiece)) break; 
          
          if (isOpponent(targetPiece)) {
            const alreadyJumped = currentPath.some(p => p.jumpR === checkR && p.jumpC === checkC);
            if (alreadyJumped) break; 
            
            let landingStep = 1;
            while (true) {
              const landR = checkR + dr * landingStep;
              const landC = checkC + dc * landingStep;
              if (landR < 0 || landR >= 10 || landC < 0 || landC >= 10) break;
              
              if (b[landR][landC] !== 0) break;

              const newPath = [...currentPath, { r: landR, c: landC, jumpR: checkR, jumpC: checkC, piece }];
              const furtherPaths = getJumpPaths(landR, landC, b, currentTurn, newPath);
              if (furtherPaths.length > 0) {
                paths.push(...furtherPaths);
              } else {
                paths.push(newPath);
              }
              landingStep++;
            }
            break; 
          }
          step++;
        }
      } else {
        const checkR = r + dr;
        const checkC = c + dc;
        const landR = r + dr * 2;
        const landC = c + dc * 2;
        
        if (landR >= 0 && landR < 10 && landC >= 0 && landC < 10) {
          const targetPiece = b[checkR][checkC];
          if (isOpponent(targetPiece)) {
            const alreadyJumped = currentPath.some(p => p.jumpR === checkR && p.jumpC === checkC);
            if (!alreadyJumped && b[landR][landC] === 0) {
              const newPath = [...currentPath, { r: landR, c: landC, jumpR: checkR, jumpC: checkC, piece }];
              const furtherPaths = getJumpPaths(landR, landC, b, currentTurn, newPath);
              if (furtherPaths.length > 0) {
                paths.push(...furtherPaths);
              } else {
                paths.push(newPath);
              }
            }
          }
        }
      }
    });

    return paths;
  }, []);

  const getNormalMoves = useCallback((r, c, b, currentTurn) => {
    const piece = b[r][c];
    if (piece !== currentTurn && piece !== currentTurn + 2) return [];
    const isKing = piece > 2;
    const moves = [];

    const directions = isKing ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : 
                       (piece === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);

    directions.forEach(([dr, dc]) => {
      if (isKing) {
        let step = 1;
        while (true) {
          const nr = r + dr * step;
          const nc = c + dc * step;
          if (nr < 0 || nr >= 10 || nc < 0 || nc >= 10) break;
          if (b[nr][nc] !== 0) break;
          moves.push({ r: nr, c: nc, isJump: false });
          step++;
        }
      } else {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10 && b[nr][nc] === 0) {
          moves.push({ r: nr, c: nc, isJump: false });
        }
      }
    });
    return moves;
  }, []);

  const getAllMaxJumps = useCallback((b, currentTurn) => {
    let maxJumpCount = 0;
    let maxJumpPaths = [];

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (b[r][c] === currentTurn || b[r][c] === currentTurn + 2) {
          const paths = getJumpPaths(r, c, b, currentTurn);
          paths.forEach(path => {
            if (path.length > maxJumpCount) {
              maxJumpCount = path.length;
              maxJumpPaths = [{ startR: r, startC: c, path }];
            } else if (path.length === maxJumpCount && maxJumpCount > 0) {
              maxJumpPaths.push({ startR: r, startC: c, path });
            }
          });
        }
      }
    }
    return { maxJumpCount, maxJumpPaths };
  }, [getJumpPaths]);

  const handleSquareClick = (r, c) => {
    if (winner) return;

    // Ongoing jump lock
    if (ongoingJumpPath) {
      const { startR, startC, remainingJumps, allJumpedPieces, originalPiece } = ongoingJumpPath;
      
      const moveIndex = remainingJumps.findIndex(m => m.r === r && m.c === c);
      if (moveIndex !== -1) {
        const move = remainingJumps[moveIndex];
        const newBoard = board.map(row => [...row]);
        
        newBoard[r][c] = originalPiece;
        newBoard[selectedPiece.r][selectedPiece.c] = 0;

        const newAllJumped = [...allJumpedPieces, { r: move.jumpR, c: move.jumpC }];

        if (move.nextJumps && move.nextJumps.length > 0) {
          setBoard(newBoard);
          setSelectedPiece({ r, c });
          setValidMoves(move.nextJumps.map(nj => nj[0]));
          setOngoingJumpPath({
            startR, startC,
            remainingJumps: move.nextJumps,
            allJumpedPieces: newAllJumped,
            originalPiece
          });
        } else {
          // Finish turn
          newAllJumped.forEach(jp => {
            newBoard[jp.r][jp.c] = 0;
          });

          // Promotion (only if landing on last row)
          if (originalPiece === 1 && r === 0) newBoard[r][c] = 3;
          if (originalPiece === 2 && r === 9) newBoard[r][c] = 4;

          setBoard(newBoard);
          setOngoingJumpPath(null);
          setSelectedPiece(null);
          setValidMoves([]);
          const nextTurn = turn === 1 ? 2 : 1;
          setTurn(nextTurn);
          checkWinner(newBoard, nextTurn);
        }
      }
      return;
    }

    const move = validMoves.find(m => m.r === r && m.c === c);
    if (move && selectedPiece) {
      if (move.isJump) {
        const newBoard = board.map(row => [...row]);
        newBoard[r][c] = board[selectedPiece.r][selectedPiece.c];
        newBoard[selectedPiece.r][selectedPiece.c] = 0;

        if (move.nextJumps && move.nextJumps.length > 0) {
          setBoard(newBoard);
          setSelectedPiece({ r, c });
          setValidMoves(move.nextJumps.map(nj => nj[0])); 
          setOngoingJumpPath({
            startR: selectedPiece.r, startC: selectedPiece.c,
            remainingJumps: move.nextJumps,
            allJumpedPieces: [{ r: move.jumpR, c: move.jumpC }],
            originalPiece: board[selectedPiece.r][selectedPiece.c]
          });
        } else {
          newBoard[move.jumpR][move.jumpC] = 0;
          
          let p = board[selectedPiece.r][selectedPiece.c];
          if (p === 1 && r === 0) newBoard[r][c] = 3;
          if (p === 2 && r === 9) newBoard[r][c] = 4;

          setBoard(newBoard);
          setSelectedPiece(null);
          setValidMoves([]);
          const nextTurn = turn === 1 ? 2 : 1;
          setTurn(nextTurn);
          checkWinner(newBoard, nextTurn);
        }
      } else {
        const newBoard = board.map(row => [...row]);
        let p = board[selectedPiece.r][selectedPiece.c];
        newBoard[r][c] = p;
        newBoard[selectedPiece.r][selectedPiece.c] = 0;
        
        if (p === 1 && r === 0) newBoard[r][c] = 3;
        if (p === 2 && r === 9) newBoard[r][c] = 4;

        setBoard(newBoard);
        setSelectedPiece(null);
        setValidMoves([]);
        const nextTurn = turn === 1 ? 2 : 1;
        setTurn(nextTurn);
        checkWinner(newBoard, nextTurn);
      }
      return;
    }

    if (board[r][c] === turn || board[r][c] === turn + 2) {
      const { maxJumpCount, maxJumpPaths } = getAllMaxJumps(board, turn);

      if (maxJumpCount > 0) {
        const pathsForPiece = maxJumpPaths.filter(p => p.startR === r && p.startC === c);
        if (pathsForPiece.length > 0) {
          setSelectedPiece({ r, c });
          
          // Group by first jump step
          const nextSteps = [];
          pathsForPiece.forEach(p => {
            const firstStep = p.path[0];
            const remaining = p.path.slice(1);
            
            let existing = nextSteps.find(n => n.r === firstStep.r && n.c === firstStep.c);
            if (!existing) {
              existing = { ...firstStep, isJump: true, nextJumps: [] };
              nextSteps.push(existing);
            }
            if (remaining.length > 0) {
              existing.nextJumps.push(remaining);
            }
          });

          setValidMoves(nextSteps);
        } else {
          setSelectedPiece(null);
          setValidMoves([]);
        }
      } else {
        const moves = getNormalMoves(r, c, board, turn);
        if (moves.length > 0) {
          setSelectedPiece({ r, c });
          setValidMoves(moves);
        } else {
          setSelectedPiece(null);
          setValidMoves([]);
        }
      }
    } else {
      setSelectedPiece(null);
      setValidMoves([]);
    }
  };

  const checkWinner = (b, nextTurn) => {
    let p1Count = 0;
    let p2Count = 0;
    let nextHasMoves = false;
    
    const { maxJumpCount } = getAllMaxJumps(b, nextTurn);
    if (maxJumpCount > 0) {
        nextHasMoves = true;
    }

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (b[r][c] === 1 || b[r][c] === 3) p1Count++;
        if (b[r][c] === 2 || b[r][c] === 4) p2Count++;
        
        if (!nextHasMoves && (b[r][c] === nextTurn || b[r][c] === nextTurn + 2)) {
          if (getNormalMoves(r, c, b, nextTurn).length > 0) {
            nextHasMoves = true;
          }
        }
      }
    }

    if (p1Count === 0 || (nextTurn === 1 && !nextHasMoves)) setWinner(2);
    else if (p2Count === 0 || (nextTurn === 2 && !nextHasMoves)) setWinner(1);
  };

  const resetGame = () => {
    const initial = INITIAL_BOARD.map(row => [...row]);
    setBoard(initial);
    setTurn(1);
    setSelectedPiece(null);
    setValidMoves([]);
    setOngoingJumpPath(null);
    setWinner(null);
    localStorage.removeItem('checkers_board');
    localStorage.removeItem('checkers_turn');
    localStorage.removeItem('checkers_winner');
  };

  return {
    board,
    turn,
    selectedPiece,
    validMoves,
    winner,
    redCaptured,
    blackCaptured,
    handleSquareClick,
    resetGame
  };
};
