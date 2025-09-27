import React, { createContext, useState, useEffect, useRef, useCallback } from "react";

export const WebSocketsContext = createContext(null);

export const WebSocketsProvider = ({ children }) => {
  const [clients, setClients] = useState([]);
  const [connected, setConnected] = useState(null);
  const [secrets, setSecrets] = useState({});
  const ws = useRef(null);

  const connect = useCallback(() => {
    // IMPORTANT: Make sure this is your Render SERVER address
    const myRenderHost = "rerassor.onrender.com"; 
    const wsUrl = connected
      ? `wss://${myRenderHost}/?name=${encodeURIComponent(connected)}&clientType=browser`
      : `wss://${myRenderHost}`;

    if (ws.current) {
      ws.current.close();
    }

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("Website WebSocket OPENED!");
      ws.current.send(JSON.stringify({ type: "getConnectedClients" }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "connectedClients") {
          setClients(data.clients || []);
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    };

    ws.current.onclose = () => {
      console.log("Website WebSocket CLOSED.");
    };
  }, [connected]);

  useEffect(() => {
    connect();
    const intervalId = setInterval(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: "getConnectedClients" }));
      }
    }, 2000);
    return () => clearInterval(intervalId);
  }, [connect]);

  const value = { ws: ws.current, clients, connected, setConnected, secrets, setSecrets };

  return (
    <WebSocketsContext.Provider value={value}>
      {children}
    </WebSocketsContext.Provider>
  );
};
