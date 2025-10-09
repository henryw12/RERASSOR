import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const PORT = process.env.PORT || 443;
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Rover WebSocket server is running.');
});
const wss = new WebSocketServer({ server });

console.log(`Final Rover Server started on port ${PORT}`);
let connectedClients = [];

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
    const clientType = params.get("clientType") || (name ? 'rover' : 'browser');

    ws.clientName = name;
    ws.clientType = clientType;
    ws.clientSecret = secret;

    if (clientType === 'rover' && name) {
        if (!connectedClients.some(c => c.name === name)) {
            connectedClients.push({ name, secret });
        }
        broadcastClientList();
    } else if (clientType === 'browser') {
        broadcastClientList();
    }

    ws.on('message', (messageAsString) => {
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(messageAsString);
            }
        });
    });

    ws.on('close', () => {
        if (clientType === 'rover' && name) {
            connectedClients = connectedClients.filter(c => c.name !== name);
            broadcastClientList();
        }
    });
});

server.listen(PORT);
