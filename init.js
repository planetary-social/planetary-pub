const parallel = require('run-parallel')

const user = require('./user.json')
const userTwo = require('./user-two.json')

module.exports = function init (sbot, _cb) {
    parallel([user, userTwo].map(keys => {
        return function (cb) {
            sbot.db.deleteFeed(keys.id, (err, res) => {
                if (err) return cb(err)
                // there is no res
                // cb(null, res)
                cb(null, keys.id)
            })
        }
    }), function allDone (err, res) {
        if (err) return _cb(err)
        publishTestMsgs(user)
    })


    function publishTestMsgs (user) {
        var testMsgs = [
            { type: 'post', text: 'one' },
            { type: 'post', text: 'two' },
            { type: 'post', text: 'three' }
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
