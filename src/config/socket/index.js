import { Server } from "socket.io";
import { CONFIG } from "../env/index.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: CONFIG.CLIENT_URL,
    },
  });

  io.on("connection", (socket) => {
    socket.on("join_room", (room) => {
      socket.join(room);
      //   console.log(`User joined room: ${room}`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};

export const getIo = () => {
  return io;
};
