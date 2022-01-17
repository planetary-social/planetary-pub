> Here's what those docs look like already:

The anatomy of ssb "threads"
============================

Core anatomy
------------

For the rest of this documentation we're going to represent these like:

    // minimal root
    A.value.content {
        type: "post",
        text: "# The anatomy of ssb threads"
    },
    

    // minimal reply
    B.value.content = {
        type: "post",
        text: "Ok so ...",
    
        /* tangle info */
        root: "%+fBXl12aV1wpAdD62RMl1WRhwthDMuAuHH4iNWgB7jA=.sha256", // A.key
        branch: [
        "%+fBXl12aV1wpAdD62RMl1WRhwthDMuAuHH4iNWgB7jA=.sha256" // A.key
        ]
    }
    

Tangles
-------

The concept of a _tangle_ has two parts:

1.  **tangleId**
    *   A unique identifier for a tangle, so you can identify messages that are part of it
    *   here this id is the id of the root/ initial message in the thread
    *   this is the \`content.root\` (for \`post\` messages)
2.  **tangle position**
    *   We express this by listing the ids of which messages have come _before_ this message in the tangle
    *   Instead of listing _every_ previous messageId, if we build a _graph_ of the messages, we can just record the _tips_ of the graph that we're extending from
    *   this is the \`content.branch\` (for \`post\` messages)
    *   NOTE: because messages can be published concurrently there may be > 1 branch tips we're extending from

![image.png](/&Ng/8tFRwjelX5mZLrrWUSfC9ItpIayBbOnZCfqKwdzE=.sha256)

Here the "root" message is \`A\`, and we know that \`B\` follows it because

    B.value.content.branch = [A.key]
    

That is _"B points back to the message(s) before it in the tangle, which is A"_

Similarly:

    C.value.content.branch = [B.key]
    D.value.content.branch = [B.key]
    E.value.content.branch = [C.key, D.key]
    

Generally people flatten this into a linear timeline for easier display.  
To do that, you need to take this graph and decide how to break ties for the sections of the graph  
which are branched:

![image.png](/&+44jiyRclxjyor/HteFRCezlFPA4Jobv8EwP3ANtaK0=.sha256)

Optional fields
---------------

*   \`content.recps\` _Array_
    *   used for encryption - your message will be automatically encrypted to those you list here
    *   all replies **should** copy the \`recps\` of the root message
    *   entries can be
        *   FeedId - encypts to a device
        *   GroupId - encrypts to a group you're a part of
        *   POBoxiId - encrypts to a group you're not a part of
        
    *   in Patchwork v1 (by @pfraze), feedIds were never included in the text, so mentions were essential to know what to link \`@mikey\` in \`context.text\`
*   \`content.channel\` _String_
    
    *   the OG hashtag thing
    *   ideally does not include
*   \`content.replies\`
    
    *   Patchwork specific one, requires more detail
        *   this had the nice property that you could see when a message you write got replied to (this was only displayed in Patchbay AFIK)

Gotchas
-------

*   missing messages
    *   if you are missing a message in the middle of your tangle graph, then we generally still want to try to rended what you have (any maybe alert )
*   \`content.channel\`
    *   may or may not include a #, be sure to trim!

Nested Replies
--------------

![image.png](/&ppIBS1peyQV0HW5i7D/J/uVxKoRVQapX2l7nHlGQVcQ=.sha256)

_Someone should write the fork/ nested spec.... I have no idea how it actually got implemented_

TODO:
*   is there a _forked feed_ feature, or did the concept of _nested feed_ and _forked feed_ get merged
*   explain if it's possible to have multiple nests/ forks of a single node

Tools
-----
*   modules`