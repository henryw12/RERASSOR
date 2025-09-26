import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 10000;
const wss = new WebSocketServer({ port: PORT });

console.log(`[SERVER] Rover Server started on port ${PORT}`);

let connectedClients = [];

function broadcastClientList(action) {
    console.log(`[SERVER] Broadcasting client list. Reason: ${action}. Current list:`, connectedClients.map(c => c.name));
    const message = JSON.stringify({ type: 'connectedClients', clients: connectedClients });
    
    wss.clients.forEach(client => {
        if (client.clientType === 'browser' && client.readyState === WebSocket.OPEN) {
            console.log(`[SERVER] Sending list to browser client.`);
            client.send(message);
        }
    });
}

wss.on('connection', (ws, req) => {
    const params = new URLSearchParams(req.url.slice(1));
    const name = params.get("name");
    const secret = params.get("secret");
    const clientType = params.get("clientType") || 'browser';

    console.log(`[CONNECTION] New client trying to connect: Name=${name}, Type=${clientType}`);

    ws.clientName = name;
    ws.clientType = clientType;
    ws.clientSecret = secret;

    if (clientType === 'rover' && name) {
        if (!connectedClients.some(c => c.name === name)) {
            console.log(`[ROVER ADDED] Adding ${name} to the client list.`);
            connectedClients.push({ name: name, secret: secret });
        }
    } else {
        console.log(`[BROWSER CONNECTED] A browser has connected. Name: ${name || 'N/A'}`);
    }
    
    broadcastClientList("New client connected");

    ws.on('message', (messageAsString) => {
      // Message handling logic... (can be left simple for now)
      console.log(`[MESSAGE] Received: ${messageAsString}`);
    });

    ws.on('close', () => {
        console.log(`[DISCONNECT] Client disconnected: ${name}`);
        if (clientType === 'rover' && name) {
            connectedClients = connectedClients.filter(c => c.name !== name);
            console.log(`[ROVER REMOVED] Removing ${name} from the client list.`);
            broadcastClientList("Rover disconnected");
        }
    });
});
