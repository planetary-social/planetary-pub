require('dotenv').config()
// const { where,  and, type, toCallback, descending,
//     paginate, predicate } = require('ssb-db2/operators')
const SecretStack = require('secret-stack')
const ssbKeys = require('ssb-keys')
const path = require('path')
const init = require('./init')
const alice = require('./test/test-data/user.json')
const bob = require('./test/test-data/user-two.json')
const carol = require('./test/test-data/user-three.json')
const dan = require('./test/test-data/non-public-user.json')
const rimraf = require('rimraf')
const PUBS = require('./pubs.json')
var after = require('after')
// var bipf = require('bipf')

const { NODE_ENV } = process.env

var caps = require('ssb-caps')
if (process.env.NODE_ENV === 'test') {
    caps = require('./caps-dev.js')
}

var DB_PATH = process.env.DB_PATH || (__dirname + '/db')
if (NODE_ENV === 'staging-local') {
    DB_PATH = process.env.DB_PATH || __dirname + '/db-staging'
}

console.log('**DB PATH**', DB_PATH)


module.exports = start


function start (cb) {
    if (NODE_ENV === 'test') {
        // first reset the DB by deleting it
        rimraf(path.join(DB_PATH, 'db2'), (err) => {
            if (err) return cb(err)

            var { sbot } = _start()
            sbot.peers = []

            // then write new records
            init(sbot, alice, bob, carol, dan, (err) => {
                if (err) return cb(err)
                cb(null, sbot)
            })
        })
    } else {
        // don't reset the DB if we're not in `test` env
        if (NODE_ENV === 'staging' || NODE_ENV === 'staging-local') {
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
                cb(null, sbot)
            })


            // friends.follow publishes this msg:

            // const content = {
                // type: 'contact',
                // contact: feedId,
                // following: 'state' in opts ? opts.state : true,
                // recps: opts.recps
            // }
            // sbot.publish(content, cb)


            sbot.friends.follow(PUBS.one.id, null, (err, res) => {
                if (err) {
                    console.log('errrrr', err)
                    return next(err)
                }
                next(null, res)
                console.log('**follow pub one**', res)
            })

            // TODO
            // shouldn't the replication-scheduler plugin handle this?
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


            // The `seekType` function takes a buffer and uses `bipf` APIs to search for
            // the fields we want.
            // better for performance if defined outside
            // const bValue = Buffer.from('value') 
            // const bContent = Buffer.from('content')
            // const bType = Buffer.from('type')

            // function seekBlob (buf) {
            //     // p stands for "position" in the buffer, offset from start
            //     var p = 0 
            //     p = bipf.seekKey(buf, p, bValue)
            //     if (p < 0) return
            //     p = bipf.seekKey(buf, p, bContent)
            //     if (p < 0) return
            //     return bipf.seekKey(buf, p, bType)
            // }

            // sbot.db.query(
            //     where(
            //         and(
            //             type('post'),
            //             predicate(seekBlob, arg => {
            //                 console.log('***arg***', arg)
            //             }, { name: 'blobs' })
            //         )
            //     ),
            //     descending(),
            //     paginate(10),
            //     toCallback((err, res) => {
            //         if (err) return console.log('arrrrr', err)
            //         console.log('res', res)
            //     })
            // )


            cb(null, sbot)
        }
    }
}


function _start () {
    // create the sbot
    const sbot = SecretStack({ caps })
        .use(require('ssb-db2'))
        .use(require('ssb-db2/full-mentions')) // include index
        .use(require('ssb-db2/compat')) // include all compatibility plugins
        .use(require('ssb-about-self'))
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
