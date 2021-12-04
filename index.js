require('dotenv').config()
const SecretStack = require('secret-stack')
const caps = require('./caps')
const ssbKeys = require('ssb-keys')
const path = require('path')
var Viewer = require('@planetary-ssb/viewer')

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

console.log('sbot', sbot.config.keys.public)

var viewer = Viewer(sbot)
viewer.listen(PORT, '0.0.0.0', (err, address) => {
    if (err) throw err
    console.log(`Server is now listening on ${address}`)
})
