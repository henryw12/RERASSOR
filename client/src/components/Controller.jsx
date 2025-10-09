import React from "react";
import Button from "react-bootstrap/Button";

function Controller({ connected, ws }) {
  const sendCommand = (direction) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "move", direction }));
    }
  };

  const handleForward = () => sendCommand("forward");
  const handleStop = () => sendCommand("stop");
  const handleBackward = () => sendCommand("backward");
  const handleLeft = () => sendCommand("left");
  const handleRight = () => sendCommand("right");
  const handleForwardLeft = () => sendCommand("forwardLeft");
  const handleForwardRight = () => sendCommand("forwardRight");
  const handleBackwardLeft = () => sendCommand("backwardLeft");
  const handleBackwardRight = () => sendCommand("backwardRight");

  return (
    <div className="controller">
      <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
        <Button onClick={handleForwardLeft} disabled={!connected}>
          <i
            className="fa-solid fa-arrow-up"
            style={{ transform: "rotate(-45deg)" }}
          ></i>
        </Button>
        <Button onClick={handleForward} disabled={!connected}>
          <i className="fa-solid fa-arrow-up"></i>
        </Button>
        <Button onClick={handleForwardRight} disabled={!connected}>
          <i
            className="fa-solid fa-arrow-up"
            style={{ transform: "rotate(45deg)" }}
          ></i>
        </Button>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
        <Button onClick={handleStop} disabled={!connected} variant="danger">
          <i className="fa-solid fa-stop"></i>
        </Button>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
        <Button onClick={handleBackwardLeft} disabled={!connected}>
          <i
            className="fa-solid fa-arrow-down"
            style={{ transform: "rotate(45deg)" }}
          ></i>
        </Button>
        <Button onClick={handleBackward} disabled={!connected}>
          <i className="fa-solid fa-arrow-down"></i>
        </Button>
        <Button onClick={handleBackwardRight} disabled={!connected}>
          <i
            className="fa-solid fa-arrow-down"
            style={{ transform: "rotate(-45deg)" }}
          ></i>
        </Button>
      </div>
    </div>
  );
}

export default Controller;
