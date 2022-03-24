const { where,  and, type, contact,
    author, toCallback,  } = require('ssb-db2/operators')
var path = require('path')
var createError = require('http-errors')
const Fastify = require('fastify')
const fastifyResponseCaching = require('fastify-response-caching')

var S = require('pull-stream')
var toStream = require('pull-stream-to-stream')
var getThreads = require('./threads')
// var getBlob = require('./get-blob')

module.exports = function startServer (sbot) {
    var fastify = Fastify({
        logger: true
    })

    sbot.on('rpc:connect', (ev) => {
        console.log('***rpc:connect in viewer***', ev.stream.address)
    })


    // enable cors
    fastify.register(require('fastify-cors'), {})

    fastify.register(require('fastify-static'), {
        root: path.join(__dirname, '..', 'public'),
        dotfiles: 'allow',
        prefix: '/public/' // optional: default '/'
    })

    fastify.register(fastifyResponseCaching, {ttl: 500000})

            

    fastify.get('/.well-known/apple-app-site-association', (_, res) => {
        return res.sendFile('/.well-known/apple-app-site-association')
    })

    fastify.get('/', (_, res) => {
        res.send(`
            address -- ${sbot.getAddress()}
            public keys -- ${sbot.config.keys.id}
            NODE_ENV -- ${process.env.NODE_ENV}
        `)
    })

    fastify.get('/msg/%:id', (req, res) => {
        var { id } = req.params
        id = '%' + id
        id = decodeURIComponent(id)
        console.log('request_message_id', id)

        //fastify.cache.set('msg', {id: id}, 3600000, (err) => {
            // get the message in question
            // so we can look for the `root` property and
            // see if there is a thread for this
            sbot.db.get(id, (err, msg) => {
                if (err) {
                    console.log('errrrr', err)

                    if (err.toString().includes('not found')) {
                        return res.send(createError.NotFound(err))
                    }

                    return res.send(createError.InternalServerError(err))
                }

                var rootId = (msg.content && msg.content.root) || id

                getThread(sbot, rootId, (err, msgs) => {
                    if (err) return res.send(createError.InternalServerError(err))
                    res.send(msgs)
                })
            })
        //})
    })

    fastify.get('/blob/:blobId', (req, res) => {
        var { blobId } = req.params

        //fastify.cache.set('blob', {id: blobId}, 3600000, (err) => {
            // TODO
            // * check if we have this blob, and if not, request it
            //   from the pub we're connected with
            // var source = sbot.blobs.get(blobId)
            // res.send(toStream.source(source))

            getBlob(sbot, blobId, (err, blobStream) => {
                if (err) return res.send(createError.InternalServerError(err))
                res.send(toStream.source(blobStream))
            })
        //})
    })

    fastify.get('/feed-by-id/:id', (req, res) => {
        var { id } = req.params
        const { query } = req
        const page = query ? query.page : 0

            //fastify.cache.set('feed-by-id', {id: id, page: page}, 3600000, (err) => {
            // var source = sbot.threads.profile({
            //     id: id,
            //     // allowlist: ['post'],
            //     threadMaxSize: 3 // at most 3 messages in each thread
            // })

            var source = page ?
                getThreads({ sbot, id }, page) :
                getThreads({ sbot, id })

            S(
                source,
                S.take(10),
                S.map(thread => {
                    // if it's a thread, return the thread
                    // if not a thread, return a single message (not array)
                    return thread.messages.length > 1 ?
                        thread.messages :
                        thread.messages[0]
                }),
                S.collect(function (err, threads) {
                    if (err) return console.log('err', err)
                    res.send(threads)
                })
            )
        //})
    })

    fastify.get('/counts-by-id/:id', (req, res) => {
        var { id } = req.params
        //fastify.cache.set('counts-by-id', {id: id}, 3600000, (err) => {

            Promise.all([
                new Promise((resolve, reject) => {
                    // get thier posts so we can count them
                    sbot.db.query(
                        where(
                            and(
                                type('post'),
                                author(id)
                            )
                        ),
                        toCallback((err, res) => {
                            if (err) return reject(err)
                            resolve(res.length)
                        })
                    )
                }),

                // get the following count
                new Promise((resolve, reject) => {
                    sbot.friends.hops({
                        start: id,
                        max: 1
                    }, (err, following) => {
                        if (err) return reject(err)
                        const folArr = Object.keys(following).filter(id => {
                            return following[id] === 1
                        })
                        resolve(folArr.length)
                    })
                }),

                // get the follower count
                new Promise((resolve, reject) => {
                    sbot.db.query(
                        where(
                            contact(id)
                        ),
                        toCallback((err, msgs) => {
                            if (err) return reject(err)
            
                            var followers = msgs.reduce(function (acc, msg) {
                                var author = msg.value.author
                                // duplicate, do nothing
                                if (acc.indexOf(author) > -1) return acc  
                                // if they are following us,
                                // add them to the list
                                if (msg.value.content.following) {  
                                    acc.push(author)
                                }
                                return acc
                            }, [])
            
                            resolve(followers.length)
                        })
                    )
                })
            ])
                .then(([posts, following, followers]) => {
                    res.send({ id, posts, following, followers })
                })
                .catch(err => {
                    res.send(createError.InternalServerError(err))
                })
       // })
    })

    fastify.get('/feed/:userName', (req, res) => {
        var { userName } = req.params

        sbot.suggest.profile({ text: userName }, (err, matches) => {
            if (err) {
                console.log('OH no!', err)
                return res.send(createError.InternalServerError(err))
            }

            // @TODO
            // return a list of id's if there is more than one
            // match
            const id = matches[0] && matches[0].id

            if (!id) {
                return res.code(404).send('not found')
            }

            var source = sbot.threads.profile({ id: id })

            S(
                source,
                S.take(10),
                S.map(thread => {
                    // if it's a thread, return the thread
                    // if not a thread, return a single message (not array)
                    return thread.messages.length > 1 ?
                        thread.messages :
                        thread.messages[0]
                }),
                S.collect(function (err, threads) {
                    if (err) return console.log('err', err)
                    res.send(threads)
                })
            )
        })
    })

    fastify.get('/tag/:tagName', (req, res) => {
        var { tagName } = req.params
        S(
            // now get the messages that match that tag
            sbot.threads.hashtagSummary({
                hashtag: '#' + tagName
            }),
            S.collect((err, msgs) => {
                if (err) return res.send(createError.InternalServerError(err))
                // console.log('tags', msgs)
                res.send(msgs)
            })
        )
    })


    fastify.get('/default', (req, res) => {
        console.log("default path")
        //fastify.cache.set('default', {id: 'default'}, 3600000, (err) => {

            const { query } = req
            const source = query.page ? 
                getThreads({ sbot }, query.page) :
                getThreads({ sbot })

            S(
                source,
                S.take(10),
                S.collect(function (err, threads) {
                    if (err) return console.log('err', err)

                    res.send(threads)
                })
            )
        //})
    })

    fastify.post('/get-profiles', (req, res) => {
        var ids
        try {
            ids = JSON.parse(req.body).ids
        } catch (err) {
            return res.send(createError.BadRequest('Invalid json'))
        }
        const idslist = ids.map(String)

        // this is a bit hacky, we should instead be recording each aboutSelf in redis
        // and then pulling them either from redis or from sbot - rabble
        //fastify.cache.set('get-profiles', {ids: idslist}, 3600000, (err) => {
            // console.log('***req.body***', req.body)
            // console.log('ids', ids)

            // how is there no async code here?
            var profiles = ids.map(id => {
                var profile = sbot.db.getIndex('aboutSelf').getProfile(id)
                return Object.assign(profile, {
                    id: id
                })
            })
            res.send(profiles)
        //})
    })

    fastify.get('/profile-by-id/:id', (req, res) => {
        const { id } = req.params
        //console.log("profile-by-id", id)
        //fastify.cache.set('profile-by-id', {id: id}, 3600000, (err) => {

            sbot.db.onDrain('aboutSelf', () => {
                const profile = sbot.db.getIndex('aboutSelf').getProfile(id)

                // get the blob if they have a profile image
                if (profile && profile.image) {
                    return sbot.blobs.has(profile.image, (err, has) => {
                        if (err) {
                            console.log('errrrr', err)
                            return res.send(createError.InternalServerError(err))
                        }

                        // console.log('**has image**', has)

                        if (has) return res.send(profile)

                        // we don't have the blob yet,
                        // so request it from a peer, then return a response

                        // this is something added only in the planetary pub
                        // this is something IPFS would help with b/c
                        // I think they handle routing requests
                        // var currentPeers = sbot.peers
                        var currentPeers = sbot.conn.dbPeers()	
                        console.log('**peers**', currentPeers)

                        // var addr = 'net:one.planetary.pub:8008~shs:@CIlwTOK+m6v1hT2zUVOCJvvZq7KE/65ErN6yA2yrURY='
                        // var addr = 'net:ssb.celehner.com:8008~shs:5XaVcAJ5DklwuuIkjGz4lwm2rOnMHHovhNg7BFFnyJ8='

                        // trying cel's pub
                        var addr = 'net:ssb.celehner.com:8008~shs:5XaVcAJ5DklwuuIkjGz4lwm2rOnMHHovhNg7BFFnyJ8='
                        sbot.conn.connect(addr, (err, ssb) => {
                            if (err) {
                                console.log('oh no', err)
                                return console.log('*errrrr connect*', err)
                            }

                            S(
                                ssb.blobs.get(profile.image),
                                // S.through(data => console.log('**data**', data)),
                                sbot.blobs.add(profile.image, (err, blobId) => {
                                    if (err) {
                                        // eslint-disable-next-line
                                        res.send(createError.InternalServerError(err))
                                        return console.log('**blob errrr**', err)
                                    }

                                    console.log('***got blob***', blobId)
                                    // TODO -- could return this before the 
                                    // blob has finished transferring
                                    res.send(profile)
                                })
                            )
                        })
                    })
                }

                res.send(profile)
            })
        //})
    })

    fastify.get('/profile/:username', (req, res) => {
        var { username } = req.params

        sbot.suggest.profile({ text: username }, (err, matches) => {
            if (err) {
                return res.send(createError.InternalServerError(err))
            }

            // TODO -- fix duplicate username usecase
            const id = matches[0] && matches[0].id
            if (!id) return res.send(createError.NotFound())

            sbot.db.onDrain('aboutSelf', () => {
                const profile = sbot.db.getIndex('aboutSelf').getProfile(id)

                // get the blob for avatar image
                sbot.blobs.has(profile.image, (err, has) => {
                    if (err) {
                        console.log('errrrr', err)
                        return res.send(createError.InternalServerError(err))
                    }

                    // console.log('**has image**', has)

                    if (has) return res.send(profile)

                    // we don't have the blob yet,
                    // so request it from a peer, then return a response

                    // this is something added only in the planetary pub
                    // this is something IPFS would help with b/c
                    // I think they handle routing requests
                    // var currentPeers = sbot.peers
                    var currentPeers = sbot.conn.dbPeers()	
                    console.log('**peers**', currentPeers)

                    // var addr = 'net:one.planetary.pub:8008~shs:@CIlwTOK+m6v1hT2zUVOCJvvZq7KE/65ErN6yA2yrURY='
                    // var addr = 'net:ssb.celehner.com:8008~shs:5XaVcAJ5DklwuuIkjGz4lwm2rOnMHHovhNg7BFFnyJ8='

                    // trying cel's pub
                    var addr = 'net:ssb.celehner.com:8008~shs:5XaVcAJ5DklwuuIkjGz4lwm2rOnMHHovhNg7BFFnyJ8='
                    sbot.conn.connect(addr, (err, ssb) => {
                        if (err) {
                            console.log('oh no', err)
                            return console.log('*errrrr connect*', err)
                        }

                        console.log('**aaaaaaaaaaa**', ssb.blobs)

                        S(
                            ssb.blobs.get(profile.image),
                            // S.through(data => console.log('**data**', data)),
                            sbot.blobs.add(profile.image, (err, blobId) => {
                                if (err) {
                                    // eslint-disable-next-line
                                    res.send(createError.InternalServerError(err))
                                    return console.log('**blob errrr**', err)
                                }

                                console.log('***got blob***', blobId)
                                // TODO -- could return this before the 
                                // blob has finished transferring
                                res.send(profile)
                            })
                        )
                    })

                    // getBlob(sbot, [currentPeers[1]], profile.image, (err) => {
                    //     if (err) {
                    //         return res.send(
                    //             createError.InternalServerError(err))
                    //     }
                    //     res.send(profile)
                    // })
                })
            })
        })
    })

    fastify.get('/counts/:username', (req, res) => {
        var { username } = req.params

        //fastify.cache.set('counts', {username: username}, 3600000, (err) => {

            sbot.suggest.profile({ text: username }, (err, matches) => {
                if (err) {
                    return res.send(createError.InternalServerError(err))
                }

                // TODO -- fix this part
                // should return a list of user IDs or something if
                // there is more than 1 match
                const id = matches[0] && matches[0].id
                if (!id) return res.send(createError.NotFound())

                Promise.all([
                    new Promise((resolve, reject) => {
                        // then query for thier posts so we can count them
                        sbot.db.query(
                            where(
                                and(
                                    type('post'),
                                    author(id)
                                )
                            ),
                            toCallback((err, res) => {
                                if (err) return reject(err)
                                resolve(res.length)
                            })
                        )
                    }),

                    // get the following count
                    new Promise((resolve, reject) => {
                        sbot.friends.hops({
                            start: id,
                            max: 1
                        }, (err, following) => {
                            if (err) return reject(err)
                            const folArr = Object.keys(following).filter(id => {
                                return following[id] === 1
                            })
                            resolve(folArr.length)
                        })
                    }),

                    // get the follower count
                    new Promise((resolve, reject) => {
                        sbot.db.query(
                            where(
                                contact(id)
                            ),
                            toCallback((err, msgs) => {
                                if (err) return reject(err)
                
                                var followers = msgs.reduce(function (acc, msg) {
                                    var author = msg.value.author
                                    // duplicate, do nothing
                                    if (acc.indexOf(author) > -1) return acc  
                                    // if they are following us,
                                    // add them to the list
                                    if (msg.value.content.following) {  
                                        acc.push(author)
                                    }
                                    return acc
                                }, [])
                
                                resolve(followers.length)
                            })
                        )
                    })
                ])
                    .then(([posts, following, followers]) => {
                        res.send({ username, id, posts, following, followers })
                    })
                    .catch(err => {
                        res.send(createError.InternalServerError(err))
                    })
            })
        //})

    })

    fastify.get('/healthz', (_, res) => {
        res.code(200).send('ok')
    })

    return fastify
}


