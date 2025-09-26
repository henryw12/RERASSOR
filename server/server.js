import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 10000;

// 1. Create a simple HTTP server
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server is running.');
});

// 2. Attach the WebSocket server to the HTTP server
const wss = new WebSocketServer({ server });

console.log(`Minimal Server is listening on port ${PORT}`);

wss.on('connection', ws => {
  console.log('Client connected!');

  ws.on('message', message => {
    const messageText = message.toString();
    console.log(`Received: ${messageText}`);
    ws.send('pong'); // Reply to any message with "pong"
  });

  ws.on('close', () => {
    console.log('Client disconnected.');
  });
});

// 3. Start the main server
server.listen(PORT);
