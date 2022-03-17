# planetary pub

A pub

An [ssb-db2](https://github.com/ssb-ngi-pointer/ssb-db2) database and http API server.

------------------------------------

For the planetary instance, see the [render.com dashboard](https://dashboard.render.com/web/srv-c6elp2vh8vlcnlnvsm5g/settings)

The live http API -- https://pub2.onrender.com/

------------------------------------

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

## git hooks
We're using [husky](https://typicode.github.io/husky/#/) to automatically run tests and lint when you push to the 'main' branch.

## push without running tests
```bash
git push --no-verify
```

### setup git hooks
Add the test script as a git hook. This way we can check which branch we're on in the git hook.

```bash
npx husky add .husky/pre-push "./test/githook/prepush.sh"
```


## test

### Test the viewer
```bash
NODE_ENV=test node test/viewer.js | npx tap-spec
```

### Test the pub
```bash
NODE_ENV=test node test/index.js | npx tap-spec
```

### Start the pub locally, using _real_ data, not test-data
```bash
NODE_ENV=staging-local node index.js
```

### Use a 512 MB limit on memory (so you can tell if it uses too much)
```
NODE_ENV=staging-local node --max-old-space-size=512 index.js
```

### Start the debugger, viewable in chrome:
```bash
NODE_ENV=staging-local node --inspect-brk --max-old-space-size=512 index.js
```

then open `chrome://inspect/`

----------------------------------------------------------------

__Connect to your pub__

In another terminal/machine:
```js
// need to get this address from the other sbot
var addr = 'net:localhost:62042~shs:LYknR3SSOEOrXD2yEQcHhIrUQmsPNo5+3ETvfjuf3Mw='

// the `ssb-conn` plugin
sbot.conn.connect(addr, (err, ssb) => {
  if (err) return console.log('errrrr', err)
  console.log('**connected to pub**', !!ssb)
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

```
$ NODE_ENV=test npm start
```

Set `NODE_ENV` to `staging` to automatically connect to and follow the pubs in `./pubs.json`.

```
$ NODE_ENV=staging npm start
```

A `NODE_ENV` of `staging-local` means that you will connect to and follow other pubs automatically like above, but the DB will use a different directory, `db-staging`. Because that way you can run tests on your local machine using the `db` folder, and also make a pub that uses the folder `db-staging` for data that is more real.

```
$ NODE_ENV=staging-local npm start
```

----------------------------------------------------

* [multiserver](https://github.com/ssb-js/multiserver)
* [multiserver address](https://github.com/ssbc/multiserver-address)

---------------------------------------------------------------

Use a 512 MB limit on memory (so you can tell if it uses too much)
```
NODE_ENV=staging-local node --max-old-space-size=512 index.js
```

----------------------------------------------------------

## http API
These are the endpoints available if you call the http API

### /
=> `sbot.id | NODE_ENV`
#### example
`/`
=>
```
address -- net:localhost:62042~shs:LYknR3SSOEOrXD2yEQcHhIrUQmsPNo5+3ETvfjuf3Mw=
public keys -- @LYknR3SSOEOrXD2yEQcHhIrUQmsPNo5+3ETvfjuf3Mw=.ed25519
NODE_ENV -- test
```

### /:message-id
=> thread of messages related to that id, or just the message with id
#### example
`/%1HbhmsEc4OCiLD5o8raRl+x8QUO7Y6oZ3C57vwNM78c=.sha256`

### /blob/:blobId
=> return a blob, indexed by blob hash

#### example
`/blob/&SNZQDvykMENRmJMVyLfG20vlvgelGwj03C3YjWEi0JQ=.sha256`

### /feed/:userName
get a feed by display name. will return an array of JSON messages

#### example
`/feed/nichoth`

### /tag/:tagName
Get all messages tagged with #tagName.

#### example
`/tag/example`

### /profile/:username
Get someone's avatar and description by username
#### example
`/profile/nichoth`

### /counts/:username
Get the number of posts, number of followers, and number of users followed for
a given username

#### example
`/counts/nichoth`


----------------------------------------------------------------

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

---------------------------------------------------

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


## public web hosting

There is a convention on secure scuttlebutt for viewers that are publically acessible to respect a user's choice around putting their scuttlebutt content in a place it can be indexed by google and accessible without using a scuttlebutt application. In the planetary app users are asked during signup and can change it in their settings. For other scuttlebutt apps you need to manually add the setting to your log like this: 

```
sbot publish --type about --about "@your.public.id.here" --publicWebHosting
```
