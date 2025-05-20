const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;
const bcrypt = require("bcrypt");
const saltRounds = 10;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hrdcqgm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("EventManagement").collection("users");
    const viewEventsCollection = client
      .db("EventManagement")
      .collection("view-events");
    const createEventCollection = client
      .db("EventManagement")
      .collection("create-event");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //user data save
    app.post("/users", async (req, res) => {
      const user = req.body;
      const hashedPassword = await bcrypt.hash(user.password, saltRounds);
      const newUser = {
        name: user.name,
        email: user.email,
        password: hashedPassword,
        photo: user.photo,
      };
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });

    // View all events
    app.get("/create-event", async (req, res) => {
      const result = await createEventCollection.find().toArray();
      res.send(result);
    });

    app.get("/spefic-event", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await createEventCollection.find(query).toArray();
      res.send(result);
    });

    // create events
    app.post("/create-event", async (req, res) => {
      const creatEvent = req.body;
      // console.log(creatEvent);
      const result = await createEventCollection.insertOne(creatEvent);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Event Management is running");
});

app.listen(port, () => {
  console.log(`Event Management is running on port ${port}`);
});
