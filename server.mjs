import { createServer } from "http";
import { Server as IOServer } from "socket.io";

const PORT = process.env.SOCKET_PORT ? Number(process.env.SOCKET_PORT) : 3001;

/**
 * In-memory room store (1:1 rooms).
 * roomId -> { password: string, members: Map<socketId, User> }
 */
const rooms = new Map();

function emitUsers(io, roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  const users = Array.from(room.members.values());
  io.to(roomId).emit("room:users", users);
}

function removeFromAllRooms(io, socketId) {
  for (const [roomId, room] of rooms.entries()) {
    if (room.members.has(socketId)) {
      room.members.delete(socketId);
      if (room.members.size === 0) rooms.delete(roomId);
      else emitUsers(io, roomId);
    }
  }
}

const server = createServer((req, res) => {
  res.writeHead(200);
  res.end("ok");
});

const io = new IOServer(server, {
  cors: { origin: true, credentials: true },
});

io.on("connection", (socket) => {
  socket.on("room:create", ({ roomId, password, user }, ack) => {
    try {
      if (!roomId || !password || !user?.name) return ack?.({ ok: false, errorKey: "loginError" });
      if (rooms.has(roomId)) return ack?.({ ok: false, errorKey: "roomExists" });

      const members = new Map();
      members.set(socket.id, {
        id: socket.id,
        name: String(user.name).slice(0, 32),
        avatar: user.avatar || `https://picsum.photos/100/100?random=${Math.floor(Math.random() * 1000)}`,
        isMicOn: false,
        isCamOn: false,
        status: "idle",
        studyTimeMinutes: 0,
      });

      rooms.set(roomId, { password, members });
      socket.join(roomId);
      ack?.({ ok: true, roomId, selfId: socket.id });
      emitUsers(io, roomId);
    } catch (e) {
      console.error(e);
      ack?.({ ok: false, errorKey: "loginError" });
    }
  });

  socket.on("room:join", ({ roomId, password, user }, ack) => {
    try {
      const room = rooms.get(roomId);
      if (!room) return ack?.({ ok: false, errorKey: "roomNotFound" });
      if (room.password !== password) return ack?.({ ok: false, errorKey: "loginError" });
      if (room.members.size >= 2) return ack?.({ ok: false, errorKey: "roomFull" });

      room.members.set(socket.id, {
        id: socket.id,
        name: String(user?.name || "Guest").slice(0, 32),
        avatar: user?.avatar || `https://picsum.photos/100/100?random=${Math.floor(Math.random() * 1000)}`,
        isMicOn: false,
        isCamOn: false,
        status: "idle",
        studyTimeMinutes: 0,
      });

      socket.join(roomId);
      ack?.({ ok: true, roomId, selfId: socket.id });
      emitUsers(io, roomId);
    } catch (e) {
      console.error(e);
      ack?.({ ok: false, errorKey: "loginError" });
    }
  });

  socket.on("room:leave", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.members.delete(socket.id);
    socket.leave(roomId);
    if (room.members.size === 0) rooms.delete(roomId);
    else emitUsers(io, roomId);
  });

  socket.on("user:update", ({ roomId, patch }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const user = room.members.get(socket.id);
    if (!user) return;

    const next = {
      ...user,
      isMicOn: typeof patch?.isMicOn === "boolean" ? patch.isMicOn : user.isMicOn,
      isCamOn: typeof patch?.isCamOn === "boolean" ? patch.isCamOn : user.isCamOn,
      status: patch?.status === "focus" || patch?.status === "break" || patch?.status === "idle" ? patch.status : user.status,
      studyTimeMinutes: Number.isFinite(patch?.studyTimeMinutes) ? Math.max(0, Math.floor(patch.studyTimeMinutes)) : user.studyTimeMinutes,
      name: typeof patch?.name === "string" ? String(patch.name).slice(0, 32) : user.name,
      avatar: typeof patch?.avatar === "string" ? String(patch.avatar) : user.avatar,
    };

    room.members.set(socket.id, next);
    emitUsers(io, roomId);
  });

  socket.on("chat:send", ({ roomId, message }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (!room.members.has(socket.id)) return;
    io.to(roomId).emit("chat:message", message);
  });

  socket.on("webrtc:signal", ({ roomId, to, data }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (!room.members.has(socket.id)) return;
    if (!room.members.has(to)) return;
    io.to(to).emit("webrtc:signal", { from: socket.id, data });
  });

  socket.on("disconnect", () => removeFromAllRooms(io, socket.id));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Socket.IO server running on http://localhost:${PORT}`);
});
