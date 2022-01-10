# planetary pub

A pub

This creates an `sbot`, and imports and exposes the viewer app.

See the [render.com dashboard](https://dashboard.render.com/web/srv-c6elp2vh8vlcnlnvsm5g/settings)

https://pub2.onrender.com/

See [how the caps value is generated](https://www.npmjs.com/package/ssb-caps#shs-secret-handshake-connection-key)

-------------------------------------------------------

## install

Install as a dependency:
```
$ npm i -S @planetary-ssb/pub
```

Install as an app (git clone):
```
$ git clone git@github.com:planetary-social/planetary-pub.git pub
```


## use

### cli
```
$ node ./index.js
```

### node
```js
var createSbot = require('@planetary-ssb/pub/pub')
var Viewer = require('@planetary-ssb/pub/viewer')

createSbot((err, sbot) => {
  if (err) throw err
  var viewer = Viewer(sbot)
  viewer.listen(PORT, '0.0.0.0', (err, address) => {
      if (err) return cb(err)
      console.log(`Server is now listening on ${address}`)
  })
})
```


## env variables
See `.env.example`

```
NODE_ENV="test"
FAUNA_SECRET="123"
TEST_PW="my-password"
```

--------------------------------------------------------------------

Set `NODE_ENV` to `test` to re-write the DB with test data when the server starts.

Set `NODE_ENV` to `staging` to automatically connect to and follow the pubs in `./pubs.json`.

----------------------------------------------------

* [multiserver](https://github.com/ssb-js/multiserver)
* [multiserver address](https://github.com/ssbc/multiserver-address)

---------------------------------------------------

## example message

```js
 {
  key: '%1HbhmsEc4OCiLD5o8raRl+x8QUO7Y6oZ3C57vwNM78c=.sha256',
  value: {
    previous: '%CCceib4KRShqtaN95hPGl0qORtefsTEb/qwbB0YZVyQ=.sha256',
    sequence: 3,
    author: '@lV5MISER9oGaZJ7OLhlsUNVWHu982USYgMEWfIs6le0=.ed25519',
    timestamp: 1638820387617,
    hash: 'sha256',
    content: { type: 'post', text: 'three' },
    signature: 'E2sC6mH9F+HhfIVl6MjobLdZX6RG3QRwFBiMoT5vb64L6XkS5TutPh2gYRRIqKZSzzW5ld0sLvvEc81pcrRtCQ==.sig.ed25519'
  },
  timestamp: 1638820387618
}
```

---------------------------------------------------------------

## http API
### /



fastify.get('/', (_, res) => {
    res.send(sbot.config.keys.id + ' | ' + process.env.NODE_ENV)
})

----------------------------------------------------------------

## blobs
see [pull-files](https://github.com/pull-stream/pull-files)
[multiblob](https://github.com/ssbc/multiblob)
[ssb-blobs](https://github.com/ssbc/ssb-blobs)

------------------------------------------------------

`blobId`:

&SNZQDvykMENRmJMVyLfG20vlvgelGwj03C3YjWEi0JQ=.sha256

--------------------------------------------------------

https://github.com/ssbc/ssb-server#install
```bash
#!/bin/bash
while true; do
  ssb-server start
  sleep 3
done
```
