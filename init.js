const parallel = require('run-parallel')
var S = require('pull-stream')
var { read } = require('pull-files')
const { readFileSync } = require('fs')

module.exports = function init (sbot, user, userTwo, _cb) {
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

        saveProfiles,

        // follow people
        cb => {
            parallel([user, userTwo].map(keys => {
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

        publishTestMsgs

    ], function allDone (err) {
        if (err) return _cb(err)
        _cb(null)
    })

    function saveProfiles (cb) {
        parallel(
            [
                cb => {
                    sbot.db.publishAs(user, {
                        type: 'about',
                        about: user.id,
                        name: 'alice'
                    }, cb)
                },
                cb => {
                    sbot.db.publishAs(user, {
                        type: 'about',
                        about: user.id,
                        // the cinnamon roll hash
                        // eslint-disable-next-line
                        image: '&Ho1XhW2dp4bNJLZrYkurZPxlUhqrknD/Uu/nDp+KnMg=.sha256'
                    }, cb)
                },
                cb => {
                    sbot.db.publishAs(userTwo, {
                        type: 'about',
                        about: userTwo.id,
                        name: 'bob'
                    }, (err, res) => {
                        cb(err, res)
                    })
                }
            ],
            function done (err) {
                cb(err)
            }
        )
    }

    function publishTestMsgs (_cb) {
        var testMsgs = [
            { type: 'post', text: 'post with a hashtag #test',
                channel: '#test' },
            { type: 'post', text: 'post with just text' },
            // post with an inline image only (no text)
            {
                type: 'post',
                // eslint-disable-next-line
                text: '![a blob](&SNZQDvykMENRmJMVyLfG20vlvgelGwj03C3YjWEi0JQ=.sha256)'
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
        ]

        parallel(testMsgs.map((msg => {
            return function postMsg (cb) {
                sbot.db.publishAs(user, msg, (err, res) => {
                    if (err) return cb(err)
                    cb(null, res)
                })
            }
        })).concat([cb => {
            sbot.db.publishAs(userTwo, { type: 'post', text: 'aaa' }, cb)
        }]), function allDone (err, [msg]) {
            if (err) return _cb(err)
            // this should be the first msg published (user 1)

            // now publish some threaded msgs
            sbot.db.publishAs(userTwo, {
                type: 'post',
                text: 'four',
                root: msg.key
            }, (err, res) => {
                if (err) return _cb(err)
                _cb(null, res)
            })
        })
    }
}
