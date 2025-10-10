const express = require("express");
const http = require("http"); // We only need the http module
const WebSocket = require("ws");
const path = require("path");
const Stream = require("node-rtsp-stream");

const app = express();

// --- Create one simple HTTP server ---
const server = http.createServer(app);

// --- Create the WebSocket server and attach it to the HTTP server ---
// This is much simpler and more reliable.
const wss = new WebSocket.Server({ server });

// All of your existing WebSocket logic below remains the same.
// =============================================================

let connectedClients = [];

function broadcastConnectedClientsToBrowsers(wss, ws) {
  wss.clients.forEach((client) => {
    if (
      !client.clientName &&
      client !== ws &&
      client.readyState === WebSocket.OPEN
    ) {
      client.send(
        JSON.stringify({
          type: "connectedClients",
          clients: connectedClients,
        })
      );
    }
  });
}

wss.on("connection", (ws, req) => {
  const query = req.url.split("?")[1];
  const params = new URLSearchParams(query);
  const name = params.get("name");
  const secret = params.get("secret");
  const clientType = params.get("clientType");

  ws.clientName = name;
  ws.clientSecret = secret;
  ws.clientType = clientType;

  if (name == null) {
    console.log("Browser listening for connected clients");
  } else if (clientType == null) {
    console.log(`rover connected: ${name}`);
  } else if (clientType === "browser") {
    console.log(`browser connected to: ${name}`);
  }

  if (name != null) {
    if (!connectedClients.some((client) => client.name === name)) {
      connectedClients.push({ name, secret });
    }
  }

  broadcastConnectedClientsToBrowsers(wss, ws);

  const pingIntervalId = setInterval(() => {
    ws.ping();
    ws.pingTimeoutId = setTimeout(() => {
      if (
        ws.readyState === WebSocket.OPEN &&
        connectedClients.some((client) => client.name === ws.clientName)
      ) {
        connectedClients = connectedClients.filter(
          (client) => client.name !== ws.clientName
        );
        console.log(`Client disconnected (unresponsive): ${ws.clientName}`);
        wss.clients.forEach((client) => {
          if (
            client.clientName === ws.clientName &&
            client.clientType !== "browser"
          ) {
            client.terminate();
          }
        });
        broadcastConnectedClientsToBrowsers(wss, ws);
        clearInterval(pingIntervalId);
      }
    }, 5000);
  }, 5000);

  ws.on("pong", () => {
    clearTimeout(ws.pingTimeoutId);
  });

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    if (data.type === "getConnectedClients") {
      ws.send(
        JSON.stringify({
          type: "connectedClients",
          clients: connectedClients,
        })
      );
    } else if (data.type === "move") {
      const roverName = data.rover;
      wss.clients.forEach((client) => {
        if (
          client.readyState === WebSocket.OPEN &&
          client.clientName === roverName
        ) {
          client.send(
            JSON.stringify({ type: "move", direction: data.direction })
          );
        }
      });
    } else if (data.type === "speed") {
      const roverName = data.rover;
      wss.clients.forEach((client) => {
        if (
          client.readyState === WebSocket.OPEN &&
          client.clientName === roverName
        ) {
          client.send(JSON.stringify({ type: "speed", speed: data.speed }));
        }
      });
    } else if (data.type === "IMU") {
      let clientNameFromUrl = null;
      if (data.url) {
        const parts = data.url.split("?");
        if (parts.length > 1) {
          const params = new URLSearchParams(parts[1]);
          clientNameFromUrl = params.get("name");
        }
      }
      wss.clients.forEach((client) => {
        if (
          client !== ws &&
          client.readyState === WebSocket.OPEN &&
          client.clientType === "browser" &&
          client.clientName === clientNameFromUrl
        ) {
          client.send(
            JSON.stringify({
              type: "IMU",
              name: clientNameFromUrl,
              yaw: data.yaw,
              pitch: data.pitch,
              roll: data.roll,
            })
          );
        }
      });
    }
  });

  ws.on("close", () => {
    connectedClients = connectedClients.filter(
      (client) => client.name !== ws.clientName
    );
    console.log(`Client disconnected: ${name}`);
    console.log(
      `Connected clients: ${connectedClients.map((client) => client.name)}`
    );
    wss.clients.forEach((client) => {
      if (
        client.clientName === ws.clientName &&
        client !== ws &&
        client.clientType !== "browser"
      ) {
        client.terminate();
      }
    });
    broadcastConnectedClientsToBrowsers(wss, ws);
  });

  ws.on("error", (error) => {
    console.error("Client error:", error);
    connectedClients = connectedClients.filter(
      (client) => client.name !== ws.clientName
    );
    console.log(
      `Connected clients: ${connectedClients.map((client) => client.name)}`
    );
    broadcastConnectedClientsToBrowsers(wss, ws);
  });
});

// --- Serve your static website files ---
app.use(express.static(path.join(__dirname, "../client/dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

// --- Start the server on port 3000 ---
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is live and listening on port ${PORT}`);
});
