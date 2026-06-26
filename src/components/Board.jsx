import React from 'react';
import './Board.css';

const Board = ({ board, turn, selectedPiece, validMoves, onSquareClick }) => {
  return (
    <div className="checkers-board">
      {board.map((row, r) => (
        <div key={r} className="board-row">
          {row.map((piece, c) => {
            const isDark = (r + c) % 2 === 1;
            const isSelected = selectedPiece?.r === r && selectedPiece?.c === c;
            const isValidMove = validMoves.some((m) => m.r === r && m.c === c);

            let squareClass = `square ${isDark ? 'dark-sq' : 'light-sq'}`;
            if (isSelected) squareClass += ' selected';
            if (isValidMove) squareClass += ' valid-move';

            let pieceClass = '';
            if (piece === 1 || piece === 3) pieceClass = 'piece red';
            if (piece === 2 || piece === 4) pieceClass = 'piece black';
            if (piece === 3 || piece === 4) pieceClass += ' king';

            return (
              <div
                key={c}
                className={squareClass}
                onClick={() => onSquareClick(r, c)}
              >
                {piece !== 0 && (
                  <div className={pieceClass}>
                    {(piece === 3 || piece === 4) && <span className="crown">♔</span>}
                  </div>
                )}
                {isValidMove && <div className="move-indicator"></div>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Board;
