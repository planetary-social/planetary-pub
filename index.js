const http = require("http");

const server = http.createServer(function (req, res) {
    res.writeHead(200);
    res.end("hello there");
})

server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
})

