import { useState, useEffect, useRef, useCallback } from 'react';
import { Peer } from 'peerjs';

export const useMultiplayer = (onMoveReceived, onResetReceived) => {
  const [peer, setPeer] = useState(null);
  const [peerId, setPeerId] = useState('');
  const [connection, setConnection] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, hosting, connected, error

  const onMoveRef = useRef(onMoveReceived);
  const onResetRef = useRef(onResetReceived);

  useEffect(() => {
    onMoveRef.current = onMoveReceived;
    onResetRef.current = onResetReceived;
  }, [onMoveReceived, onResetReceived]);

  const initPeer = useCallback(() => {
    const newPeer = new Peer();
    
    newPeer.on('open', (id) => {
      setPeerId(id);
    });

    newPeer.on('connection', (conn) => {
      // Someone joined our hosted room
      setConnection(conn);
      setConnectionStatus('connected');
      setupConnectionHandlers(conn);
    });

    newPeer.on('error', (err) => {
      console.error('PeerJS error:', err);
      setConnectionStatus('error');
    });

    setPeer(newPeer);
    return newPeer;
  }, []);

  const hostRoom = useCallback(() => {
    setIsHost(true);
    setConnectionStatus('hosting');
    if (!peer) initPeer();
  }, [peer, initPeer]);

  const joinRoom = useCallback((hostId) => {
    setIsHost(false);
    if (!peer) {
      const newPeer = initPeer();
      // Need to wait for peer to be open before connecting
      newPeer.on('open', () => {
        const conn = newPeer.connect(hostId);
        setConnection(conn);
        setupConnectionHandlers(conn);
      });
    } else {
      const conn = peer.connect(hostId);
      setConnection(conn);
      setupConnectionHandlers(conn);
    }
  }, [peer, initPeer]);

  const setupConnectionHandlers = (conn) => {
    conn.on('open', () => {
      setConnectionStatus('connected');
    });

    conn.on('data', (data) => {
      if (data.type === 'MOVE') {
        onMoveRef.current(data.payload.r, data.payload.c);
      } else if (data.type === 'RESET') {
        onResetRef.current();
      }
    });

    conn.on('close', () => {
      setConnectionStatus('disconnected');
      setConnection(null);
    });
  };

  const sendMove = useCallback((r, c) => {
    if (connection && connection.open) {
      connection.send({ type: 'MOVE', payload: { r, c } });
    }
  }, [connection]);

  const sendReset = useCallback(() => {
    if (connection && connection.open) {
      connection.send({ type: 'RESET' });
    }
  }, [connection]);

  const disconnect = useCallback(() => {
    if (connection) {
      connection.close();
    }
    if (peer) {
      peer.destroy();
    }
    setPeer(null);
    setConnection(null);
    setPeerId('');
    setIsHost(false);
    setConnectionStatus('disconnected');
  }, [connection, peer]);

  return {
    peerId,
    connectionStatus,
    isHost,
    hostRoom,
    joinRoom,
    sendMove,
    sendReset,
    disconnect
  };
};
