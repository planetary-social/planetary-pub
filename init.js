const parallel = require('run-parallel')
var S = require('pull-stream')
var { read } = require('pull-files')

module.exports = function init (sbot, user, userTwo, _cb) {
    // create profile data and test messages
    parallel([
        // save blobs
        cb => {
            S(
                read(__dirname + '/test-data/caracal.jpg'),
                S.map(file => file.data),
                sbot.blobs.add(function (err) {
                    if (err) return cb(err)

                    S(
                        read(__dirname + '/test-data/cinnamon-roll.jpg'),
                        S.map(file => file.data),
                        sbot.blobs.add((err, blobId) => {
                            console.log('**saved blobs**')
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
            { type: 'post', text: 'post with a hashtag #test' },
            { type: 'post', text: 'post with just text' },
            // post with an inline image only (no text or mentions)
            {
                type: 'post',
                text: '![a blob](&SNZQDvykMENRmJMVyLfG20vlvgelGwj03C3YjWEi0JQ=.sha256)'
            },

            // post with text, no image
            {
                type: 'post',
                text: 'A post with only **markdown** text, no images.'
            },

            {
                type: 'post',
                text: 'A post with multiple attached images',
                mentions: [{
                    link: '&SNZQDvykMENRmJMVyLfG20vlvgelGwj03C3YjWEi0JQ=.sha256',
                    name: 'caracal.jpg', // optional, but recommended
                    type: 'image/jpeg' // optional, but recommended
                }, {
                    link: '&Ho1XhW2dp4bNJLZrYkurZPxlUhqrknD/Uu/nDp+KnMg=.sha256',
                    name: 'cinnomon-roll.jpg',
                    type: 'image/jpeg'
                }]
            },

            // everything -- text, inine image, attached image
            {
                type: 'post',
                text: `# an everything post
                    *markdown* text, inline image, and attached image
                    ![caracal](&SNZQDvykMENRmJMVyLfG20vlvgelGwj03C3YjWEi0JQ=.sha256)
                `,
                mentions: [{
                    link: '&SNZQDvykMENRmJMVyLfG20vlvgelGwj03C3YjWEi0JQ=.sha256',
                    name: 'caracal.jpg', // optional, but recommended
                    type: 'image/jpeg' // optional, but recommended
                }]
            },

            // image only post (just attached image, nothing inline)
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
                text: 'some example text with an inline image' +
                    '![a blob](&SNZQDvykMENRmJMVyLfG20vlvgelGwj03C3YjWEi0JQ=.sha256)' +
                    ' some more example text'
            },

            // post with text and attached image
            {
                type: 'post',
                text: 'example text, with an attached (not inline) image',
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
