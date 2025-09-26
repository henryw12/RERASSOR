import React, { createContext, useState, useEffect, useRef } from "react";

export const WebSocketsContext = createContext(null);

export const WebSocketsProvider = ({ children }) => {
  const [clients, setClients] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const webSocket = useRef(null); // Use a ref to hold the WebSocket instance

  useEffect(() => {
    // This effect runs only once to create the connection
    const serverUrl = "wss://rerassor.onrender.com";
    console.log("Attempting to connect to WebSocket at:", serverUrl);

    const ws = new WebSocket(serverUrl);
    webSocket.current = ws;

    ws.onopen = () => {
      console.log("WebSocket OPENED successfully!");
      setIsConnected(true);
      // Ask for the client list once we are connected
      ws.send(JSON.stringify({ type: "getConnectedClients" }));
    };

    ws.onclose = () => {
      console.log("WebSocket CLOSED.");
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received message:", data);
        if (data.type === "connectedClients") {
          setClients(data.clients || []);
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    };

    // Cleanup function
    return () => {
      ws.close();
    };
  }, []); // The empty array ensures this effect runs only ONCE

  // This is a simplified function to send messages
  const sendMessage = (message) => {
    if (webSocket.current && webSocket.current.readyState === WebSocket.OPEN) {
      webSocket.current.send(JSON.stringify(message));
    }
  };
  
  // We are not using the complex context from the original project anymore,
  // this is a simplified and more stable version.
  const contextValue = {
    ws: webSocket.current,
    clients,
    isConnected,
    sendMessage,
  };

  return (
    <WebSocketsContext.Provider value={contextValue}>
      {children}
    </WebSocketsContext.Provider>
  );
};
