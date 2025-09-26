import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 10000;
const wss = new WebSocketServer({ port: PORT });

console.log(`Rover Server started on port ${PORT}`);

let connectedClients = [];

function broadcastClientList() {
    const message = JSON.stringify({ type: 'connectedClients', clients: connectedClients });
    
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
    // --- THIS IS THE CORRECTED LINE ---
    const clientType = params.get("clientType") || 'rover'; // Default to rover

    console.log(`Client connected: Name=${name}, Type=${clientType}`);

    ws.clientName = name;
    ws.clientType = clientType;
    ws.clientSecret = secret;

    if (clientType === 'rover' && name) {
        if (!connectedClients.some(c => c.name === name)) {
            connectedClients.push({ name: name, secret: secret });
        }
    }
    
    broadcastClientList();

    ws.on('message', (messageAsString) => {
        try {
            const data = JSON.parse(messageAsString);
            console.log("Relaying message:", data);

            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN && client !== ws) {
                    const targetName = data.rover || ws.clientName;
                    
                    if ((ws.clientType === 'rover' && client.clientType === 'browser' && client.clientName === ws.clientName) || (ws.clientType === 'browser' && client.clientType === 'rover' && client.clientName === targetName)) {
                         client.send(messageAsString);
                    }
                }
            });

        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        console.log(`Client disconnected: ${name}`);
        if (clientType === 'rover' && name) {
            connectedClients = connectedClients.filter(c => c.name !== name);
            broadcastClientList();
        }
    });
});
