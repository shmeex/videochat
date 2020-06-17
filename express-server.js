const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
var http = require('http')

var server = http.createServer({
//    key: fs.readFileSync('/etc/ssl/private/nginx-selfsigned.key'),
//    cert: fs.readFileSync('/etc/ssl/certs/nginx-selfsigned.crt')
}, app)
const io = require("socket.io").listen(server, 
    // {
    //     handlePreflightRequest: (req, res) => {
    //         const headers = {
    //             "Access-Control-Allow-Headers": "Content-Type, Authorization",
    //             "Access-Control-Allow-Origin": req.headers.origin, //or the specific origin you want to give access to,
    //             "Access-Control-Allow-Credentials": true
    //         };
    //         res.writeHead(200, headers);
    //         res.end();
    //     }    
    // }
        {
//      transports: ['websocket'],
//      rejectUnauthorized: false
}
);



// Serve the static files from the React app
app.use(express.static(path.join(__dirname, 'chatclient/build')));

// An api endpoint that returns a short list of items
app.get('/', (req,res) => {

});

// Handles any requests that don't match the ones above
app.get('/', (req,res) =>{
    res.sendFile(path.join(__dirname+'/chatclient/build/index.html'));
});

server.listen(process.env.PORT || 3000);

const users = [];
function findUser(id) {
    for (var i=0; i < users.length; i++) {
        if (users[i].id == id) {
            console.log('found');
            return users[i];    
        }
    }
}
//io.origins('*:*');

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

console.log("server is running on port 3000");
