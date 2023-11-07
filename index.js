
const express = require("express");
const app = express();
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require("cors");
const port = process.env.PORT || 5000;

// middlewere
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ywavnlw.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// jwt middleware

const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  // token validation
  if (!token) {
    return res.status(401).send({ message: 'unauthorized token' })
  }

  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      req.user = decoded;
      next();
    })
  }
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    const productCollection = client.db("productDB").collection("products");
    const cartCollection = client.db("productDB").collection("carts");


    // add product
    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      console.log(result);
      res.send(result);
    });

    // add carts
    app.post("/carts", async (req, res) => {
      const carts = req.body;
      delete carts._id;
      const result = await cartCollection.insertOne(carts);
      console.log(result);
      res.send(result);
    });


    // token
    app.post("/jwt", async (req, res) => {
      const userEmail = req.body.email;
      const token = jwt.sign({ email: userEmail }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.cookie('token', token, {
        httpOnly: true,
        secure: false // this value will be {true} before deploy vercel
      }).send('cookie send successfully');
    })



    // get carts
    app.get("/carts", verifyToken, async (req, res) => {

      let query = {}

      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await cartCollection.find().toArray();
      res.send(result);
    });

    // delete one cart
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await cartCollection.deleteOne(query);
      console.log(result);
      res.send(result);
    });


    // get single data for update
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      console.log("id", id);
      const query = {
        _id: new ObjectId(id),
      };
      const result = await productCollection.findOne(query);
      console.log(result);
      res.send(result);
    });

    // update single data
    app.put("/products/:id", async (req, res) => {
      const id = req.params.id;
      const product = req.body;

      const filter = {
        _id: new ObjectId(id),
      };
      const options = { upsert: true };
      const updatedData = {
        $set: {
          image: product.image,
          name: product.name,
          type: product.type,
          price: product.price,
          brand: product.optionBrand,
          rating: product.rating,
          description: product.description
        },
      };
      const result = await productCollection.updateOne(
        filter,
        updatedData,
        options
      );
      res.send(result);
    });





    // get product
    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get("/", (req, res) => {
  res.send("Crud is running...");
});


app.listen(port, () => {
  console.log(`Simple Crud is Running on port ${port}`);
});

