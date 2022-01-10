const Viewer = require('./viewer')
var Pub = require('./pub')

Pub(function (err, sbot) {
    if (err) throw err
    Viewer(sbot)
})
