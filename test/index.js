var test = require('tape')
var createSbot = require('../')
var alice = require('../test-data/user.json')
var bob = require('../test-data/user-two.json')

var _sbot, _viewer
test('setup', t => {
    createSbot((err, { viewer, sbot }) => {
        if (err) t.fail(err)
        _sbot = sbot
        _viewer = viewer
        t.end()
    })
})

test('user profile', t => {
    t.plan(3)

    _sbot.db.onDrain('aboutSelf', () => {
        const profile = _sbot.db.getIndex('aboutSelf').getProfile(alice.id)
        t.equal(profile.name, 'alice', 'should have the name "alice"')
        t.equal(profile.image, '&Ho1XhW2dp4bNJLZrYkurZPxlUhqrknD/Uu/nDp+KnMg=.sha256',
            'should have the right avatar for the user')
    })

    _sbot.db.onDrain('aboutSelf', () => {
        const profile = _sbot.db.getIndex('aboutSelf').getProfile(bob.id)
        t.equal(profile.name, 'bob', 'should have the name "alice"')
    })
})

test('user profile by name', t => {
    _sbot.suggest.profile({ text: 'alice' }, (err, matches) => {
        if (err) {
            t.fail(err)
            return t.end()
        }
        t.equal(matches[0].name, 'alice', 'should return the right profile')
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
