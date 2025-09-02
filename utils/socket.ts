import { Server } from 'socket.io';
import http from 'http';

let io: Server;

export const initSocket = (server: http.Server) => {
    io = new Server(server, {
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

export default initSocket;
