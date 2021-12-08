const parallel = require('run-parallel')

module.exports = function init (sbot, user, userTwo, _cb) {
    parallel([user, userTwo].map(keys => {
        return function (cb) {
            sbot.db.deleteFeed(keys.id, (err, _) => {
                if (err) return cb(err)
                // there is no res
                // cb(null, res)
                cb(null, keys.id)
            })
        }
    }), function allDone (err, res) {
        if (err) return _cb(err)
        parallel([
            saveProfiles,
            cb => {
                publishTestMsgs(user, cb)
            }
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
                    }, (err, res) => {
                        cb(err, res)
                    })
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



    function publishTestMsgs (user, _cb) {
        var testMsgs = [
            { type: 'post', text: 'one #test' },
            { type: 'post', text: 'two' },
            { type: 'post', text: 'three #test' }
        ]

        parallel(testMsgs.map(msg => {
            return function postMsg (cb) {
                sbot.db.publishAs(user, msg, (err, res) => {
                    if (err) return cb(err)
                    cb(null, res)
                })
            }
        }), function allDone (err, res) {
            if (err) return _cb(err)
            var [one] = res
            var { key } = one

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

