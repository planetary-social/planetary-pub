var S = require('pull-stream')
const Ref = require('ssb-ref')
const { where, author, type, descending,
    toPullStream, and, batch, hasRoot,
    isPrivate, isPublic, startFrom } = require('ssb-db2/operators')
const cat = require('pull-cat')
const sort = require('ssb-sort')

const BATCH_SIZE = 75

module.exports = publicSummary

/**
 * We are just re-implementing `ssb-threads` here.
 * 
 * `ssb-threads` was causing the server to crash b/c it was using too much
 * memory. So I began experimenting here by adding just the minimum that
 * we need to do this query. And now it works, but the bad part is I don't
 * know _why_ it works here but not in `ssb-threads`.
 */

function publicSummary ({ sbot, userId }, startingFrom) {

    function nonBlockedRootToThread (maxSize, filter, privately = false) {
        return (root, cb) => {
            S(
                cat([
                    S.values([root]),
                    S(
                        sbot.db.query(
                            where(
                                and(
                                    hasRoot(root.key),
                                    (privately ? isPrivate() : isPublic())
                                )
                            ),
                            batch(BATCH_SIZE),
                            descending(),
                            toPullStream()
                        ),
                        removeMessagesFromBlocked,
                        S.take(maxSize)
                    )
                ]),
                S.take(maxSize + 1),
                S.collect((err2, arr) => {
                    if (err2) return cb(err2)
                    const full = arr.length <= maxSize
                    sort(arr)
                    // if (arr.length > maxSize) {
                    //     // what is happening here?
                    //     arr.splice(1, 1)
                    // }
                    cb(null, { messages: arr, full })
                })
            )
        }
    }

    const IS_BLOCKING_NEVER = (_, cb) => {
        cb(null, false)
    }

    function removeMessagesFromBlocked (source) {
        const isBlocking = (sbot.friends)?.isBlocking ?
            sbot.friends.isBlocking :
            IS_BLOCKING_NEVER

        return S(
            source,
            S.asyncMap((msg, cb) => {
                isBlocking({
                    source: sbot.id,
                    dest: msg.value.author
                }, (err, blocking) => {
                    if (err) cb(err)
                    else if (blocking) cb(null, null)
                    else cb(null, msg)
                })
            }),
            S.filter()
        )
    }

    function hasNoBacklinks (msg) {
        return (
            !msg?.value?.content?.root &&
            !msg?.value?.content?.branch &&
            !msg?.value?.content?.fork
        )
    }

    function getRootMsgId (msg) {
        if (msg?.value?.content) {
            // const fork = msg.value.content.fork
            const root = msg.value.content.root

            // temporarily disabling forked messages
            // if (fork && Ref.isMsgId(fork)) return fork

            if (root && Ref.isMsgId(root)) return root
        }
        // this msg has no root so we assume this is a root
        return msg.key
    }

    function isUniqueMsgId (uniqueRoots) {
        return function checkIsUnique_id (id) {
            if (uniqueRoots.has(id)) {
                return false
            } else {
                uniqueRoots.add(id)
                return true
            }
        }
    }

    /**
     * Returns a pull-stream operator that:
     * 1. Checks if there is a Msg in the cache for the source MsgId
     * 2. If not in the cache, do a database lookup
     */
    const fetchMsgFromIdIfItExists = (source) => {
        return S(
            source,
            S.asyncMap((id, cb) => {
                sbot.db.getMsg(id, (err, msg) => {
                    if (err) cb(null /* missing msg */)
                    else cb(err, msg)
                })
            }),
            S.filter() // remove missing msg
        )
    }

    var query
    if (userId) {
        query = (startingFrom ?
            sbot.db.query(
                where(
                    and(
                        author(userId),
                        // isPublic(),
                        type('post')
                    )
                ),
                descending(),
                batch(10),
                startFrom(startingFrom * 10),
                toPullStream()
            ) :

            sbot.db.query(
                // where(type('post')),
                where(
                    and(
                        author(userId),
                        // isPublic(),
                        type('post')
                    )
                ),
                descending(),
                batch(10),
                toPullStream()
            ))

    } else {
        query = (startingFrom ?
            sbot.db.query(
                where(type('post')),
                descending(),
                batch(10),
                startFrom(startingFrom * 10),
                toPullStream()
            ) :

            sbot.db.query(
                where(type('post')),
                descending(),
                batch(10),
                toPullStream()
            ))
    }

    return S(
        query,
        // S.through((msg) =>
        //     timestamps.set(getRootMsgId(msg), getTimestamp(msg)),
        // ),
        S.map(getRootMsgId),
        S.filter(isUniqueMsgId(new Set())),
        fetchMsgFromIdIfItExists,
        S.filter(makePassesFilter({ allowlist: ['post'] })),
        S.filter(isPublicType),
        S.filter(hasNoBacklinks),
        S.filter(Boolean),
        removeMessagesFromBlocked,
        // nonBlockedRootToThread (maxSize, filter, privately = false) {
        S.asyncMap(nonBlockedRootToThread(20)),
    )
}

function isPublicType (msg) {
    if (msg.meta?.private) return false
    if (msg.value.private) return false
    if (Array.isArray(msg.value.content?.recps)) return false
    return typeof msg?.value?.content !== 'string'
}

// { allowList, blockList }
function makePassesFilter (opts) {
    opts = opts || {}

    if (opts.allowlist) {
        return function (msg) {
            return opts.allowlist.some((type) => {
                return (msg?.value?.content?.type === type)
            })
        }
    }

    if (opts.blocklist) {
        return function (msg) {
            opts.blocklist.every((type) => {
                return (msg?.value?.content?.type !== type)
            })
        }
    }

    return () => true
}

