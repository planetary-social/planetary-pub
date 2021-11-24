const SecretStack = require('secret-stack')
const caps = require('./caps')
const { where, and, type, author, toCallback } = require('ssb-db2/operators')
var http = require('http')
const ssbKeys = require('ssb-keys')
const path = require('path')
const DB_PATH = process.env.DB_PATH || './db'

//  '/var/db'

const sbot = SecretStack({ caps })
    .use(require('ssb-db2'))
    // .use(require('ssb-db2/compat')) // include all compatibility plugins
    .call(null, {
        path: DB_PATH,

        // the server has an identity
        keys: ssbKeys.loadOrCreateSync(path.join(DB_PATH, 'secret'))
    })

// sbot.db.query(/*...*/)

console.log('sbot', sbot.config.keys.public)


var server = http.createServer(function (req, res) {
    if (req.url === '/healthz') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end('Hello World!');
    }

    if (req.url === '/test') {
        res.writeHead(200, { 'Content-Type': 'text/plain'})
        return res.end(sbot.config.keys.public)
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('aaaa')
});

server.listen(8888);

console.log('listening on 8888')
