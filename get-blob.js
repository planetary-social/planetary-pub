var S = require('pull-stream')
var Abortable = require('pull-abortable')

function getBlob (sbot, peers, blobId, cb) {
    var abortable = Abortable()

    S(
        S.values(peers),
        // this way you stop as soon as one blob is successful
        S.asyncMap((peer, cb) => {
            console.log('**peeeeeeeer***', peer)

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
        }, function onEnd (err) {
            if (err) console.log('**oh no**', err)
        })
    )
}

module.exports = getBlob
