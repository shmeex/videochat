const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);

const users = [];

function findUser(id) {
    for (var i=0; i < users.length; i++) {
        if (users[i].id == id) {
            console.log('found');
            return users[i];    
        }
    }
}

io.on("connection", socket => {

    const found = users.some(user => {
        user.id === socket.id
    })
    if (!found) {
        users.push({id: socket.id, name: ''});
        socket.emit("yourUSER", findUser(socket.id));    
    }

    console.log('users', users);
    
    io.sockets.emit("allUsers", users);
    socket.on("disconnect", () => {
        delete users.pop(findUser(socket.id))
    });

    socket.on("callUser", (data) => {
        io.to(data.userToCall).emit("hey", {signal: data.signalData, from: data.from});
    });

    socket.on("acceptCall", (data) => {
        io.to(data.to).emit("callAccepted", data.signal);
    });

    socket.on("changeName", (data) => {
        let user = findUser(socket.id)
        user.name = data
        console.log('changed name', data, users)
        io.sockets.emit("allUsers", users);
    });

});

server.listen(8000, () => console.log("server is running on port 8000"));


