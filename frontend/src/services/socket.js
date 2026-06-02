import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5002';

// Create a single Socket.io instance
// autoConnect is false so we can control when it connects/disconnects (e.g. after login/logout)
export const socket = io(SOCKET_URL, {
  autoConnect: false
});
