# planetary pub

A pub

This creates an `sbot`, and imports and exposes the viewer app.

See the [render.com dashboard](https://dashboard.render.com/web/srv-c6elp2vh8vlcnlnvsm5g/settings)

https://pub2.onrender.com/

See [how the caps value is generated](https://www.npmjs.com/package/ssb-caps#shs-secret-handshake-connection-key)

-------------------------------------------------------

example message

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
