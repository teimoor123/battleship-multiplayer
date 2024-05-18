const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const bin = http.createServer(app);
const wss = new WebSocket.Server({ server: bin });

let connectedClients = 0;

wss.on('connection', function connection(ws) {
    if (connectedClients >= 2) {
        console.log('Max players reached, closing connection.');
        ws.close();
        return;
    }

    connectedClients++;
    console.log(`A new client connected. Total: ${connectedClients}`);

    ws.on('message', function incoming(data, isBinary) {
        // convert message to string if it is binary
        const message = isBinary ? data.toString() : data;
        console.log('received: %s', message);
        
        // send message to all clients except the sender
        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', function() {
        connectedClients--;
        console.log(`Client disconnected. Total: ${connectedClients}`);
    });
});

app.use(express.static('public'));

const port = 3000;
bin.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
