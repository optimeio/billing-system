let io;

module.exports = {
    init: (httpServer) => {
        const { Server } = require("socket.io");
        io = new Server(httpServer, {
            cors: {
                origin: "*", // Adjust this to your frontend URL in production
                methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
            }
        });

        io.on("connection", (socket) => {
            console.log("Client connected via Socket.io:", socket.id);

            // You can add logic here to join users to specific rooms based on their roles
            // socket.on("join", (userId) => { ... });

            socket.on("disconnect", () => {
                console.log("Client disconnected:", socket.id);
            });
        });

        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error("Socket.io not initialized!");
        }
        return io;
    }
};
