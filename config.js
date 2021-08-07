module.exports = {
  port: process.env.PORT || 8080,
  pool: {
    connectionLimit: 100,
    host: "localhost",
    user: "root",
    password: "root",
    database: "pc-webshop",
  },
  secret: "ayk4yLWJgcayk4yLWJgcay4yLWJgc",
};
