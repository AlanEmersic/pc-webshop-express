const bcrypt = require("bcrypt");

module.exports = function (express, pool, jwt, secret) {
  const apiRouter = express.Router();

  function authenticateToken(req, res, next) {
    const header = req.headers["authorization"];
    const token = header && header.split(" ")[1];

    if (token == null) {
      return res.sendStatus(401);
    }

    jwt.verify(token, secret, (err, customer) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.customer = customer;
      next();
    });
  }

  apiRouter
    .route("/products")
    .get(async function (req, res) {
      try {
        let connection = await pool.getConnection();
        let rows = await connection.query(
          "select price, product.name, brand, description, serialNumber, img, category.name as categoryName, category.id as categoryId from product join category on product.categoryId = category.id;"
        );
        connection.release();

        res.json(rows);
      } catch (error) {
        console.log(error);
        return res.json({ code: 100, status: "Error get products" });
      }
    })
    .post(authenticateToken, async function (req, res) {
      const product = {
        name: req.body.name,
        price: req.body.price,
        brand: req.body.brand,
        description: req.body.description,
        serialNumber: req.body.serialNumber,
        categoryId: req.body.categoryId,
      };

      try {
        let connection = await pool.getConnection();
        let query = await connection.query(
          "insert into product set ?;",
          product
        );
        connection.release();
        res.json({ status: "OK", insertId: query.insertId });
      } catch (error) {
        console.log(error);
      }
    })
    .put(authenticateToken, async function (req, res) {
      const product = {
        name: req.body.name,
        price: req.body.price,
        brand: req.body.brand,
        description: req.body.description,
        serialNumber: req.body.serialNumber,
        categoryId: req.body.categoryId,
      };

      try {
        let connection = await pool.getConnection();
        let query = await connection.query(
          "update product set price = ? where serialNumber = ?;",
          [product.price, req.body.serialNumber]
        );
        connection.release();
        res.json({ status: "OK", changedRows: query.changedRows });
      } catch (error) {
        console.log(error);
      }
    });

  apiRouter
    .route("/products/:serialNumber")
    .get(async function (req, res) {
      try {
        let connection = await pool.getConnection();
        let rows = await connection.query(
          "select product.id, price, product.name, brand, description, serialNumber, img, category.name as categoryName from product join category on product.categoryId = category.id where serialNumber = ?;",
          req.params.serialNumber
        );
        connection.release();
        res.json(rows[0]);
      } catch (error) {
        console.log(error);
      }
    })
    .delete(authenticateToken, async function (req, res) {
      try {
        let connection = await pool.getConnection();
        let query = await connection.query(
          "delete from product where serialNumber = ?;",
          req.params.serialNumber
        );
        connection.release();
        res.json({ status: "OK", affectedRows: query.affectedRows });
      } catch (error) {
        console.log(error);
      }
    });

  apiRouter.route("/login").post(async function (req, res) {
    try {
      let connection = await pool.getConnection();
      let rows = await connection.query(
        "select username, password, email from customer where username = ?;",
        req.body.username
      );
      connection.release();
      user = rows[0];

      bcrypt.compare(
        req.body.password,
        user.password,
        function (err, response) {
          if (err) {
            console.log("login error");
          }
          if (response) {
            const customer = {
              username: user.username,
              email: user.email,
            };

            const token = jwt.sign(customer, secret, {
              expiresIn: "60m",
            });
            res.json({ token: token });
          } else {
            res.json({ success: false, message: "passwords do not match" });
          }
        }
      );
    } catch (error) {
      console.log(error);
    }
  });

  apiRouter.route("/register").post(async function (req, res) {
    try {
      const hashPass = await bcrypt.hash(req.body.password, 10);
      const customer = {
        username: req.body.username,
        password: hashPass,
        email: req.body.email,
      };

      let connection = await pool.getConnection();
      let queryCustomer = await connection.query(
        "insert into customer set ?;",
        customer
      );

      const cart = {
        customerId: queryCustomer.insertId,
      };

      let queryCart = await connection.query("insert into cart set ?;", cart);
      connection.release();
      res.json(queryCustomer.insertId);
    } catch (error) {
      console.log(error);
    }
  });

  apiRouter.route("/customers").get(async function (req, res) {
    try {
      let connection = await pool.getConnection();
      let rows = await connection.query(
        "select id, username, email from customer;"
      );
      connection.release();

      res.json(rows);
    } catch (error) {
      console.log(error);
      return res.json({ code: 100, status: "Error get customers" });
    }
  });

  apiRouter
    .route("/customers/:username")
    .get(authenticateToken, async function (req, res) {
      try {
        let connection = await pool.getConnection();
        let rows = await connection.query(
          "select id, username, email from customer where username = ?;",
          req.params.username
        );
        connection.release();
        res.json(rows[0]);
      } catch (error) {
        console.log(error);
      }
    })
    .delete(authenticateToken, async function (req, res) {
      try {
        let connection = await pool.getConnection();
        let query = await connection.query(
          "delete from customer where id = ?;",
          req.params.id
        );
        connection.release();
        res.json({ status: "OK", affectedRows: query.affectedRows });
      } catch (error) {
        console.log(error);
      }
    });

  apiRouter
    .route("/cart/:username")
    .get(authenticateToken, async function (req, res) {
      try {
        let connection = await pool.getConnection();
        let rows = await connection.query(
          "select username, customerId, cart.id as cartId from cart join customer c on c.id = cart.customerId where username = ?;",
          req.params.username
        );
        connection.release();
        res.json(rows[0]);
      } catch (error) {
        console.log(error);
      }
    });

  apiRouter
    .route("/cart/:username/cart")
    .get(authenticateToken, async function (req, res) {
      try {
        let connection = await pool.getConnection();
        let rows = await connection.query(
          "select username, email, customerId, productId, cartId, amount, c2.id as itemId, p.price as price, p.name as name from cart join customer c on c.id = cart.customerId left join cartitem c2 on cart.id = c2.cartId left join product p on p.id = c2.productId where username = ?;",
          req.params.username
        );
        connection.release();
        res.json(rows);
      } catch (error) {
        console.log(error);
      }
    })
    .post(authenticateToken, async function (req, res) {
      const cartItem = {
        productId: req.body.productId,
        cartId: req.body.cartId,
        amount: req.body.amount,
      };

      try {
        let connection = await pool.getConnection();
        let queryItem = await connection.query(
          "select * from cartItem where cartId = ? and productId = ?",
          [cartItem.cartId, cartItem.productId]
        );

        if (queryItem[0]) {
          let updateQuery = await connection.query(
            "update cartitem set amount = ? where id = ?;",
            [queryItem[0].amount + 1, queryItem[0].id]
          );
          res.json({ status: "OK", changedRows: updateQuery.changedRows });
        } else {
          let queryInsert = await connection.query(
            "insert into cartitem set ?;",
            cartItem
          );
          res.json({ status: "OK", insertId: queryInsert.insertId });
        }
        connection.release();
      } catch (error) {
        console.log(error);
      }
    });

  apiRouter
    .route("/cart/:username/cart/:id")
    .delete(authenticateToken, async function (req, res) {
      try {
        let connection = await pool.getConnection();
        let query = await connection.query(
          "delete from cartitem where id = ?;",
          req.params.id
        );
        connection.release();
        res.json({ status: "OK", affectedRows: query.affectedRows });
      } catch (error) {
        console.log(error);
      }
    });

  apiRouter
    .route("/orders")
    .get(authenticateToken, async function (req, res) {
      try {
        let connection = await pool.getConnection();
        let rows = await connection.query("select * from orders;");
        connection.release();

        res.json(rows);
      } catch (error) {
        console.log(error);
        return res.json({ code: 100, status: "Error get orders" });
      }
    })
    .post(authenticateToken, async function (req, res) {
      const order = {
        cartId: req.body.cartId,
        orderDate: req.body.orderDate,
      };

      try {
        let connection = await pool.getConnection();
        let query = await connection.query(`insert into orders set ?;`, order);

        let queryItems = await connection.query(
          "delete cartitem from cartitem join cart c on cartitem.cartId = c.id where c.id = ?;",
          order.cartId
        );
        connection.release();
        res.json({ status: "OK", insertId: query.insertId });
      } catch (error) {
        console.log(error);
      }
    });

  apiRouter
    .route("/orders/:id")
    .get(async function (req, res) {
      try {
        let connection = await pool.getConnection();
        let rows = await connection.query(
          "select customerId, o.id as orderId, orderDate from cart join `orders` o on cart.id = o.cartId where customerId = ?;",
          req.params.id
        );
        connection.release();
        res.json(rows);
      } catch (error) {
        console.log(error);
      }
    })
    .delete(authenticateToken, async function (req, res) {
      try {
        let connection = await pool.getConnection();
        let query = await connection.query(
          "delete from orders where id = ?;",
          req.params.id
        );
        connection.release();
        res.json({ status: "OK", affectedRows: query.affectedRows });
      } catch (error) {
        console.log(error);
      }
    });

  return apiRouter;
};
