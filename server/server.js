import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 10000;
const wss = new WebSocketServer({ port: PORT });

console.log(`Minimal Server is running on port ${PORT}`);

wss.on('connection', ws => {
  console.log('Client connected!');

  ws.on('message', message => {
    console.log(`Received: ${message.toString()}`);
    ws.send('pong'); // Reply to any message with "pong"
  });

  ws.on('close', () => {
    console.log('Client disconnected.');
  });
});
