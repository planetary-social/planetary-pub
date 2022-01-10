const Viewer = require('./viewer')
var Pub = require('./pub')

Pub(function (err, sbot) {
    if (err) throw err
    var viewer = Viewer(sbot)

    viewer.listen(8888, '0.0.0.0', (err, address) => {
        next(err)
        console.log(`Server is now listening on ${address}`)
    })
})
