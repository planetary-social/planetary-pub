require('dotenv').config()
const SecretStack = require('secret-stack')
const caps = require('./caps')
const ssbKeys = require('ssb-keys')
const path = require('path')
var Viewer = require('@planetary-ssb/viewer')
const { where, and, type, author, toCallback } = require('ssb-db2/operators')
const parallel = require('run-parallel')

const user = require('./user.json')
const userTwo = require('./user-two.json')

const DB_PATH = process.env.DB_PATH || './db'
const PORT = 8888

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

console.log('sbot', sbot.config.keys.id)



// can now add records to the DB
parallel([user, userTwo].map(keys => {
    return function (cb) {
        sbot.db.deleteFeed(keys.id, (err, res) => {
            if (err) return cb(err)
            // there is no res
            // cb(null, res)
            cb(null, keys.id)
        })
    }
}), function allDone (err, res) {
    if (err) throw err
    console.log('**deleted feeds**', res)
    publishTestMsgs(user)
})


function publishTestMsgs (user) {
    var testMsgs = [
        { type: 'post', text: 'one' },
        { type: 'post', text: 'two' },
        { type: 'post', text: 'three' }
    ]

    parallel(testMsgs.map(msg => {
        return function postMsg (cb) {
            sbot.db.publishAs(user, msg, (err, res) => {
                if (err) return cb(err)
                cb(null, res)
            })
        }
    }), function allDone (err, res) {
        console.log('**published everything**', err, res)
    })
}



var viewer = Viewer(sbot)

// add another route
viewer.get('/healthz', (_, res) => {
    res.send('ok')
})

// `fastify` API
viewer.listen(PORT, '0.0.0.0', (err, address) => {
    if (err) throw err
    console.log(`Server is now listening on ${address}`)
})
