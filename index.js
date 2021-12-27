require('dotenv').config()
const SecretStack = require('secret-stack')
const caps = require('./caps')
const ssbKeys = require('ssb-keys')
const path = require('path')
var Viewer = require('@planetary-ssb/viewer')
// const { where, and, type, author, toCallback } = require('ssb-db2/operators')
const init = require('./init')
var user = require('./test-data/user.json')
var userTwo = require('./test-data/user-two.json')
const rimraf = require('rimraf')

const DB_PATH = process.env.DB_PATH || './db'
const PORT = 8888

if (require.main === module) {
    start(function (err) {
        if (err) return console.log('errr', err)
        console.log('server started')
    })
}

module.exports = start


function start (cb) {
    var { NODE_ENV } = process.env
    if (NODE_ENV === 'test' || NODE_ENV === 'staging') {
        // first reset the DB by deleting it
        rimraf(DB_PATH, (err) => {
            if (err) return cb(err)
            var { viewer, sbot } = _start()

            // then write new records
            init(sbot, user, userTwo, (err) => {
                if (err) return cb(err)
                viewer.listen(PORT, '0.0.0.0', (err, address) => {
                    if (err) return cb(err)
                    console.log(`Server is now listening on ${address}`)
                    cb(null, { viewer, sbot })
                })
            })

        })
    } else {
        var { viewer, sbot } = _start()
        viewer.listen(PORT, '0.0.0.0', (err, address) => {
            if (err) return next(err)
            console.log(`Server is now listening on ${address}`)
            cb(null, { viewer, sbot })
        })
    }
}


function _start () {
    // create the sbot
    const sbot = SecretStack({ caps })
        .use(require('ssb-db2'))
        .use(require('ssb-db2/compat')) // include all compatibility plugins
        .use(require('ssb-db2/about-self'))
        .use(require('ssb-friends'))
        .use(require('ssb-conn'))
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
        .call(null, {
            path: DB_PATH,
            friends: {
                hops: 2
            },
            // the server has an identity
            keys: ssbKeys.loadOrCreateSync(path.join(DB_PATH, 'secret'))
        })

    console.log('sbot', sbot.config.keys.id)

    var viewer = Viewer(sbot)

    // enable cors
    viewer.register(require('fastify-cors'), {})

    // static files
    viewer.register(require('fastify-static'), {
        root: path.join(__dirname, 'public'),
        dotfiles: 'allow'
        // prefix: '/public/', // optional: default '/'
    })

    // add another route
    viewer.get('/healthz', (_, res) => {
        res.code(200).send('ok')
    })

    return { viewer, sbot }
}
