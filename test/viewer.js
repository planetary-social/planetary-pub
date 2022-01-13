var fetch = require('node-fetch');
var test = require('tape')
const crypto = require('crypto')
const SecretStack = require('secret-stack')
const ssbKeys = require('ssb-keys')
var path = require('path')
var { read } = require('pull-files')
var S = require('pull-stream')
const _ = {
    flatten: require('lodash.flatten')
}
const rimraf = require('rimraf')
const after = require('after')
const series = require('run-series')
var Server = require('../viewer')
const caps = require('./caps.json')
const user = require('./user.json')
const userTwo = require('./user-two.json')
const alice = user

const PORT = 8888
const BASE_URL = 'http://localhost:' + PORT
const DB_PATH = process.env.DB_PATH || (__dirname + '/db')
const SERVER_KEYS = ssbKeys.loadOrCreateSync(path.join(DB_PATH, 'secret'))

var msgKey
var server
var sbot
test('setup', t => {
    rimraf(DB_PATH + '/db2', (err) => {
        t.error(err)
        sbot = createSbot({ DB_PATH })
        server = Server(sbot)

        sbot.db.publishAs(alice, {
            type: 'about',
            about: alice.id,
            name: 'alice'
        }, (err) => {
            t.error(err)

            var next = after(2, (err) => {
                t.error(err)
                t.end()
            })

            sbot.db.publish({ type: 'test', text: 'woooo 1' }, (err, msg) => {
                msgKey = msg.key
                next(err)
            })

            // Run the server!
            server.listen(8888, '0.0.0.0', (err, address) => {
                next(err)
                console.log(`Server is now listening on ${address}`)
            })
        })
    })

})

test('server', t => {
    fetch(BASE_URL + '/')
        .then(res => {
            res.text().then(text => {
                t.ok(text.includes(sbot.config.keys.id),
                    "should return the server's id")
                t.ok(text.includes('test'), 'should include the env variable')
                t.end()
            })
        })
        .catch(err => {
            t.fail(err)
            t.end()
        })
})

test('get a message', t => {
    fetch(BASE_URL + '/' + encodeURIComponent(msgKey))
        .then(res => {
            if (!res.ok) {
                return res.text().then(text => {
                    console.log('**failure text**', text)
                    t.fail(text)
                    t.end()
                })
            }
            return res.json()
        })
        .then(({ messages }) => {
            t.equal(messages.length, 1, 'should return a single message')
            t.equal(messages[0].key, msgKey,
                'should return the right message')
            t.end()
        })
        .catch(err => {
            t.fail(err)
            t.end()
        })
})

var childKey
test('get a thread', t => {
    // var newKey
    var content = { type: 'test', text: 'woooo 2', root: msgKey }

    sbot.db.publish(content, (err, res) => {
        if (err) {
            t.fail(err.toString())
            return t.end()
        }

        childKey = res.key

        // we are requesting the 'root' message here
        // how to get a thread when you are given a child message?
        fetch(BASE_URL + '/' + encodeURIComponent(msgKey))
            .then(_res => _res.json())
            .then(({ messages, full }) => {
                t.equal(full, true, 'should have the full thread')
                t.equal(messages.length, 2,
                    'should return all the messages in the thread')
                t.equal(messages[0].key, msgKey,
                    'should return messages in the right order')
                t.end()
            })
            .catch(err => {
                t.fail(err)
                t.end()
            })
    })
})

test('get a thread given a child message', t => {
    fetch(BASE_URL + '/' + encodeURIComponent(childKey))
        .then(res => res.json())
        .then(({ messages }) => {
            t.equal(messages[0].key, msgKey,
                'should send back the thread starting with the root')
            t.end()
        })
        .catch(err => {
            console.log('oh no', err)
            t.fail(err)
            t.end()
        })
})

test('get a feed', t => {
    // publish their 'name' msg
    sbot.db.publishAs(alice, {
        type: 'about',
        about: alice.id,
        name: 'alice'
    }, (err) => {
        if (err) console.log('errrrr', err)
        t.error(err)

        // following them is necessary for the `ssb-suggest-lite` plugin
        sbot.friends.follow(alice.id, null, function (err) {
            if (err) return t.fail(err)

            // now post a message by them
            sbot.db.publishAs(alice, {
                type: 'post',
                text: 'wooo'
            }, (err, msg) => {
                t.error(err)
                // publish a threaded response by a different user
                sbot.db.publishAs(userTwo, {
                    type: 'post',
                    text: 'wooo2',
                    root: msg.key
                }, (err) => {
                    t.error(err)

                    // finally get their feed
                    fetch(BASE_URL + '/feed/' + 'alice')
                        .then(res => res.ok ? res.json() : res.text())
                        .then(res => {
                            // console.log('**res here**', res)
                            var flatMsgs = _.flatten(res)

                            var firstMsg = flatMsgs.find(el => {
                                return el.key && (el.key === msg.key)
                            })

                            var threadedMsg = flatMsgs.find(el => {
                                return el.value.author === userTwo.id
                            })
                            t.ok(threadedMsg, 'should return threaded msgs')
                            t.ok(firstMsg, "should return the user's feed")
                            t.equal(firstMsg.value.author, user.id,
                                'should have the right author')
                            t.end()
                        })
                        .catch(err => {
                            t.fail(err)
                            t.end()
                        })
                    })
            })
        })
    })
})

