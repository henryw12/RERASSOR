import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 10000;
const wss = new WebSocketServer({ port: PORT });

console.log(`Full Rover Server started on port ${PORT}`);

let connectedClients = [];

// This function sends the full client list to all connected browsers
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
    const clientType = params.get("clientType") || 'rover';

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

            // Relay messages to the correct destination
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN && client !== ws) {
                    const targetName = data.rover || ws.clientName;
                    
                    // If message is from a rover, send to browsers watching that rover
                    if (ws.clientType === 'rover' && client.clientType === 'browser' && client.clientName === ws.clientName) {
                         client.send(messageAsString);
                    }
                    // If message is from a browser, send to the target rover
                    else if (ws.clientType === 'browser' && client.clientType === 'rover' && client.clientName === targetName) {
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
