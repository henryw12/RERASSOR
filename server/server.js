import express from "express";
import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 10000;
const app = express();

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

const wss = new WebSocketServer({ server });

let connectedClients = []; // We need to track the clients

wss.on("connection", (ws, req) => {
  console.log("New client connected");
  
  // Get client info from the URL
  const params = new URLSearchParams(req.url.slice(1));
  const name = params.get("name");
  ws.clientName = name; // Store the name on the connection

  if (name) { // If a rover connects with a name, add it to our list
    if (!connectedClients.some(c => c.name === name)) {
      connectedClients.push({ name: name });
    }
  }

  ws.on("message", (msg) => {
    // --- BUG FIX #1: Convert message to string before parsing ---
    const msgAsString = msg.toString();
    console.log("Received:", msgAsString);

    try {
      const data = JSON.parse(msgAsString);
      
      if (data.type === "getConnectedClients") {
        // --- BUG FIX #2: Send the 'clients' array, not a 'count' ---
        ws.send(JSON.stringify({ type: "connectedClients", clients: connectedClients }));
      } else {
        // For all other messages, just broadcast them to everyone else
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === 1) { // 1 means OPEN
            client.send(msgAsString);
          }
        });
      }
    } catch (err) {
      console.error("Invalid JSON:", err);
    }
  });

  ws.on("close", () => {
    console.log(`Client disconnected: ${ws.clientName}`);
    // Remove the client from our list when it disconnects
    connectedClients = connectedClients.filter(c => c.name !== ws.clientName);
  });
});
