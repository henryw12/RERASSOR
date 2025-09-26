const express = require("express");
const app = express();
const https = require("https");
const http = require("http");
const fs = require("fs");
const WebSocket = require("ws");
const path = require("path");
// This is not used in our current setup, but leaving the import is fine.
Stream = require("node-rtsp-stream");

// Optional params for ssl on production
const isDev = process.env.NODE_ENV === "dev";
const SSLkey = process.env.SSL_KEY;
const SSLcert = process.env.SSL_CERT;
const SSLkeypath = process.env.SSL_KEYPATH;
const SSLcertpath = process.env.SSL_CERTPATH;

let httpsServer, httpServer, options;

if (!isDev) {
  // Production server on Render
  // NOTE: Render provides SSL automatically. The fs.readFileSync parts are
  // for custom servers. We'll assume a simple setup for now.
  httpsServer = https.createServer(app); // Simplified for Render
  httpServer = http.createServer((req, res) => {
    res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
    res.end();
  });

  // Render will automatically map its public port 443 to this.
  const PORT = process.env.PORT || 10000;
  httpsServer.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });

  httpServer.listen(80, () => {
    console.log("HTTP redirect server started on port 80");
  });
} else {
  // dev server
  httpServer = http.createServer(app);
  httpServer.listen(8080, () => {
    console.log("Development server started on port 8080");
  });
}

/*
// RTSP stream handler is commented out as it's not being used.
stream = new Stream({
  name: "name",
  streamUrl: "rtsp://admin:123456@108.188.73.13:1081/stream1",
  wsPort: 9999,
  ffmpegOptions: {
    "-stats": "",
    "-r": 30,
    "-loglevel": "quiet",
  },
});
*/

app.use(express.static("../client/dist"));

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../client/dist/index.html"));
});

// --- CORRECTED WebSocket Server Setup ---
// This setup works for both production (Render) and development.
const wss = new WebSocket.Server({ noServer: true });

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
  } else {
    console.log(`Client connected: ${name}`);
  }

  if (name != null) {
    if (!connectedClients.some((client) => client.name === name)) {
      connectedClients.push({ name, secret });
    }
  }

  broadcastConnectedClientsToBrowsers(wss, ws);
  
  // Set up ping interval
  const pingIntervalId = setInterval(() => {
    ws.ping();
    ws.pingTimeoutId = setTimeout(() => {
        // This block will run if a pong is not received in 5 seconds
        console.log(`Client timed out: ${ws.clientName}`);
        ws.terminate(); // Forcefully close the connection
    }, 5000);
  }, 5000);

  // Handle pong response to clear the timeout
  ws.on("pong", () => {
    clearTimeout(ws.pingTimeoutId);
  });

  // Handle incoming messages
  ws.on("message", (message) => {
    try {
      // --- CORRECTED Message Handling ---
      // First, convert the message to a string to prevent crashes.
      const messageAsString = message.toString();
      const data = JSON.parse(messageAsString);

      if (data.type === "getConnectedClients") {
        ws.send(
          JSON.stringify({
            type: "connectedClients",
            clients: connectedClients,
          })
        );
      } else if (data.type === "move" || data.type === "speed" || data.type === "IMU") {
        // This logic relays messages to the correct destination
        const roverName = data.rover || (data.url ? new URLSearchParams(data.url.split("?")[1]).get("name") : null);
        
        wss.clients.forEach((client) => {
            // Find the right client to send the message to
            if (client.readyState === WebSocket.OPEN && client.clientName === roverName) {
                client.send(JSON.stringify(data));
            }
        });
      }
    } catch (error) {
        console.error("Failed to process message:", error);
    }
  });

  // Handle client disconnection
  ws.on("close", () => {
    clearInterval(pingIntervalId); // Stop sending pings
    clearTimeout(ws.pingTimeoutId); // Clear any pending timeout

    if(ws.clientName){
        connectedClients = connectedClients.filter(
          (client) => client.name !== ws.clientName
        );
        console.log(`Client disconnected: ${ws.clientName}`);
    } else {
        console.log("Browser client disconnected.");
    }
    
    broadcastConnectedClientsToBrowsers(wss, ws);
  });
});

// Attach the WebSocket server to the correct HTTP/HTTPS server
const serverToUse = !isDev ? httpsServer : httpServer;
serverToUse.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});
