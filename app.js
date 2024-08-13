const devConfig = require("./config/parse-config.json");
const prodConfig = require("./config/parse-config.json");
const dotenv = require("dotenv");
const express = require("express");
const ParseServer = require("parse-server").ParseServer;

const app = express();
dotenv.config();

const config = process.env.NODE_ENV === "production" ? prodConfig : devConfig;
const api = new ParseServer(config);

api.start();

// Serve the Parse API at /parse URL prefix
app.use("/parse", api.app);

const port = 1337;
app.listen(port, function() {
  console.log("parse-server-example running on port " + port + ".");
});
