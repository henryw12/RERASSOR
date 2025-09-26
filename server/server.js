import express from "express";
import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 10000;
const app = express();

// Basic HTTP route to confirm server is alive
app.get("/", (req, res) => {
  res.send("WebSocket server is running ✅");
});

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`HTTP server listening on port ${PORT}`);
});

// Attach WebSocket server
const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  console.log("New client connected");

  ws.on("message", (msg) => {
    console.log("Received:", msg.toString());

    // Example: broadcast movement to all clients
    try {
      const data = JSON.parse(msg);
      if (data.type === "move") {
        broadcast(JSON.stringify({ type: "move", direction: data.direction }));
      } else if (data.type === "speed") {
        broadcast(JSON.stringify({ type: "speed", speed: data.speed }));
      } else if (data.type === "getConnectedClients") {
        ws.send(JSON.stringify({ type: "connectedClients", count: wss.clients.size }));
      }
    } catch (err) {
      console.error("Invalid JSON:", err);
    }
  });

  ws.on("close", () => console.log("Client disconnected"));
});

function broadcast(message) {
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}
