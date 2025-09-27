import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const PORT = process.env.PORT || 10000;

// Create a simple HTTP server (required for wss on Render)
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Rover WebSocket server is running.');
});

// Attach the WebSocket server to the HTTP server
const wss = new WebSocketServer({ server });

console.log(`[INFO] Final Rover Server started on port ${PORT}`);

let connectedClients = [];

function broadcastClientList(reason) {
    console.log(`[BROADCAST] Reason: ${reason}`);
    const clientList = connectedClients.map(c => ({ name: c.name, secret: c.secret }));
    const message = JSON.stringify({ type: 'connectedClients', clients: clientList });
    
    console.log(`[BROADCAST] Sending client list:`, clientList);
    
    wss.clients.forEach(client => {
        if (client.clientType === 'browser' && client.readyState === WebSocket.OPEN) {
            client.send(message);
            console.log(`[BROADCAST] Sent list to browser: ${client.clientName || 'N/A'}`);
        }
    });
}

wss.on('connection', (ws, req) => {
    const params = new URLSearchParams(req.url.slice(1));
    const name = params.get("name");
    const secret = params.get("secret");
    
    // --- THIS IS THE FINAL FIX ---
    // If a client connects without a clientType, it MUST be a rover.
    const clientType = params.get("clientType") || 'rover';

    ws.clientName = name;
    ws.clientType = clientType;
    ws.clientSecret = secret;

    console.log(`[CONNECTION] Client connected: Name=${name}, Type=${clientType}`);

    if (clientType === 'rover' && name) {
        // Add rover to the list if it's not already there
        if (!connectedClients.some(c => c.name === name)) {
            connectedClients.push({ name, secret });
            console.log(`[STATE] Added '${name}' to clients. Current clients: ${connectedClients.length}`);
        }
    }
    
    // Announce the new client list to all browsers
    broadcastClientList("New client connected");

    ws.on('message', (messageAsString) => {
        console.log(`[MESSAGE] Received: ${messageAsString}`);
        // Simple relay logic: send message to all OTHER clients
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(messageAsString);
            }
        });
    });

    ws.on('close', () => {
        console.log(`[DISCONNECT] Client disconnected: ${name}`);
        if (clientType === 'rover' && name) {
            connectedClients = connectedClients.filter(c => c.name !== name);
            console.log(`[STATE] Removed '${name}'. Current clients: ${connectedClients.length}`);
            // Announce the new client list to all browsers
            broadcastClientList("Rover disconnected");
        }
    });

    ws.on('error', (error) => {
      console.error('[ERROR] WebSocket error:', error);
    });
});

// Start the main server
server.listen(PORT);
