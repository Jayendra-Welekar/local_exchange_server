
import { WebSocketServer, WebSocket } from 'ws'; // Aliasing the WebSocket from 'ws' module
import { UserManager } from './Usermanager';

const wss = new WebSocketServer({ port: 3001 });

wss.on('connection', (ws: WebSocket) => { // Use the 'ws' WebSocket type here
    console.log('Client connected');
    UserManager.getInstance().addUser(ws);
});
