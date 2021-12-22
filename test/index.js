const { where,  and, type, contact, toCallback } = require('ssb-db2/operators')
var test = require('tape')
var createSbot = require('../')
var alice = require('../test-data/user.json')
var bob = require('../test-data/user-two.json')
// var S = require('pull-stream')

var _sbot, _viewer
test('setup', t => {
    createSbot((err, { viewer, sbot }) => {
        if (err) t.fail(err)
        _sbot = sbot
        _viewer = viewer
        t.end()
    })
})

// we use the env var `test` to know to load the test data

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
        t.equal(profile.name, 'bob', 'should have the name "bob"')
    })
})

test('user profile by name', t => {
    t.plan(5)

    _sbot.suggest.profile({ text: 'alice' }, (err, matches) => {
        t.error(err)
        t.equal(matches[0].name, 'alice', 'should return the alice profile')
        t.equal(matches[0].id, alice.id, 'should return the right id')
    })

    _sbot.suggest.profile({ text: 'bob' }, (err, matches) => {
        t.error(err)
        t.equal(matches[0].name, 'bob', 'should return the bob profile')
    })
})

test('get following count', t => {
    var content = {
        "type": "contact",
        "contact": bob.id,
        "following": true
    }

    _sbot.db.publishAs(alice, content, (err) => {
        t.error(err)

        // who are you following?
        _sbot.friends.hops({
            start: alice.id,
            max: 1
        }, (err, following) => {
            t.error(err)
            folArr = Object.keys(following).filter(id => {
                return following[id] === 1
            })
            t.equal(folArr.length, 1, 'should be following 1 person')
            t.ok(following[bob.id], 'should be following bob')
            t.end()
        })
    })
})

test('get follower count', t => {
    var content = {
        "type": "contact",
        "contact": alice.id,
        "following": true
    }

    _sbot.db.publishAs(bob, content, (err) => {
        t.error(err)

        _sbot.db.query(
            where(
                contact(alice.id)
            ),
            toCallback((err, msgs) => {
                t.error(err)

                var followers = msgs.reduce(function (acc, msg) {
                    var auth = msg.value.author
                    // duplicate, do nothing
                    if (acc.indexOf(auth) > -1) return acc  
                    // if they are following us,
                    // add them to the list
                    if (msg.value.content.following) {  
                        acc.push(auth)
                    }
                    return acc
                }, [])

                t.equal(followers.length, 2, 'should have 2 followers')
                t.ok(followers.includes(bob.id), 'should be followed by bob')
                t.end()
            })
        )
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
