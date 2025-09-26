import React, { createContext, useState, useEffect, useRef, useCallback } from "react";

export const WebSocketsContext = createContext(null);

export const WebSocketsProvider = ({ children }) => {
  const [clients, setClients] = useState([]);
  const [connected, setConnected] = useState(null); // The rover name we are connected to
  const [secrets, setSecrets] = useState({});
  const ws = useRef(null);

  const connect = useCallback(() => {
    const myRenderHost = "rerassor.onrender.com";
    const wsUrl = connected
      ? `wss://${myRenderHost}/?name=${encodeURIComponent(connected)}&clientType=browser`
      : `wss://${myRenderHost}`;

    if (ws.current) {
      ws.current.close();
    }

    console.log("Connecting to WebSocket:", wsUrl);
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("WebSocket OPENED!");
      ws.current.send(JSON.stringify({ type: "getConnectedClients" }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "connectedClients") {
          console.log("Received client list:", data.clients);
          setClients(data.clients || []);
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    };

    ws.current.onclose = () => {
      console.log("WebSocket CLOSED.");
    };
  }, [connected]);

  useEffect(() => {
    connect(); // Connect when the component mounts or 'connected' changes
    
    // Set up a poller to refresh the client list periodically
    const intervalId = setInterval(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: "getConnectedClients" }));
      }
    }, 2000); // Ask for the list every 2 seconds

    return () => {
      clearInterval(intervalId);
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);
  
  const value = { ws: ws.current, clients, connected, setConnected, secrets, setSecrets };

  return (
    <WebSocketsContext.Provider value={value}>
      {children}
    </WebSocketsContext.Provider>
  );
};
