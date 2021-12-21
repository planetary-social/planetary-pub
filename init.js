const parallel = require('run-parallel')
var S = require('pull-stream')
var { read } = require('pull-files')

module.exports = function init (sbot, user, userTwo, _cb) {
    // first delete existing mock data
    parallel([user, userTwo].map(keys => {
        return function (cb) {
            sbot.db.deleteFeed(keys.id, (err) => {
                if (err) return cb(err)
                cb(null, keys.id)
            })
        }
    }), function allDone (err) {
        // done deleteing mock data
        if (err) return _cb(err)

        // then create profile data and test messages
        parallel([
            // save blobs
            cb => {
                S(
                    read(__dirname + '/test-data/caracal.jpg'),
                    S.map(file => file.data),
                    sbot.blobs.add(function (err, _) {
                        if (err) return cb(err)

                        S(
                            read(__dirname + '/test-data/cinnamon-roll.jpg'),
                            S.map(file => file.data),
                            sbot.blobs.add((err, blobId) => {
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
            _cb(err)
        })
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
            { type: 'post', text: 'one #test' },
            { type: 'post', text: 'two' },
            // post with an inline image only (no text or mentions)
            {
                type: 'post',
                text: '![a blob](&SNZQDvykMENRmJMVyLfG20vlvgelGwj03C3YjWEi0JQ=.sha256)'
            },

            // image only post (just message, nothing inline)
            {
                type: 'post',
                text: '',
                mentions: [{
                    link: '&SNZQDvykMENRmJMVyLfG20vlvgelGwj03C3YjWEi0JQ=.sha256',
                    name: 'caracal.jpg', // optional, but recommended
                    type: 'image/jpeg' // optional, but recommended
                }]
            },

            // post with text & inline image
            {
                type: 'post',
                text: 'some example text ' +
                    '![a blob](&SNZQDvykMENRmJMVyLfG20vlvgelGwj03C3YjWEi0JQ=.sha256)' +
                    ' some more example text'
            },

            // post with image and text, separate
            {
                type: 'post',
                text: 'example text, with a separate (not inline) image',
                mentions: [{
                    link: '&SNZQDvykMENRmJMVyLfG20vlvgelGwj03C3YjWEi0JQ=.sha256',
                    name: 'caracal.jpg', // optional, but recommended
                    type: 'image/jpeg' // optional, but recommended
                }]
            },
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
            var { key } = msg

            // now publish some threaded msgs
            sbot.db.publishAs(userTwo, {
                type: 'post',
                text: 'four',
                root: key
            }, (err, res) => {
                if (err) return _cb(err)
                _cb(null, res)
            })
        })
    }
}
