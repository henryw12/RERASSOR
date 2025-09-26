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

console.log(`Final Rover Server started on port ${PORT}`);

let connectedClients = [];

// This function sends the full client list to all connected browsers
function broadcastClientList() {
    const clientList = connectedClients.map(c => ({ name: c.name, secret: c.secret }));
    const message = JSON.stringify({ type: 'connectedClients', clients: clientList });
    
    wss.clients.forEach(client => {
        if (client.clientType === 'browser' && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

wss.on('connection', (ws, req) => {
    const params = new URLSearchParams(req.url.slice(1));
    const name = params.get("name");
    const secret = params.get("secret");
    // If no type is specified, assume it's a rover
    const clientType = params.get("clientType") || 'rover';

    ws.clientName = name;
    ws.clientType = clientType;
    ws.clientSecret = secret;

    console.log(`Client connected: Name=${name}, Type=${clientType}`);

    if (clientType === 'rover' && name) {
        if (!connectedClients.some(c => c.name === name)) {
            connectedClients.push({ name, secret });
        }
        broadcastClientList();
    }

    ws.on('message', (messageAsString) => {
        // Simple relay logic
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(messageAsString);
            }
        });
    });

    ws.on('close', () => {
        console.log(`Client disconnected: ${name}`);
        if (clientType === 'rover' && name) {
            connectedClients = connectedClients.filter(c => c.name !== name);
            broadcastClientList();
        }
    });
});

// Start the main server
server.listen(PORT);
