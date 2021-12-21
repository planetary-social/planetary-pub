const parallel = require('run-parallel')
var S = require('pull-stream')
var { read } = require('pull-files')

module.exports = function init (sbot, user, userTwo, _cb) {
    // first delete existing mock data
    parallel([user, userTwo].map(keys => {
        return function (cb) {
            sbot.db.deleteFeed(keys.id, (err, _) => {
                if (err) return cb(err)
                // there is no res
                // cb(null, res)
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
        // need some messages with just a blob (picture only)
        // get the hash of a blob and save the blob first
        var testMsgs = [
            { type: 'post', text: 'one #test' },
            { type: 'post', text: 'two' },
            { type: 'post', text: 'three #test' }, {
                type: 'post',
                mentions: [{
                    link: '&SNZQDvykMENRmJMVyLfG20vlvgelGwj03C3YjWEi0JQ=.sha256',
                    name: 'caracal.jpg', // optional, but recommended
                    type: 'image/jpeg' // optional, but recommended
                }],
                text: '![a blob](&SNZQDvykMENRmJMVyLfG20vlvgelGwj03C3YjWEi0JQ=.sha256)'
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
