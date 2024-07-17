// const express = require('express');
// const { ParseServer } = require('parse-server');
const config = require('./config/parse-config.json');
//
// const app = express();
//
// app.get('/test', async (req, res) => {
//     console.log('hello world');
//     res.status(200).json({'message' : 'Success'});
//
// })
// // Define Parse Server configuration
// const api = new ParseServer(config);
// //
// // Serve the Parse API on the /parse URL prefix
// app.use('/parse', api.app);
//
//
// // Start the Express server
// const PORT = process.env.PORT || 1337;
// app.listen(PORT, () => {
//     console.log(`Parse Server running on http://localhost:${PORT}/parse`);
// });


const express = require('express');
const ParseServer = require('parse-server').ParseServer;


console.log(config)

const app = express();
const api = new ParseServer(config);
api.start();



// Serve the Parse API at /parse URL prefix
app.use('/parse', api.app);



const port = 1337;
app.listen(port, function() {
    console.log('parse-server-example running on port ' + port + '.');
});