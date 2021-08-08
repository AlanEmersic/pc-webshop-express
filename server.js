const express = require("express");
const app = express();
const mysql = require("promise-mysql");
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

app.use(morgan("dev"));

const apiRouter = require("./app/routes/api")(
  express,
  pool,
  jwt,
  config.secret
);
app.use("/api", apiRouter);


app.listen(config.port);
console.log("Port: " + config.port);
