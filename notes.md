# notes

[example of getting messages with blobs](https://github.com/ssb-ngi-pointer/ssb-db2/issues/301)

--------------------------------------

## CRDT

I’m wondering if I should focus right now on a synchronization algorithm that is independent of storage... so you could have DB A and DB B, and then sync them… it’s a little bit out of my wheelhouse though. But it would be so useful to be able to have arbitrary stores of data and sync them… I think you would need certain constraints on data, but it may be possible

even if there were multiple adapters, one for DB A, another for DB B, as long as data is in a format compatible with both, i imagine you could connect them

we would be factoring for the things that are common to any DB I suppose.

## automerge

* [automerge/automerge#persisting-a-document](https://github.com/automerge/automerge#persisting-a-document)

Use `Automerge.save(doc)` to create a serialized document that contains the full change history of the document (a bit like a Git repository)

This is helpful if you have multiple pubs that synchrnize with one another

Also good if you have multiple devices with write access, although that is an easier situation to reconcile updates. You could use the claimed timestam since there is trust between device 1 and device 2.

I don't think this does anything to help with *persisting documents*. This means you would need to serialize a doc, then write it to a DB of choice.

```js
var myDoc = Automerge.save(doc)
myDB.write(myDoc)
```

## yjs
* [docs.yjs.dev](https://docs.yjs.dev/)
* [yjs/yjs](https://github.com/yjs/yjs)

Provides some helpers for transport & persisting.

You would need to create a persistence helper for any other DBs.

* [y-indexeddb](https://github.com/yjs/y-indexeddb)
* [y-leveldb](https://github.com/yjs/y-leveldb)
* [y-websocket](https://github.com/yjs/y-websocket)
* [y-webrtc](https://github.com/yjs/y-webrtc)

----------------------------------------------------------

## replication

Get logs by an ID.

Should not be dependent on the transport protocol.

----------------------------------------------

I was thinking today that they may have prioritized different things when making the original ssb. It seems like they may have prioritized replication, which makes sense if every peer is a full node. However, if you are making a reader app, for example, or a web-based crud app, then efficiency with replication is not as important. And in this issue — https://github.com/ssbc/ssb-server/issues/454#issuecomment-350405818 — for example there is talk about needing to improve efficiency vs ipfs, & he says

> anyway just the hashes for 100k messages would come to ~10 megabytes

but if you are not replicating, just viewing the 20 most recent messages, then it’s not that important

-----------------------------------------------

## hosts

* [render.com](https://render.com/)
* [fly.io](https://fly.io/)
* [digital ocean](https://www.digitalocean.com/)

## DB
* [cockroach DB](https://www.cockroachlabs.com/)
* [fauna DB](https://fauna.com/)
* [upstash](https://upstash.com/)
* [xata](https://www.xata.io/)

### p2p DBs
* [kappa DB](https://github.com/kappa-db/kappa-core)

