"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws"); // Aliasing the WebSocket from 'ws' module
const Usermanager_1 = require("./Usermanager");
const wss = new ws_1.WebSocketServer({ port: 3001 });
wss.on('connection', (ws) => {
    console.log('Client connected');
    Usermanager_1.UserManager.getInstance().addUser(ws);
});
