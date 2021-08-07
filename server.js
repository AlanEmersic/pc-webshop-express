const express = require("express");
const app = express();
const mysql = require("promise-mysql");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
const config = require("./config");
const jwt = require("jsonwebtoken");
const pool = mysql.createPool(config.pool);


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:4200",
  })
);

// app.use(express.static(__dirname + "/public/app"));

// app.use(function (req, res, next) {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
//   res.setHeader(
//     "Access-Control-Allow-Headers",
//     "X-Requested-With,content-type,  Authorization"
//   );
//   next();
// });

app.use(morgan("dev"));

const apiRouter = require("./app/routes/api")(
  express,
  pool,
  jwt,
  config.secret
);
app.use("/api", apiRouter);


// app.get("*", function (req, res) {
//   res.sendFile(path.join(__dirname + "/public/app/index.html"));
// });

app.listen(config.port);
console.log("Port: " + config.port);
