import React from "react";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/esm/Button";
import Form from "react-bootstrap/Form";

const ConnectedClients = ({
  setConnected,
  connected,
  ws,
  clients,
  secrets,
  setSecrets,
}) => {
  const handleConnect = (client) => {
    // Check if the entered secret is correct before connecting
    if (secrets[client.name] !== client.secret) {
      alert("Incorrect secret!");
      return;
    }

    if (connected === client.name) {
      console.log(`Disconnecting from ${client.name}`);
      setConnected(null);
      localStorage.removeItem("roverName");
    } else {
      console.log(`Connecting to ${client.name}`);
      setConnected(client.name);
      localStorage.setItem("roverName", client.name);
    }
  };

  const handleSecretChange = (clientName, value) => {
    setSecrets((prevSecrets) => ({
      ...prevSecrets,
      [clientName]: value,
    }));
  };

  return (
    <div className="table-container">
      <h1>Online Rovers:</h1>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Rover</th>
            <th>Secret</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {clients.length > 0 ? (
            clients.map((client, index) => (
              <tr key={index}>
                <td>{client.name}</td>
                <td>
                  <Form.Control
                    type="password"
                    placeholder="Enter secret"
                    value={secrets[client.name] || ""}
                    onChange={(e) =>
                      handleSecretChange(client.name, e.target.value)
                    }
                  />
                </td>
                <td>
                  <Button
                    variant="primary"
                    onClick={() => handleConnect(client)}
                    className={connected === client.name ? "btn-danger" : ""}
                  >
                    {connected === client.name ? "Disconnect" : "Connect"}
                  </Button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3">No rovers currently online.</td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default ConnectedClients;
