import { io } from "socket.io-client";

// En dev, le serveur tourne sur le port 3001 (voir server/index.js).
// En prod, remplace par l'URL de ton serveur déployé.
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

export const socket = io(SERVER_URL, {
  autoConnect: false,
});
