const http = require("http");

const host = 'localhost';
const port = 8000;

const server = http.createServer(function (req, res) {
    res.writeHead(200);
    res.end("hello there");
})

server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
})

