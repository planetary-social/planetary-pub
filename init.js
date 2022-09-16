const parallel = require('run-parallel')
const series = require('run-series')
var S = require('pull-stream')
var { read } = require('pull-files')
const { readFileSync } = require('fs')

module.exports = function init (sbot, alice, bob, carol, dan, _cb) {
    // create profile data and test messages
    parallel([
        // save blobs
        cb => {
            S(
                read(__dirname + '/test/test-data/caracal.jpg'),
                S.map(file => file.data),
                sbot.blobs.add(function (err) {
                    if (err) return cb(err)

                    S(
                        read(__dirname + '/test/test-data/cinnamon-roll.jpg'),
                        S.map(file => file.data),
                        sbot.blobs.add((err, blobId) => {
                            console.log('**saved demo blobs**')
                            cb(err, blobId)
                        })
                    )

                })
            )
        },

        // create user profiles
        saveProfiles,

        // follow people
        cb => {
            parallel([alice, bob].map(keys => {
                return function (_cb) {
                    sbot.friends.follow(keys.id, null, function (err) {
                        if (err) return _cb(err)
                        _cb(null)
                    })
                }
            }), (err) => {
                if (err) return cb(err)
                cb(null)
            })
        },

        // publish demo posts
        publishTestMsgs

    ], function allDone (err) {
        if (err) return _cb(err)
        _cb(null)
    })

    function saveProfiles (cb) {
        parallel([
            cb => {
                sbot.db.publishAs(alice, {
                    type: 'about',
                    about: alice.id,
                    name: 'alice'
                }, cb)
            },
            cb => {
                sbot.db.publishAs(alice, {
                    type: 'about',
                    about: alice.id,
                    // the cinnamon roll hash
                    // eslint-disable-next-line
                    image: '&Ho1XhW2dp4bNJLZrYkurZPxlUhqrknD/Uu/nDp+KnMg=.sha256',
                    publicWebHosting: true,
                }, cb)
            },
            cb => {
                sbot.db.publishAs(bob, {
                    type: 'about',
                    about: bob.id,
                    name: 'bob',
                    publicWebHosting: true,
                }, (err, res) => {
                    cb(err, res)
                })
            },
            cb => {
                sbot.db.publishAs(carol, {
                    type: 'about',
                    about: carol.id,
                    name: 'carol',
                    publicWebHosting: true,
                }, (err, res) => {
                    cb(err, res)
                })
            },
            cb => {
                sbot.db.publishAs(dan, {
                    type: 'about',
                    about: dan.id,
                    name: 'dan',
                    publicWebHosting: false,
                }, (err, res) => {
                    cb(err, res)
                })
            }
        ],

        function done (err) {
            cb(err)
        })
    }

    function publishTestMsgs (_cb) {

        // to test pagination
        var testMsgs = Array.from({ length: 20 }).map((_, i) => {
            return {
                type: 'post',
                text: 'pagination test ' + i
            }
        }).concat([
            { type: 'post', text: 'post with a hashtag #test',
                channel: '#test' },

            { type: 'post', text: 'post with just text' },

            // post with an inline image only (no text) (caracal image)
            {
                type: 'post',
                // eslint-disable-next-line
                text: '![a blob](&SNZQDvykMENRmJMVyLfG20vlvgelGwj03C3YjWEi0JQ=.sha256)'
            },

            {
                type: 'post',
                text: 'a post with the same image inline and attached ' +
                    // cinnamon roll
                    // eslint-disable-next-line
                    '![a blob](&Ho1XhW2dp4bNJLZrYkurZPxlUhqrknD/Uu/nDp+KnMg=.sha256)',
                mentions: [{
                    // eslint-disable-next-line
                    link: '&Ho1XhW2dp4bNJLZrYkurZPxlUhqrknD/Uu/nDp+KnMg=.sha256',
                    name: 'test.jpg', // optional, but recommended
                    size: 12,          // optional, but recommended
                    type: 'image/jpeg' // optional, but recommended
                }]
            },

            // post with text, no image
            {
                type: 'post',
                text: 'A post with only **markdown** text, no images.'
            },

            // post with text & inline image
            {
                type: 'post',
                text: 'some example text with an inline image' +
                    // eslint-disable-next-line
                    '![a blob](&SNZQDvykMENRmJMVyLfG20vlvgelGwj03C3YjWEi0JQ=.sha256)' +
                    ' some more example text'
            },

            // post mentioning a user
            {
                type: 'post',
                text: 'mentioning a user, not a blob',
                mentions: [{
                    // eslint-disable-next-line
                    link: '@lV5MISER9oGaZJ7OLhlsUNVWHu982USYgMEWfIs6le0=.ed25519',
                    name: 'alice'
                }]
            },

            // eslint-disable-next-line
            // superpost based on %Fug4KlZ6wVgndMpsd08CtVmDpqUEp3Pq+EImZ6WNKBo=.sha256
            {
                type: 'post',
                text: readFileSync(__dirname +
                    '/test/test-data/super-post.md', 'utf8')
            }
        ])

        series([
            ...testMsgs.map(msg => cb => {
                sbot.db.publishAs(alice, msg, cb)
            }),
            cb => {
                sbot.db.publishAs(bob, {
                    type: 'post',
                    text: 'Say Hi'
                }, cb)
            }
        ],

        function allDone (err, msgs) {
            if (err) return _cb(err)
            var msg = msgs[msgs.length - 1]



            // more test data
            series([
                cb => {
                    sbot.db.publishAs(alice, {
                        type: 'post',
                        text: `testing mentioning a user -- ${bob.id}
                            as a md link  -- [another name](${alice.id})
                            and a msg -- ${msg.key}
                            msg as md link -- [link](${msg.key})
                            heres dans id btw ${dan.id}
                        `
                    }, cb)
                },

                cb => {
                    sbot.db.publishAs(bob, {
                        type: 'vote',
                        vote: {
                            link: msg.key,
                            value: 1,
                            expression: 'Like'
                        }
                    }, cb)
                },

                cb => {
                    sbot.db.publishAs(alice, {
                        type: 'post',
                        text: `Kia ora. **some markown**
                            [hurray](https://example.com/)`,
                        root: msg.key
                    }, cb)
                },

                cb => {
                    sbot.db.publishAs(bob, {
                        type: 'post',
                        text: 'Bonjour',
                        root: msg.key
                    }, cb)
                },

                cb => {
                    sbot.db.publishAs(dan, {
                        type: 'post',
                        text: 'Anyong',
                        root: msg.key
                    }, cb)
                }
            ], (err, _msgs) => {
                if (err) return _cb(err)
                _cb(null, _msgs)
            })
        })
    }
}
