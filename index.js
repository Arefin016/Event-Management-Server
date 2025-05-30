const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

    // middlewares
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };

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

    app.post("/login", async (req, res) => {
      const { email, password } = req.body;
      const user = await userCollection.findOne({ email });
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }
      const isPasswordMatch = await bcrypt.compare(password, user.password);
      if (!isPasswordMatch) {
        return res.status(401).send({ message: "Incorrect password" });
      }
      const token = jwt.sign(
        { email: user.email },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: "1h",
        }
      );
      res.send({
        message: "Login successful",
        token,
      });
    });

    // View all events
    app.get("/create-event", async (req, res) => {
      const result = await createEventCollection.find().toArray();
      res.send(result);
    });

    app.get("/specefic-event", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await createEventCollection.find(query).toArray();
      res.send(result);
    });

    // specific event
    app.get("/specefic-event/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await createEventCollection.findOne(query);
      res.send(result);
    });

    // Specific event update
    app.patch("/specefic-event/:id", verifyToken, async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: item.name,
          date: item.date,
          time: item.time,
          location: item.location,
          description: item.description,
        },
      };
      const result = await createEventCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.delete("/specefic-event/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const userEmail = req.decoded.email;
      const event = await createEventCollection.findOne({
        _id: new ObjectId(id),
      });
      if (!event) {
        return res.status(404).send({ message: "Event not found" });
      }
      if (event.createdBy !== userEmail) {
        return res
          .status(403)
          .send({ message: "Forbidden: You are not the owner of this event" });
      }
      const result = await createEventCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // create events
    app.post("/create-event", verifyToken, async (req, res) => {
      const event = req.body;
      const userEmail = req.decoded.email;
      event.createdBy = userEmail;
      const result = await createEventCollection.insertOne(event);
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
