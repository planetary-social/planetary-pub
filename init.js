const parallel = require('run-parallel')
var S = require('pull-stream')
var { read } = require('pull-files')

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
            // post with an inline image only (no text)
            {
                type: 'post',
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
                    '![a blob](&SNZQDvykMENRmJMVyLfG20vlvgelGwj03C3YjWEi0JQ=.sha256)' +
                    ' some more example text'
            },

            // post mentioning a user
            {
                type: 'post',
                text: 'mentioning a user, not a blob',
                mentions: [{
                    link: '@lV5MISER9oGaZJ7OLhlsUNVWHu982USYgMEWfIs6le0=.ed25519',
                    name: 'alice'
                }]
            },

            // superpost based on %Fug4KlZ6wVgndMpsd08CtVmDpqUEp3Pq+EImZ6WNKBo=.sha256
            {
                type: 'post',
                text: `
                > Here's what those docs look like already:

                The anatomy of ssb "threads"
                ============================
                
                Core anatomy
                ------------
                
                Let's look at the first two messages in a thread. Here's what they look like in full.  
                We only really need to pay attention to the \`key\` and \`content\` of each message
                
                      const A = {
                    +   key: "%+fBXl12aV1wpAdD62RMl1WRhwthDMuAuHH4iNWgB7jA=.sha256",
                        value: {
                          previous: "%ETtt5S3+n6fucbHU/1c7xPmyL0Yk6zFM4jGCfCvJzpo=.sha256",
                          author: "@ye+QM09iPcDJD6YvQYjoQc7sLF/IFhmNbEqgdzQo3lQ=.ed25519",
                          sequence: 9724,
                          timestamp: 1508232214336,
                          hash: "sha256",
                    +     content: {
                    +       type: "post",
                    +       text: "# The anatomy of ssb threads",
                    +     },
                          signature: "uzmo6eaq/1nmpWLAAw0I02oWapAYgr5MWk2ZOf12Ysmy39eCxYfT1WrmGpih6QPubB9zuoiqjJoDDZSiaZg3CQ==.sig.ed25519"
                        }
                      }
                    
                
                      const B = {
                    +   key: "%PBvSj7XYtrJRUNcM837ZUMGuEVaC8a+0EF6J/BKzfdE=.sha256",
                        value: {
                          previous: "%+fBXl12aV1wpAdD62RMl1WRhwthDMuAuHH4iNWgB7jA=.sha256",
                          author: "@ye+QM09iPcDJD6YvQYjoQc7sLF/IFhmNbEqgdzQo3lQ=.ed25519",
                          sequence: 9725,
                          timestamp: 1508232808994,
                          hash: "sha256",
                    +     content: {
                    +       type: "post",
                    +       root: "%+fBXl12aV1wpAdD62RMl1WRhwthDMuAuHH4iNWgB7jA=.sha256",
                    +       branch: "%+fBXl12aV1wpAdD62RMl1WRhwthDMuAuHH4iNWgB7jA=.sha256",
                    +       text: "Ok so ...",
                    +     },
                          signature: "5w5B5PzlKErEB6okv6//cUKbcEzWdGg9TsUb1VfQZW5f/7p8K32L1njBDxBBQV3g4hU3D2cdylJtuooWJNCWCQ==.sig.ed25519"
                        }
                      }
                    
                
                For the rest of this documentation we're going to represent these like:
                
                    // minimal root
                    A.value.content {
                      type: "post",
                      text: "# The anatomy of ssb threads"
                    },
                    
                
                    // minimal reply
                    B.value.content = {
                      type: "post",
                      text: "Ok so ...",
                    
                      /* tangle info */
                      root: "%+fBXl12aV1wpAdD62RMl1WRhwthDMuAuHH4iNWgB7jA=.sha256", // A.key
                      branch: [
                        "%+fBXl12aV1wpAdD62RMl1WRhwthDMuAuHH4iNWgB7jA=.sha256" // A.key
                      ]
                    }
                    
                
                Tangles
                -------
                
                The concept of a _tangle_ has two parts:
                
                1.  **tangleId**
                    *   A unique identifier for a tangle, so you can identify messages that are part of it
                    *   here this id is the id of the root/ initial message in the thread
                    *   this is the \`content.root\` (for \`post\` messages)
                2.  **tangle position**
                    *   We express this by listing the ids of which messages have come _before_ this message in the tangle
                    *   Instead of listing _every_ previous messageId, if we build a _graph_ of the messages, we can just record the _tips_ of the graph that we're extending from
                    *   this is the \`content.branch\` (for \`post\` messages)
                    *   NOTE: because messages can be published concurrently there may be > 1 branch tips we're extending from
                
                ![image.png](/&Ng/8tFRwjelX5mZLrrWUSfC9ItpIayBbOnZCfqKwdzE=.sha256)
                
                Here the "root" message is \`A\`, and we know that \`B\` follows it because
                
                    B.value.content.branch = [A.key]
                    
                
                That is _"B points back to the message(s) before it in the tangle, which is A"_
                
                Similarly:
                
                    C.value.content.branch = [B.key]
                    D.value.content.branch = [B.key]
                    E.value.content.branch = [C.key, D.key]
                    
                
                Generally people flatten this into a linear timeline for easier display.  
                To do that, you need to take this graph and decide how to break ties for the sections of the graph  
                which are branched:
                
                ![image.png](/&+44jiyRclxjyor/HteFRCezlFPA4Jobv8EwP3ANtaK0=.sha256)
                
                Optional fields
                ---------------
                
                *   \`content.recps\` _Array_
                    *   used for encryption - your message will be automatically encrypted to those you list here
                    *   all replies **should** copy the \`recps\` of the root message
                    *   entries can be
                        *   FeedId - encypts to a device
                        *   GroupId - encrypts to a group you're a part of
                        *   POBoxiId - encrypts to a group you're not a part of
                *   \`content.mentions\` _Array_
                    *   used for clearly announcing cipherlinks, which is useful for searching for backlinks
                        
                            [
                              {
                                "link": "@6ilZq3kN0F+dXFHAPjAwMm87JEb/VdB+LC9eIMW3sa0=.ed25519",
                                "name": "mikey"
                              },
                              {
                                "link": "&JLRmiXbqcZu6ldRYItd4afVDprT3LHCdBmyDyG5koos=.sha256",
                                "name": "20171017_215119.jpg",
                                "type": "image/jpeg",
                                "size": 41629
                              }
                            ]
                            
                        
                    *   in Patchwork v1 (by @pfraze), feedIds were never included in the text, so mentions were essential to know what to link \`@mikey\` in \`context.text\`
                *   \`content.channel\` _String_
                    
                    *   the OG hashtag thing
                    *   ideally does not include
                *   \`content.replies\`
                    
                    *   Patchwork specific one, requires more detail
                    *   this existed to solve the problem you get when you have a \`branch\` listing messages you don't have.. . because MessageId's alone do not tell you where to get the message. I think the format was like
                        
                              {
                                "%+fBXl12aV1w.....": "@ye+QM09iPcDJD6YvQY",
                                // MsgId: FeedId
                              }
                            
                        
                        *   this had the nice property that you could see when a message you write got replied to (this was only displayed in Patchbay AFIK)
                
                Gotchas
                -------
                
                *   missing messages
                    *   if you are missing a message in the middle of your tangle graph, then we generally still want to try to rended what you have (any maybe alert )
                *   \`content.recps\`
                    *   sometimes this is \`null\`
                *   \`content.branch\`
                    *   sometimes it's a _String_, sometimes it's an _Array_ (yay no spec!)
                    *   some devs confuse this with \`content.root\` or \`content.fork\` (similar name!)
                *   \`content.mentions\`
                    *   sometimes a "mention" is an _Object_ \`{ link, name, ... }\`
                    *   sometimes a "mention" is a _String_ \`link\`
                *   \`content.channel\`
                    *   may or may not include a #, be sure to trim!
                
                Nested Replies
                --------------
                
                ![image.png](/&ppIBS1peyQV0HW5i7D/J/uVxKoRVQapX2l7nHlGQVcQ=.sha256)
                
                _Someone should write the fork/ nested spec.... I have no idea how it actually got implemented_
                
                TODO:
                
                *   write \`root\` and \`branch\` of X, Y
                *   write \`fork\` for X, Y
                *   is there a _forked feed_ feature, or did the concept of _nested feed_ and _forked feed_ get merged
                *   explain if it's possible to have multiple nests/ forks of a single node
                
                Tools
                -----
                
                *   algorithms
                *   modules`
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
