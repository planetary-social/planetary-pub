const SecretStack = require('secret-stack')
const caps = require('./caps')
const { where, and, type, author, toCallback } = require('ssb-db2/operators')
var http = require('http')

const sbot = SecretStack({ caps })
    .use(require('ssb-db2'))
    // .use(require('ssb-db2/compat')) // include all compatibility plugins
    .call(null, { path: './db' })


var server = http.createServer(function (req, res) {
    if (req.url === '/healthz') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end('Hello World!');
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('aaaa')
});

server.listen(8888);

console.log('listening on 8888')


// // importing express framework
// const express = require("express");
// const app = express();

// // Respond with "hello world" for requests that hit our root "/"
// app.get("/", function (req, res) {
//     return res.send("Hello Planet earth");
// });

// // listen to port 7000 by default
// app.listen(process.env.PORT || 7000, () => {
//     console.log("Server is running");
// });

// module.exports = app;

