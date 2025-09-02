"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io;
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });
    io.on('connection', (socket) => {
        console.log('Socket подключен:', socket.id);
        socket.on('startCheck', () => {
            console.log('Получен запрос на проверку');
            socket.emit('progress', { percent: 25 });
            socket.emit('complete', { message: 'Готово!' });
        });
        socket.on('disconnect', () => {
            console.log('Socket отключен:', socket.id);
        });
    });
    return io;
};
exports.initSocket = initSocket;
exports.default = exports.initSocket;
