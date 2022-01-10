var S = require('pull-stream')

function getBlob (sbot, peers, blobId, cb) {
    S(
        S.values(peers),
        // this way you stop as soon as one blob is successful
        S.asyncMap((peer, cb) => {
            try {
                S(
                    peer.blobs.get(blobId),
                    sbot.blobs.add(blobId, (err, _blobId) => {
                        if (err) return cb(err)
                        // we successfully added a blob. We're done now
                        abortable.abort()
                        cb(null, _blobId)
                    })
                )
            } catch(err) {
                // there was an error streaming
                console.log('errr', err)
                cb(null)  // just move on
            }
        }),
        S.filter(Boolean),
        S.take(1),
        S.drain(blobId => {
            cb(null, blobId)
        })
    )
}

module.exports = getBlob
