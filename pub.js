require('dotenv').config()
// var S = require('pull-stream')
const SecretStack = require('secret-stack')
const ssbKeys = require('ssb-keys')
const path = require('path')
// const Viewer = require('@planetary-ssb/viewer')
// const Viewer = require('./viewer')
// const { where, and, type, author, toCallback } = require('ssb-db2/operators')
const init = require('./init')
const user = require('./test-data/user.json')
const userTwo = require('./test-data/user-two.json')
const rimraf = require('rimraf')
const PUBS = require('./pubs.json')
var after = require('after')

var caps = require('ssb-caps')
if (process.env.NODE_ENV === 'test') {
    caps = require('./caps-dev.js')
}

const DB_PATH = process.env.DB_PATH || (__dirname + '/db')
const PORT = 8888

console.log('**DB PATH**', DB_PATH)

if (require.main === module) {
    start(function (err) {
        if (err) return console.log('errr', err)
        console.log('server started')
    })
}

module.exports = start


function start (cb) {
    var { NODE_ENV } = process.env

    if (NODE_ENV === 'test') {
        // first reset the DB by deleting it
        rimraf(path.join(DB_PATH, 'db2'), (err) => {
            if (err) return cb(err)

            var { sbot } = _start()
            sbot.peers = []

            // then write new records
            init(sbot, user, userTwo, (err) => {
                if (err) return cb(err)
                cb(null, sbot)

                // viewer.listen(PORT, '0.0.0.0', (err, address) => {
                //     if (err) return cb(err)
                //     console.log(`Server is now listening on ${address}`)
                //     cb(null, { sbot })
                // })
            })

        })
    } else {
        // don't reset the DB if we're not in `test` env
        if (NODE_ENV === 'staging') {
            // follow some other pubs
            console.log('**is staging**')

            var { sbot } = _start()
            // add our current connections here
            var peers = sbot.peers = []

            sbot.on('rpc:connect', (ev) => {
                console.log('***rpc:connect***', ev.stream.address)
            })
            
            var next = after(4, (err) => {
                if (err) return cb(err)
                cb(null)
            })

            sbot.friends.follow(PUBS.one.id, null, (err, res) => {
                if (err) {
                    console.log('errrrr', err)
                    return next(err)
                }
                next(null, res)
                console.log('**follow pub one**', res)
            })

            sbot.conn.connect(PUBS.one.host, (err, ssb) => {
                if (err) {
                    console.log('errrrr', err)
                    return next(err)
                }
                console.log('**connect pub one**', !!ssb.blobs)
                peers.push(ssb)
                next(null, ssb)
            })

            sbot.friends.follow(PUBS.cel.id, null, (err, res) => {
                if (err) return console.log('errrr', err)
                console.log('**follow** cel', res)
            })

            sbot.conn.connect(PUBS.cel.host, (err, ssb) => {
                if (err) {
                    console.log('errrrr', err)
                    return next(err)
                }
                console.log('**connect cel***', !!ssb.blobs)
                peers.push(ssb)
                next(null, ssb)
            })

            cb(null, { sbot })
        }
    }
}


function _start () {
    // create the sbot
    const sbot = SecretStack({ caps })
        .use(require('ssb-db2'))
        .use(require('ssb-db2/full-mentions')) // include index
        .use(require('ssb-db2/compat')) // include all compatibility plugins
        .use(require('ssb-db2/about-self'))
        .use(require('ssb-friends'))
        .use(require('ssb-ebt'))
        .use(require('ssb-threads'))
        // .use(require('ssb-db2/compat/ebt')) // ebt db helpers
        // .use(require('ssb-db2/compat/db')) // basic db compatibility
        .use(require('ssb-blobs'))
        // .use(require('ssb-serve-blobs'))
        // .use(require('ssb-backlinks'))
        //   TypeError: ssb._flumeUse is not a function
        .use(require('ssb-suggest-lite'))
        // .use(require('ssb-links'))
        //   TypeError: ssb._flumeUse is not a function
        .use(require('ssb-replication-scheduler'))
        .use(require('ssb-conn'))
        .call(null, {
            path: DB_PATH,
            friends: {
                hops: 3
            },
            // the server has an identity
            keys: ssbKeys.loadOrCreateSync(path.join(DB_PATH, 'secret'))
        })

    console.log('sbot', sbot.config.keys.id)

    return { sbot }
}
