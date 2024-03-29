const fetch = require('node-fetch')
const test = require('tape')
const crypto = require('crypto')
const SecretStack = require('secret-stack')
const ssbKeys = require('ssb-keys')
const path = require('path')
const { read } = require('pull-files')
const S = require('pull-stream')
const flatten = require('lodash.flatten')

const rimraf = require('rimraf')
const series = require('run-series')
const Server = require('../viewer')
const caps = require('./caps.json')
const user = require('./user.json')
const userTwo = require('./user-two.json')
const alice = user
const bob = userTwo
const dan = require('./test-data/non-public-user.json')

const { where, author, toCallback } = require('ssb-db2/operators')

const PORT = 8888
const BASE_URL = 'http://localhost:' + PORT
const DB_PATH = process.env.DB_PATH || (__dirname + '/db')
const SERVER_KEYS = ssbKeys.loadOrCreateSync(path.join(DB_PATH, 'secret'))

var msgKey
var server
var sbot

function setup (cb) {
    rimraf(DB_PATH + '/db2', (err) => {
        if (err) return cb(err)
        sbot = createSbot({ DB_PATH })
        server = Server(sbot)
        
        console.log('sbot id', sbot.config.keys.id)

        series(
          [
            cb => sbot.db.publish({ type: 'about', about: sbot.id, name: 'sbot', publicWebHosting: true }, cb),
            cb => sbot.db.publishAs(alice, { type: 'about', about: alice.id, name: 'alice', publicWebHosting: true }, cb),
            cb => sbot.db.publishAs(bob, { type: 'about', about: bob.id, name: 'bob', publicWebHosting: true }, cb),
            cb => sbot.db.publishAs(dan, { type: 'about', about: dan.id, name: 'dan', publicWebHosting: false }, cb),
            // TODO: test on publicWebHosting=undefined

            cb => sbot.db.publish({ type: 'post', text: 'woooo 1' }, (err, msg) => {
                if (err) return cb(err)
                msgKey = msg.key
                cb(null, msg)
            }),

            cb => sbot.friends.follow(alice.id, { state: true }, cb),
            cb => sbot.friends.follow(dan.id, { state: true }, cb)
            // NOTE we have to follow alice so that ssb-suggest-lite will recommend her
            // when we GET /feed/alice
          ],
          // onDone
          (err, msgs) => {
            if (err) return cb(err)
            server.listen(8888, '0.0.0.0', (err, address) => {
                if (err) throw err
                console.log(`Server is now listening on ${address}`)

                sbot.db.query(
                    where(
                        author(alice.id)
                    ),
                    toCallback(cb)
                )
            })
          }
        )
    })
}

