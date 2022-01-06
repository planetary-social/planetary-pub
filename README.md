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

## start
```
$ node ./index.js
```

## env variables
See `.env.example`

```
NODE_ENV="test"
FAUNA_SECRET="123"
TEST_PW="my-password"
```

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


--------------------------------------------------------------------

```
******peers*********** [
Jan 6 01:35:40 PM    [
Jan 6 01:35:40 PM      'net:eight45.net:8008~shs:eM4e8pmRiZpeCBitqp6vq3lT8EwC5UjjKuajHbpWnNI=',
Jan 6 01:35:40 PM      {
Jan 6 01:35:40 PM        birth: 1640816091765,
Jan 6 01:35:40 PM        key: '@eM4e8pmRiZpeCBitqp6vq3lT8EwC5UjjKuajHbpWnNI=.ed25519',
Jan 6 01:35:40 PM        type: 'pub',
Jan 6 01:35:40 PM        autoconnect: false
Jan 6 01:35:40 PM      }
Jan 6 01:35:40 PM    ],
Jan 6 01:35:40 PM    [
Jan 6 01:35:40 PM      'net:fc56:8313:1e14:1a50:c01:850:a53e:7127:8008~shs:5XaVcAJ5DklwuuIkjGz4lwm2rOnMHHovhNg7BFFnyJ8=',
Jan 6 01:35:40 PM      {
Jan 6 01:35:40 PM        birth: 1640816092369,
Jan 6 01:35:40 PM        key: '@5XaVcAJ5DklwuuIkjGz4lwm2rOnMHHovhNg7BFFnyJ8=.ed25519',
Jan 6 01:35:40 PM        type: 'pub',
Jan 6 01:35:40 PM        autoconnect: false
Jan 6 01:35:40 PM      }
Jan 6 01:35:40 PM    ],
Jan 6 01:35:40 PM    [
Jan 6 01:35:40 PM      'net:207.154.204.200:8008~shs:GF8UXwmSBvu/qcVrj18SUYPXzya694n7u30RUFajPws=',
Jan 6 01:35:40 PM      {
Jan 6 01:35:40 PM        birth: 1640816093046,
Jan 6 01:35:40 PM        key: '@GF8UXwmSBvu/qcVrj18SUYPXzya694n7u30RUFajPws=.ed25519',
Jan 6 01:35:40 PM        type: 'pub',
Jan 6 01:35:40 PM        autoconnect: false
Jan 6 01:35:40 PM      }
Jan 6 01:35:40 PM    ],
Jan 6 01:35:40 PM    [
Jan 6 01:35:40 PM      'net:pub.locksmithdon.net:8008~shs:5Iy0jt/wxI84VmdFeTdDedXjI1zyAU6BXQvb4DUyZIE=',
Jan 6 01:35:40 PM      {
Jan 6 01:35:40 PM        birth: 1640816093668,
Jan 6 01:35:40 PM        key: '@5Iy0jt/wxI84VmdFeTdDedXjI1zyAU6BXQvb4DUyZIE=.ed25519',
Jan 6 01:35:40 PM        type: 'pub',
Jan 6 01:35:40 PM        autoconnect: false
Jan 6 01:35:40 PM      }
Jan 6 01:35:40 PM    ],
Jan 6 01:35:40 PM    [
Jan 6 01:35:40 PM      'net:188.166.252.233:8008~shs:uRECWB4KIeKoNMis2UYWyB2aQPvWmS3OePQvBj2zClg=',
Jan 6 01:35:40 PM      {
Jan 6 01:35:40 PM        birth: 1640816923420,
Jan 6 01:35:40 PM        key: '@uRECWB4KIeKoNMis2UYWyB2aQPvWmS3OePQvBj2zClg=.ed25519',
Jan 6 01:35:40 PM        type: 'pub',
Jan 6 01:35:40 PM        autoconnect: false
Jan 6 01:35:40 PM      }
Jan 6 01:35:40 PM    ],
Jan 6 01:35:40 PM    [
Jan 6 01:35:40 PM      'net:176.58.117.63:8008~shs:J+0DGLgRn8H5tVLCcRUfN7NfUcTGEZKqML3krEOJjDY=',
Jan 6 01:35:40 PM      {
Jan 6 01:35:40 PM        birth: 1640817208550,
Jan 6 01:35:40 PM        key: '@J+0DGLgRn8H5tVLCcRUfN7NfUcTGEZKqML3krEOJjDY=.ed25519',
Jan 6 01:35:40 PM        type: 'pub',
Jan 6 01:35:40 PM        autoconnect: false
Jan 6 01:35:40 PM      }
Jan 6 01:35:40 PM    ]
Jan 6 01:35:40 PM  ]
```





```
Jan 6 03:01:23 PM  errrr Error: could not write to tmpfile    at /opt/render/project/src/node_modules/multiblob/index.js:235:31    at next (/opt/render/project/src/node_modules/pull-write-file/index.js:14:26)    at /opt/render/project/src/node_modules/pull-stream/throughs/map.js:19:9    at /opt/render/project/src/node_modules/pull-stream/throughs/through.js:19:9    at /opt/render/project/src/node_modules/pull-stream/throughs/async-map.js:28:19    at /opt/render/project/src/node_modules/pull-stream/sources/error.js:5:5    at next (/opt/render/project/src/node_modules/pull-stream/throughs/async-map.js:27:9)    at /opt/render/project/src/node_modules/pull-stream/throughs/through.js:16:14    at /opt/render/project/src/node_modules/pull-stream/throughs/map.js:11:7
```
