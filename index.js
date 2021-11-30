require('dotenv').config()
const SecretStack = require('secret-stack')
const caps = require('./caps')
// const { where, and, type, author, toCallback } = require('ssb-db2/operators')
var http = require('http')
const ssbKeys = require('ssb-keys')
const path = require('path')
const DB_PATH = process.env.DB_PATH || './db'
var faunadb = require('faunadb')
var ssc = require('@nichoth/ssc')
var bcrypt = require('bcrypt')
var pwds = require('./passwords.json')
// var Viewer = require('@planetary-ssb/viewer')
var Viewer = require('planetary-ssb-viewer')

const sbot = SecretStack({ caps })
    .use(require('ssb-db2'))
    // .use(require('ssb-db2/compat/ebt')) // ebt db helpers
    // .use(require('ssb-db2/compat/db')) // basic db compatibility
    .use(require('ssb-db2/compat')) // include all compatibility plugins
    .use(require('ssb-blobs'))
    // .use(require('ssb-backlinks'))
    //   TypeError: ssb._flumeUse is not a function
    .use(require('ssb-friends'))
    .use(require('ssb-conn'))
    .use(require('ssb-ebt'))
    // TypeError: sbot.links is not a function
    // .use(require('ssb-links'))
    //   TypeError: ssb._flumeUse is not a function
    .use(require('ssb-replication-scheduler'))
    .call(null, {
        path: DB_PATH,
        friends: {
            hops: 2
        },
        // the server has an identity
        keys: ssbKeys.loadOrCreateSync(path.join(DB_PATH, 'secret'))
    })

console.log('sbot', sbot.config.keys.public)

var content = { type: 'test', text: 'woooo' }
sbot.db.publish(content, (err, res) => {
    console.log('done publishing', err, res)
})

// Viewer(sbot, 8889)
Viewer.init(sbot, sbot.config)

var server = http.createServer(function onRequest (req, res) {
    if (req.url === '/healthz') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end('Hello World!');
    }

    if (req.url === '/follow-me') {
        req.on('error', (err) => {
            return res.end(err.toString())
        })

        // check if the given password matches
        let body = [];
        return req.on('data', (chunk) => {
            body.push(chunk)
        }).on('end', () => {
            body = Buffer.concat(body).toString()
            var json = JSON.parse(body)
            var { password, keys } = json
            // does the password match?
            bcrypt.compare(password, pwds[0])
                .then(isOk => {
                    if (!isOk) { // doesnt match
                        res.writeHead(400, { 'Content-Type': 'text/plain' })
                        return res.end('Invalid password')
                    }

                    // it matches
                    // start following them
                    return sbot.friends.follow(keys.id, null, (err, _res) => {
                        if (err) {
                            res.writeHead(500, {
                                'Content-Type': 'text/plain'
                            })
                            return res.end(err.toString())
                        }

                        console.log('follow res', _res)

                        res.writeHead(200, {
                            'Content-Type': 'application/json'
                        })
                        return res.end(JSON.stringify({ ok: true }))
                    })
                })
                .catch(err => {
                    res.writeHead(500, { 'Content-Type': 'text/plain' })
                    return res.end(err.toString)
                })
        })
    }


    if (req.url === '/create-invitation') {
        res.writeHead(200, { 'Content-Type': 'application/json' })

        let body = [];

        return req.on('data', (chunk) => {
            body.push(chunk)
        })
        .on('error', err => {
            res.writeHead(500, { 'Content-Type': 'text/plain' })
            return res.end(err.toString())
        })
        .on('end', () => {
            body = Buffer.concat(body).toString()
            var json = JSON.parse(body)

            console.log('json', json)
            var { invitation, keys } = json
            var { id, public } = keys

            // check if we are following the inviter
            sbot.friends.isFollowing({
                source: sbot.config.keys.id,
                dest: id
            }, function (err, isFoll) {
                console.log('*isFollowing*', err, isFoll)

                if (err) {  // return 500
                    res.writeHead(500, { 'Content-Type': 'text/plain' })
                    return res.end(err.toString())
                }

                if (!isFoll) { // not allowed to invite people
                    res.writeHead(401, { 'Content-Type': 'text/plain' })
                    return res.end('Invalid inviter')
                }

                // now check that the invitation has a valid signature
                var msgIsOk = ssc.verifyObj({ public }, null, invitation)
                if (!msgIsOk) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' })
                    return res.end('Invalid invitation')
                }

                // if all those things are ok
                // write the invitation to the DB
                var q = faunadb.query
                var client = new faunadb.Client({
                    // this is the secret for `planetary-pub` DB
                    // https://dashboard.fauna.com/db/us/planetary-pub
                    secret: process.env.FAUNADB_SECRET,
                    domain: 'db.us.fauna.com'
                })

                // we can use faunaDB to store invitations
                // now create the invitation document & return it
                client.query(
                    q.Create(q.Collection('invitations'), {
                        value: invitation,
                        key: ssc.getId(invitation),
                        // data: { value: msg, key: ssc.getId(invitation) }
                    })
                )

                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify())
            })
        })
    }

    // if (req.url === '/id') {

    // return the server id on any request
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    return res.end(sbot.config.keys.id)
});

server.listen(8888);

console.log('listening on 8888')