test('setup', t => {
  setup(err => {
    t.error(err)
    t.end()
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
    fetch(BASE_URL + '/msg/' + encodeURIComponent(msgKey))
        .then(res => res.json())
        .then(res => {
            t.equal(res.messages.length, 1, 'should return a single message')
            t.equal(res.messages[0].key, msgKey, 'should return the right message')
            t.end()
        })
})

test('get a bad message', t => {
    fetch(BASE_URL + '/msg/' + 'foo' + encodeURIComponent(msgKey))
        .then(res => {
            if (res.ok) t.fail('should return 404')
            t.equal(res.status, 404, 'should return 404')

            t.end()
        })
})

test('get a message published by someone who has publicWebHosting=false', t => {
    const content = {
        type: 'post',
        text: 'boom'
    }

    sbot.db.publishAs(dan, content, (err, msg) => {
        t.error(err, 'dan publishes a message')

        // we fetch that message
        fetch(BASE_URL + '/msg/' + encodeURIComponent(msg.key))
            .then(res => res.json())
            .then(({ messages }) => {
                // we shouldnt be able to see it
                t.equals(messages.length, 0, 'should return no messages')

                t.end()
            })
    })
})

var childKey
test('get a thread', t => {
    // var newKey
    var content = {
        type: 'post',
        text: 'woooo 2',
        root: msgKey
    }

    sbot.db.publish(content, (err, res) => {
        if (err) {
            t.fail(err.toString())
            return t.end()
        }

        childKey = res.key

        // we are requesting the 'root' message here
        // how to get a thread when you are given a child message?
        fetch(BASE_URL + '/msg/' + encodeURIComponent(msgKey))
            .then(_res => _res.json())
            .then((res) => {
                const { messages, full } = res

                t.equal(full, true, 'should have the full thread')
                t.equal(
                    messages.length, 2,
                    'returns two messages'
                )

                t.equal(
                    messages[0].key, msgKey,
                    'the messages are in the right order'
                )

                t.deepEqual(
                    messages.map(m => m.value.content),
                    [
                        { type: 'post', text: 'woooo 1' },
                        { type: 'post', text: 'woooo 2', root: msgKey }
                    ],
                    'returns two messages'
                )

                t.end()
            })
            .catch(err => {
                t.fail(err)
                t.end()
            })
    })
})

/*
This covers the case where alice has opted in to publicWebHosting and
has published a post, which has a response from dan, who has opted out
*/
test('get a thread 2 (publicWebHosting=false)', t => {
    // now post a message by alice
    sbot.db.publishAs(alice, {
        type: 'post',
        text: 'say bye'
        }, (err, msg) => {
        t.error(err, 'alice posts a msg')

        // publish a threaded response by user who has opted out of public web hosting
        sbot.db.publishAs(dan, {
            type: 'post',
            text: 'bye',
            root: msg.key
        }, (err) => {
            t.error(err, 'dan posts a threaded response to alices msg')

            // finally get the message
            fetch(BASE_URL + '/msg/' + encodeURIComponent(msg.key))
                .then(res => res.json())
                .then(({ messages }) => {
                    const firstMsg = messages.find(m => msg.key === m.key)
                    t.true(firstMsg, 'should return alices post')
        
                    t.equal(messages.length, 1, 'should not return dans message')
        
                    t.end()
                })
                .catch(err => {
                    t.fail(err)
                    t.end()
                })
        })
    })
})

test('get a thread given a child message', t => {
    fetch(BASE_URL + '/msg/' + encodeURIComponent(childKey))
        .then(res => res.json())
        .then(({ messages }) => {
            t.equal(messages[0].key, msgKey,
                'should send back the thread starting with the root')
            t.end()
        })
        .catch(err => {
            t.fail(err)
            t.end()
        })
})

test('get a thread given a child msg, when there are many responses', t => {
    var msgs = [{ type: 'post', text: 'woooo', root: msgKey }]
    var i = 0
    while (i++ < 10) {
        msgs.push(Object.assign({}, msgs[0], { text: 'woooo ' + i }))
    }

    series(
      msgs.map(msg => cb => sbot.db.publishAs(alice, msg, cb)),
      (err, res) => {
        // console.log('res', res)
        t.error(err)
        // in here, fetch from the endpoint
        fetch(BASE_URL + '/msg/' + encodeURIComponent(res[4].key))
            .then(res => res.json())
            .then(_res => {
                // console.log('res from fetch', _res)
                // console.log('res', res.map(msg => msg.key))
                // console.log('_res 5', _res.messages.map(msg => msg.key))
                var rootMsg = _res.messages.find(msg => msg.key === msgKey)
                var sixthMsg = _res.messages.find(msg => {
                    return msg.key === res[5].key
                })
                t.ok(sixthMsg, 'should return up to 20 messages in thread')
                t.ok(rootMsg, 'should return the root message')
                t.end()
            })
            .catch(err => {
                t.error(err)
                t.end()
            })
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
                            var flatMsgs = flatten(res)

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

test('get a feed, with a thread of someone who has publicWebHosting=false', t => {
    //  checking there was an about message
    sbot.aboutSelf.get(dan.id, (err, profile) => { // extra checks to make sure dan actually opted out of public web hosting
        t.error(err, 'get message bout self')
        t.true(profile.publicWebHosting === false, 'public web hosting is disabled')

        sbot.db.publishAs(alice, {
            type: 'post',
            text: 'say hi'
        }, (err, msg) => {
            t.error(err)
            // publish a threaded response by a different user
            sbot.db.publishAs(dan, {
                type: 'post',
                text: 'hi',
                root: msg.key
            }, (err) => {
                t.error(err)

                // finally get their feed
                fetch(BASE_URL + '/feed/' + 'alice')
                    .then(res => res.ok ? res.json() : res.text())
                    .then(res => {
                        const flatMsgs = flatten(res)

                        const firstMsg = flatMsgs.find(el => {
                            return el.key && (el.key === msg.key)
                        })
                        t.ok(firstMsg, 'should return alices message')
                        t.equal(firstMsg.value.author, user.id,
                            'alice is the author')

                        const threadedMsg = flatMsgs.find(el => {
                            return el?.value?.author === dan.id
                        })

                        t.false(threadedMsg, 'should not return the threaded msg from dan')

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

test('get a feed from someone who has publicWebHosting=false', t => {
    //  checking there was an about message
    sbot.aboutSelf.get(dan.id, (err, profile) => { // extra checks to make sure dan actually opted out of public web hosting
        t.error(err, 'get message bout self')
        t.true(profile.publicWebHosting === false, 'public web hosting is disabled')

        sbot.db.publishAs(alice, {
            type: 'post',
            text: 'say bye'
        }, (err, msg) => {
            t.error(err)
            // publish a threaded response by a different user
            sbot.db.publishAs(dan, {
                type: 'post',
                text: 'bye',
                root: msg.key
            }, (err) => {
                t.error(err)

                // finally get their feed
                fetch(BASE_URL + '/feed/' + 'dan')
                    // .then(res => res.ok ? res.json() : res.text())
                    .then(res => {
                        if (res.ok) t.fail('should return 404')
                        t.equal(res.status, 404, 'should return 404')

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


test('feeds are paginated', t => {
    // create an array filled with 0...n
    var postsContent = Array.from({ length: 30 }, (_, i) => i)

    // post all the test content we just made
    series(
        postsContent.map(content => {
            return (cb) => {
                sbot.db.publishAs(alice, {
                    type: 'post',
                    text: 'test post ' + content
                }, (err, msg) => {
                    if (err) return cb(err)
                    setTimeout(() => cb(null, msg), 50)
                })
            }
        }),
        (err, data) => {
            t.error(err)
            t.equal(data?.length, 30, 'alice posts 30 root messages')

            // call the http API
            fetch(BASE_URL + '/feed/' + 'alice?cacheInvalidate=' + Date.now())
                // NOTE - adding custom query invalidates the cache, which forces fresh results
                .then(res => res.json())
                .then(res => {
                    t.equal(res.length, 10, 'should paginate the results')
                    t.equal(res[0].value.content.text, 'test post 29', 'should return messages in reverse order')
                    t.end()
                })
                .catch(err => {
                    t.fail(err)
                    console.log('oh no', err)
                    t.end()
                })

        }
    )
})

test('get counts by id', t => {
    fetch(BASE_URL + '/counts-by-id/' + encodeURIComponent(alice.id))
        .then(res => res.json())
        .then(res => {
            t.equal(res.id, alice.id, 'should return the right user id')
            t.equal(res.posts, 45, 'should count the posts')
            t.equal(res.followers, 1, 'should count the followers')
            t.equal(res.following, 0, 'should count following')
            t.end()
        })
})

test('get counts by id (publicWebHosting=false)', t => {
    fetch(BASE_URL + '/counts-by-id/' + encodeURIComponent(dan.id))
        // .then(res => res.json())
        .then(res => {
            // t.equal(res.id, dan.id, 'should return the right user id')

            // // TODO: decide whether to return 0, or return empty
            // t.equal(res.posts, 0, 'should count the posts')
            // t.equal(res.followers, 0, 'should count the followers')
            // t.equal(res.following, 0, 'should count following')

            if (res.ok) t.fail('should return 404')
            t.equal(res.status, 404, 'should return 404')

            t.end()
        })
})

test('get a user by id', t => {
    var id = encodeURIComponent(alice.id)

    fetch(BASE_URL + '/feed-by-id/' + id)
        .then(res => res.json())
        .then(json => {
            json.forEach(msg => {
                t.equal(msg.value.author, alice.id, 'should return the right feed')
            })
            t.end()
        })
})

test('get a user by id (publicWebHosting=false)', t => {
    var id = encodeURIComponent(dan.id)

    fetch(BASE_URL + '/feed-by-id/' + id)
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
        if (err) {
            t.fail(err.toString())
            return t.end()
        }

        const msgTwo = { type: 'post', text: 'ok', root: msg.key }
        sbot.db.publish(msgTwo, (err, msg) => {
            if (err) {
                t.fail(err.toString())
                return t.end()
            }

            fetch(BASE_URL + '/default')
                .then(res => res.ok ? res.json() : res.text())
                .then(threads => {
                    // console.log('**threads**',
                    //     JSON.stringify(threads, null, 2))

                    t.equal(threads[0].messages.length, 2,
                        'should return the threads as arrays')
                    t.equal(threads[0].messages[0].value.content.text, 'woooo',
                        'has the most recent message as start of a thread')
                    t.equal(threads[0].messages[1].value.content.root,
                        threads[0].messages[0].key,
                        'should have the right root for the reply')
                    t.equal(threads.length, 10, 'should paginate response')

                    t.end()
                })
                .catch(err => {
                    t.fail(err)
                    t.end()
                })
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
                    t.equal(hash(buf), blobId, 'should serve the blob')
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
    t.plan(2)

    var content = { type: 'post', text: 'woooo #test', channel: '#test' }

    sbot.db.publishAs(user, content, (err, newMsg) => {
        if (err) return t.fail(err)

        fetch(BASE_URL + '/tag/test')
            .then(res => res.ok ? res.json() : res.text())
            .then(res => {
                t.equal(res[0].root.key, newMsg.key)
                t.ok(res[0].root.value.content.text.includes('#test'),
                    'should have the right message text')
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

test('get a profile (publicWebHosting=false)', t => {
    S(
        read(__dirname + '/test-data/cinnamon-roll.jpg'),
        S.map(file => file.data),
        sbot.blobs.add(function (err, blobId) {
            t.error(err)

            // now save the message
            sbot.db.publishAs(dan, {
                type: 'about',
                about: dan.id,
                image: {
                    link: blobId,       // required
                    type: 'image/jpeg' // optional, but recommended
                }
            }, (err) => {
                t.error(err)

                // now get the profile
                fetch(BASE_URL + '/profile/dan')
                    .then(res => {
                        if (res.ok) t.fail('should return 404')
                        t.equal(res.status, 404, 'should return 404')
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

test('getProfiles route', t => {
    // here you get a profile by id
    fetch(BASE_URL + '/get-profiles', {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify({ ids: [alice.id, bob.id, dan.id] })
    })
        .then(res => {
            if (!res.ok) {
                t.fail('should not return invalid code')
                return t.end()
            }
            return res.json()
        })
        .then(res => {
            t.equal(res.length, 2, 'should return 2 profiles')
            t.equal(res[0].name, 'alice', 'should have a name for alice')
            t.equal(res[0].id, alice.id, 'should return the user id')
            t.equal(res[1].name, 'bob', 'should have bob')

            t.end()
        })
        .catch(err => {
            t.fail(err)
            t.end()
        })
})

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

function hash (buf) {
    buf = typeof buf === 'string' ? Buffer.from(buf) : buf
    return '&' + crypto.createHash('sha256')
        .update(buf)
        .digest('base64') + '.sha256'
}




function createSbot ({ DB_PATH }) {
    const sbot = SecretStack({ caps })
        .use(require('ssb-db2'))
        .use(require('ssb-db2/full-mentions')) // include index
        .use(require('ssb-db2/compat')) // include all compatibility plugins
        .use(require('ssb-about-self'))
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
