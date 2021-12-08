require('dotenv').config()
const SecretStack = require('secret-stack')
const caps = require('./caps')
const ssbKeys = require('ssb-keys')
const path = require('path')
var Viewer = require('@planetary-ssb/viewer')
// const { where, and, type, author, toCallback } = require('ssb-db2/operators')
const init = require('./init')
var after = require('after')

const DB_PATH = process.env.DB_PATH || './db'
const PORT = 8888

if (require.main === module) {
    console.log('called directly');
    start()
} 

module.exports = start


function start (cb) {
    // create the sbot
    const sbot = SecretStack({ caps })
        .use(require('ssb-db2'))
        .use(require('ssb-db2/about-self'))
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

    var _res

    var next = after(2, (err) => {
        console.log('in here')
        if (err) return cb(err)
        cb(null, _res)
    })

    // can now add records to the DB
    if (process.env.NODE_ENV === 'test') {
        init(sbot, (err) => {
            next(err)
        })
    }


    var viewer = Viewer(sbot)

    // enable cors
    viewer.register(require('fastify-cors'), {})

    // add another route
    viewer.get('/healthz', (_, res) => {
        res.send('ok')
    })


    // `fastify` API
    viewer.listen(PORT, '0.0.0.0', (err, address) => {
        if (err) throw err
        console.log(`Server is now listening on ${address}`)
        _res = { viewer, sbot }
        next(null)
    })
}