function getThread(sbot, rootId, cb) {
    S(
        sbot.threads.thread({
            root: rootId,
            // @TODO
            allowlist: ['test', 'post'],
            reverse: true, // threads sorted from most recent to least recent
            threadMaxSize: 20, // at most 3 messages in each thread
        }),
        S.collect((err, [thread]) => {
            if (err) return cb(err)
            cb(null, thread)
        })
    )
}



function getBlob (sbot, blobId, cb) {
    sbot.blobs.has(blobId, (err, has) => {
        if (err) {
            console.log('errrrr', err)
            return cb(err)
        }

        if (has) {
            console.log('***has***', blobId)
            return cb(null, sbot.blobs.get(blobId))
        }

        // we don't have the blob yet,
        // so request it from a peer, then return a response

        // this is something added only in the planetary pub
        // this is something IPFS would help with b/c
        // I think they handle routing requests
        // var currentPeers = sbot.peers
        // var currentPeers = sbot.conn.dbPeers()	
        // console.log('**peers**', currentPeers)

        // var addr = 'net:one.planetary.pub:8008~shs:@CIlwTOK+m6v1hT2zUVOCJvvZq7KE/65ErN6yA2yrURY='
        // var addr = 'net:ssb.celehner.com:8008~shs:5XaVcAJ5DklwuuIkjGz4lwm2rOnMHHovhNg7BFFnyJ8='

        // trying cel's pub
        var addr = 'net:ssb.celehner.com:8008~shs:5XaVcAJ5DklwuuIkjGz4lwm2rOnMHHovhNg7BFFnyJ8='
        sbot.conn.connect(addr, (err, ssb) => {
            if (err) {
                console.log('oh no', err)
                return console.log('*errrrr connect*', err)
            }

            // console.log('**aaaaaaaaaaa**', ssb.blobs)

            S(
                ssb.blobs.get(blobId),
                sbot.blobs.add(blobId, (err, _blobId) => {
                    if (err) {
                        // eslint-disable-next-line
                        console.log('**blob errrr**', err)
                        return cb(err)
                    }

                    console.log('***got blob***', _blobId)
                    cb(null, sbot.blobs.get(_blobId))
                })
            )
        })
    })
}
