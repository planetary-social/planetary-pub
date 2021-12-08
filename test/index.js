var test = require('tape')
var createSbot = require('../')

var alice = require('../test-data/user.json')

var _sbot, _viewer
test('setup', t => {
    createSbot((err, { viewer, sbot }) => {
        if (err) t.fail(err)
        _sbot = sbot
        _viewer = viewer
        t.end()
    })
    // _sbot = sbot
    // _viewer = viewer
})

test('usernames', t => {
    _sbot.db.onDrain('aboutSelf', () => {
        const profile = _sbot.db.getIndex('aboutSelf').getProfile(alice.id)
        t.equal(profile.name, 'alice', 'should have the name "alice"')
        t.end()
    })
})

test('all done', t => {
    _viewer.close(err => {
        if (err) t.fail(err)
        _sbot.close(err => {
            if (err) t.fail(err)
            t.end()
        })
    })
})