test('feeds are paginated', t => {
    // create an array filled with 0...n
    var postsContent = Array.from({ length: 30 }, (_, i) => i)

    // post all the test content we just made
    series(postsContent.map(content => {
        return cb => {
            sbot.db.publishAs(alice, {
                type: 'post',
                text: 'test post ' + content
            }, cb)
        }
    }), () => {
        // call the http API
        fetch(BASE_URL + '/feed/' + 'alice')
            .then(res => res.ok ? res.json() : res.text())
            .then(res => {
                t.equal(res.length, 10, 'should paginate the results')
                t.equal(res[0].value.content.text, 'test post 29',
                    'should return messages in reverse order')
                t.end()
            })
            .catch(err => {
                t.fail(err)
                console.log('oh no', err)
                t.end()
            })

    })
})

test('get a non-existant feed', t => {
    fetch(BASE_URL + '/feed/' + 'foo')
        .then(res => {
            if (res.ok) t.fail('should return 404')
            t.equal(res.status, 404, 'should return 404')
            t.end()
        })
        .catch(err => {
            t.fail('should get a 404 response', err)
            t.end()
        })
})

test('get default view', t => {
    var content = { type: 'post', text: 'woooo' }
    sbot.db.publish(content, (err, msg) => {
        var key = msg.key
        if (err) {
            t.fail(err.toString())
            return t.end()
        }

        fetch(BASE_URL + '/default')
            .then(res => res.ok ? res.json() : res.text())
            .then(res => {
                t.equal(res[0].root.key, key,
                    'should return all messages that we know about')
                t.equal(res.length, 10, 'should paginate results')
                t.end()
            })
            .catch(err => {
                t.fail(err)
                t.end()
            })
    })
})

test('get a blob', t => {
    S(
        read(__dirname + '/caracal.jpg'),
        S.map(file => file.data),
        sbot.blobs.add((err, blobId) => {
            if (err) {
                t.fail(err)
                return t.end()
            }

            fetch(BASE_URL + '/blob/' + encodeURIComponent(blobId))
                .then(res => res.ok ? res.buffer() : res.text())
                .then(buf => {
                    t.equal(blobId, hash(buf), 'should serve the blob')
                    t.end()
                })
                .catch(err => {
                    console.log('errrr', err)
                    t.fail(err)
                    t.end()
                })
        })
    )
})

test('get messages for a hashtag', t => {
    t.plan(1)

    var content = { type: 'post', text: 'woooo #test', channel: '#test' }

    sbot.db.publishAs(user, content, (err, newMsg) => {
        if (err) return t.fail(err)

        fetch(BASE_URL + '/tag/test')
            .then(res => res.ok ? res.json() : res.text())
            .then(res => {
                t.equal(res[0].root.key, newMsg.key)
            })
            .catch(err => t.fail(err))
    })
})

test('get counts of messages', t => {
    fetch(BASE_URL + '/counts/alice')
        .then(res => res.ok ? res.json() : res.text())
        .then(res => {
            t.equal(res.username, 'alice', 'should return username')
            t.equal(res.id, alice.id, 'should return user ID')
            t.equal(typeof res.posts, 'number',
                'should return number of posts')
            t.equal(typeof res.following, 'number',
                'should return folling count')
            t.equal(typeof res.followers, 'number',
                'should have number of folloers')
            t.equal(res.username, 'alice', 'should return the username')
            t.end()
        })
        .catch(err => {
            t.fail(err)
            t.end()
        })

})

test('get a profile', t => {
    // __put an avatar__
    // save the blob
    S(
        read(__dirname + '/test-data/cinnamon-roll.jpg'),
        S.map(file => file.data),
        sbot.blobs.add(function (err, blobId) {
            t.error(err)

            // now save the message
            sbot.db.publishAs(alice, {
                type: 'about',
                about: alice.id,
                image: {
                link: blobId,       // required
                type: 'image/jpeg' // optional, but recommended
                }
            }, (err) => {
                t.error(err)

                // now get the profile
                fetch(BASE_URL + '/profile/alice')
                    .then(res => res.ok ? res.json() : res.text())
                    .then(profile => {
                        t.equal(profile.image, blobId,
                            "should have the user's avatar")
                        t.equal(profile.name, 'alice',
                            'should have the username')
                        t.end()
                    })
                    .catch(err => {
                        t.fail(err)
                        t.end()
                    })

            })

        })
    )

})

function hash (buf) {
    buf = typeof buf === 'string' ? Buffer.from(buf) : buf
    return '&' + crypto.createHash('sha256')
        .update(buf)
        .digest('base64') + '.sha256'
}

test('all done', t => {
    server.close(err => {
        if (err) {
            t.fail(err)
            return console.log('errrr', err)
        }

        sbot.close((err) => {
            if (err) {
                t.fail(err)
                console.log('aaaaa', err)
            }
            t.end()
        })
    })
})

function createSbot ({ DB_PATH }) {
    const sbot = SecretStack({ caps })
        .use(require('ssb-db2'))
        .use(require('ssb-db2/full-mentions')) // include index
        .use(require('ssb-db2/compat')) // include all compatibility plugins
        .use(require('ssb-db2/about-self'))
        .use(require('ssb-friends'))
        .use(require('ssb-conn'))
        .use(require('ssb-ebt'))
        .use(require('ssb-threads'))
        .use(require('ssb-blobs'))
        .use(require('ssb-serve-blobs'))
        .use(require('ssb-suggest-lite'))
        .use(require('ssb-replication-scheduler'))
        .call(null, {
            path: DB_PATH,
            friends: {
                hops: 2
            },
            // the server has an identity
            keys: SERVER_KEYS
        })
    return sbot
}
