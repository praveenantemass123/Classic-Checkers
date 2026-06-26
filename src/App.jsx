import { useState, useCallback } from 'react';
import { useCheckersGame } from './hooks/useCheckersGame';
import { useMultiplayer } from './hooks/useMultiplayer';
import Board from './components/Board';
import { RotateCcw, Home, Copy, Check } from 'lucide-react';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('home'); // home, offline, online-menu, online-host, online-join, game
  const [copied, setCopied] = useState(false);
  const [joinId, setJoinId] = useState('');

  const { board, turn, selectedPiece, validMoves, winner, handleSquareClick, resetGame } = useCheckersGame();

  const handleRemoteMove = useCallback((r, c) => {
    handleSquareClick(r, c);
  }, [handleSquareClick]);

  const handleRemoteReset = useCallback(() => {
    resetGame();
  }, [resetGame]);

  const {
    peerId,
    connectionStatus,
    isHost,
    hostRoom,
    joinRoom,
    sendMove,
    sendReset,
    disconnect
  } = useMultiplayer(handleRemoteMove, handleRemoteReset);

  const localPlayer = currentView === 'game-online' ? (isHost ? 1 : 2) : turn;

  const handleLocalSquareClick = (r, c) => {
    // Prevent clicking if it's an online game and not your turn
    if (currentView === 'game-online' && turn !== localPlayer) {
      // Allow remote player clicks to sync selection if they are just sending raw clicks
      // But wait, the local player shouldn't be able to click AT ALL if it's not their turn.
      return; 
    }
    
    handleSquareClick(r, c);
    
    if (currentView === 'game-online') {
      sendMove(r, c);
    }
  };

  const handleLocalReset = () => {
    resetGame();
    if (currentView === 'game-online') {
      sendReset();
    }
  };

  const handleHome = () => {
    resetGame();
    disconnect();
    setCurrentView('home');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(peerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Auto-transition to game when connected
  if (connectionStatus === 'connected' && (currentView === 'online-host' || currentView === 'online-join')) {
    setCurrentView('game-online');
  }

  return (
    <div className="container">
      {currentView === 'home' && (
        <div className="home-screen">
          <h1>Classic Checkers</h1>
          <p className="subtitle">Outsmart your opponent in this timeless strategy game.</p>
          <div className="button-group">
            <button className="primary-btn" onClick={() => setCurrentView('offline')}>Local Multiplayer</button>
            <button className="primary-btn" onClick={() => setCurrentView('online-menu')}>Play Online</button>
          </div>
        </div>
      )}

      {currentView === 'online-menu' && (
        <div className="home-screen">
          <h1>Play Online</h1>
          <p className="subtitle">Create a room or join a friend's room.</p>
          <div className="button-group">
            <button className="primary-btn" onClick={() => { hostRoom(); setCurrentView('online-host'); }}>Create Room</button>
            <button className="secondary-btn" onClick={() => setCurrentView('online-join')}>Join Room</button>
          </div>
          <button className="control-btn" style={{ margin: '2rem auto 0' }} onClick={handleHome}><Home size={24} /></button>
        </div>
      )}

      {currentView === 'online-host' && (
        <div className="home-screen">
          <h2>Room Created!</h2>
          <p className="subtitle">Share this ID with your friend so they can join.</p>
          
          <div className="room-id-box">
            <code>{peerId || 'Generating ID...'}</code>
            <button className="copy-btn" onClick={copyToClipboard} disabled={!peerId}>
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>

          <p style={{ marginTop: '2rem' }}>Waiting for opponent to connect...</p>
          <button className="secondary-btn" style={{ marginTop: '2rem' }} onClick={handleHome}>Cancel</button>
        </div>
      )}

      {currentView === 'online-join' && (
        <div className="home-screen">
          <h2>Join a Room</h2>
          <p className="subtitle">Enter the Room ID shared by your friend.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Paste Room ID here" 
              className="join-input"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
            />
            <button className="primary-btn" onClick={() => joinRoom(joinId)} disabled={!joinId || connectionStatus === 'hosting'}>
              {connectionStatus === 'hosting' ? 'Connecting...' : 'Join Game'}
            </button>
          </div>
          <button className="secondary-btn" style={{ marginTop: '2rem' }} onClick={handleHome}>Cancel</button>
        </div>
      )}

      {(currentView === 'offline' || currentView === 'game-online') && (
        <div className="game-screen">
          <header className="game-header">
            <h2>{currentView === 'offline' ? 'Local Multiplayer' : 'Online Multiplayer'}</h2>
            {currentView === 'game-online' && (
              <p style={{ margin: 0, opacity: 0.8 }}>
                You are playing as {localPlayer === 1 ? 'Red' : 'Black'}. 
                {connectionStatus === 'disconnected' && ' (Opponent Disconnected)'}
              </p>
            )}
            <div className={`turn-indicator ${turn === 1 ? 'red-turn' : 'black-turn'}`}>
              {winner ? (
                <span>Game Over - {winner === 1 ? 'Red' : 'Black'} Wins!</span>
              ) : (
                <span>Current Turn: {turn === 1 ? 'Red' : 'Black'}</span>
              )}
            </div>
          </header>

          <main className="game-main">
            {/* Flip board visually for the Black player so they always move "up" */}
            <div style={{ width: '100%', transform: localPlayer === 2 ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s ease' }}>
              <Board 
                board={board} 
                turn={turn} 
                selectedPiece={selectedPiece} 
                validMoves={validMoves} 
                onSquareClick={handleLocalSquareClick}
              />
            </div>
          </main>

          <footer className="game-controls">
            <button className="control-btn" onClick={handleLocalReset} title="Restart Game">
              <RotateCcw size={24} />
            </button>
            <button className="control-btn" onClick={handleHome} title="Back to Home">
              <Home size={24} />
            </button>
          </footer>

          {winner && (
            <div className="modal-overlay">
              <div className="modal">
                <h2>{winner === 1 ? 'Red' : 'Black'} Wins!</h2>
                <div className="button-group">
                  <button className="primary-btn" onClick={handleLocalReset}>Play Again</button>
                  <button className="secondary-btn" onClick={handleHome}>Home</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
