var S = require('pull-stream')
var caps = require('ssb-caps')
if (process.env.NODE_ENV === 'test') {
    caps = require('./caps-dev.js')
}
const SecretStack = require('secret-stack')
const ssbKeys = require('ssb-keys')
const path = require('path')
var { read } = require('pull-files')

const DB_PATH = process.env.DB_PATH || (__dirname + '/db-test')

const sbot = SecretStack({ caps })
    .use(require('ssb-db2'))
    .use(require('ssb-db2/full-mentions')) // include index
    .use(require('ssb-db2/compat')) // include all compatibility plugins
    .use(require('ssb-db2/about-self'))
    .use(require('ssb-friends'))
    .use(require('ssb-conn'))  // [x]
    .use(require('ssb-ebt'))  // [x]
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
    .use(require('ssb-replication-scheduler'))  // [x]
    .call(null, {
        path: DB_PATH,
        friends: {
            hops: 3
        },
        // the server has an identity
        keys: ssbKeys.loadOrCreateSync(path.join(DB_PATH, 'secret'))
    })


console.log(sbot.getAddress())

S(
    read(__dirname + '/test-data/wool.jpg'),
    S.map(file => file.data),
    sbot.blobs.add((err, blobId) => {
        console.log('**saved wool blob**', blobId)
    })
)
