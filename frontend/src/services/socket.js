import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5002';

// Create a single Socket.io instance with polling fallback and error safety
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 3,
  reconnectionDelay: 5000,
  timeout: 5000,
  transports: ['polling', 'websocket']
});

// Suppress unhandled socket connect errors
socket.on('connect_error', () => {
  // Silent fallback - no noisy console error
});


