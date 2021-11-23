const SecretStack = require('secret-stack')
const caps = require('./caps')
const { where, and, type, author, toCallback } = require('ssb-db2/operators')

const sbot = SecretStack({ caps })
    .use(require('ssb-db2'))
    // .use(require('ssb-db2/compat')) // include all compatibility plugins
    .call(null, { path: './db' })




// // importing express framework
// const express = require("express");
// const app = express();

// // Respond with "hello world" for requests that hit our root "/"
// app.get("/", function (req, res) {
//     return res.send("Hello Planet earth");
// });

// // listen to port 7000 by default
// app.listen(process.env.PORT || 7000, () => {
//     console.log("Server is running");
// });

// module.exports = app;

