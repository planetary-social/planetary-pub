# planetary pub

A pub

See the [render.com deploy](https://dashboard.render.com/web/srv-c6elp2vh8vlcnlnvsm5g/settings)

## viewer app

`localhost:8807/web/%257OUHcZna%2FwRjbWZuxsDOuYeimiYI82rps56ewppYriE%3D.sha256/index.html`

```
/Users/nick/code/planetary-pub/node_modules/ssb-web-resolver/index.js:43
      sbot.backlinks.read({
                     ^

TypeError: Cannot read property 'read' of undefined
```

the `ssb-viewer` app depends on `ssb-backilinks`, but we can't use `backlinks` with `ssb-db2`.

---------------------------------------------------------------

## TODO

* should follow our existing pubs
