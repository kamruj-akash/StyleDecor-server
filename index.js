const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config();
var admin = require("firebase-admin");
const { useCallback } = require("react");

const decoded = Buffer.from(process.env.firebaseAdminSDK, "base64").toString(
  "utf8"
);
const serviceAccount = JSON.parse(decoded);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware
app.use(cors());
app.use(express.json());

// mongodb://localhost:27017/
const uri = "mongodb://localhost:27017/";

// iso time

const createdAt = new Date().toISOString();
const updatedAt = new Date().toISOString();
const lastLoginAt = new Date().toISOString();

const jwtVerify = async (req, res, next) => {
  if (!req.headers.authorization) {
    res.status(401).send({ message: "un-authorize access!" });
    return;
  }
  const userToken = req.headers.authorization.split(" ")[1];
  if (!userToken) {
    res.status(401).send({ message: "un-authorize access!" });
    return;
  }
  try {
    const decoded = await admin.auth().verifyIdToken(userToken);
    req.tokenEmail = decoded.email;
    next();
  } catch {
    return res.status(404).send({ message: "forbidden access!" });
  }
};

// Create a MongoClient with a MongoClientOptions
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const styleDecorDB = client.db("styleDecor_database");
    const userColl = styleDecorDB.collection("users");

    // users related API
    app.post("/user", async (req, res) => {
      const userInfo = {
        ...req.body,
        role: "user",
        createdAt,
        lastLoginAt,
      };
      try {
        const existUser = await userColl.findOne({ email: req.body.email });
        if (existUser) {
          const updateUser = await userColl.updateOne(
            {
              email: req.body.email,
            },
            { $set: { lastLoginAt } }
          );
          return res.send(updateUser, { message: "Email already exists" });
        } else {
          const user = await userColl.insertOne(userInfo);
          return res.send(user);
        }
      } catch (error) {
        console.error(error);
        res.status(500).send("internal server Error");
      }
    });

    app.get("/users", jwtVerify, async (req, res) => {
      const isAdmin = await userColl.findOne({ email: req.tokenEmail });

      if (isAdmin.role === "admin") {
        try {
          const users = await userColl.find().toArray();
          res.send(users);
        } catch (error) {
          console.error(error);
          res.status(500).send("internal server Error");
        }
      } else {
        res.status(403).send({ message: "forbidden access!!" });
      }
    });
    app.patch("/user/login", async (req, res) => {
      try {
        const updateLogin = await userColl.updateOne(
          { email: req.body.email },
          { $set: { lastLoginAt } }
        );
        res.send(updateLogin);
      } catch (error) {
        console.error(error);
        res.status(500).send("internal server Error");
      }
    });

    // get role
    app.get("/user/role", jwtVerify, async (req, res) => {
      try {
        const userRole = await userColl.findOne({ email: req.tokenEmail });
        res.send({ role: userRole.role });
      } catch (error) {
        console.error(error);
        res.status(500).send("internal server Error");
      }
    });

    const serviceColl = styleDecorDB.collection("Services");

    // services
    app.post("/service", jwtVerify, async (req, res) => {
      try {
        const { role } = await userColl.findOne({ email: req.tokenEmail });
        if (role === "admin") {
          const newService = {
            ...req.body,
            createdAt,
            updatedAt,
          };
          const posted = await serviceColl.insertOne(newService);
          return res.send(posted);
        } else {
          return res.status(403).send({ message: "forbidden access!" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send("internal server Error");
      }
    });
    app.patch("/route", async (req, res) => {
      try {
      } catch (error) {
        console.error(error);
        res.status(500).send("internal server Error");
      }
    });
    app.delete("/service/:id", jwtVerify, async (req, res) => {
      try {
        const { role } = await userColl.findOne({ email: req.tokenEmail });
        if (role === "admin") {
          const delService = await serviceColl.deleteOne({
            _id: new ObjectId(req.params.id),
          });
          res.send(delService);
        }
      } catch (error) {
        console.error(error);
        res.status(500).send("internal server Error");
      }
    });

    app.get("/services", async (req, res) => {
      try {
        const services = await serviceColl.find().toArray();
        res.send(services);
      } catch (error) {
        console.error(error);
        res.status(500).send("internal server Error");
      }
    });
    app.get("/service/:id", async (req, res) => {
      try {
        const services = await serviceColl.findOne({
          _id: new ObjectId(req.params.id),
        });
        res.send(services);
      } catch (error) {
        console.error(error);
        res.status(500).send("internal server Error");
      }
    });

    // booking collection
    const bookingColl = styleDecorDB.collection("Bookings");
    app.post("/new-booking", async (req, res) => {
      try {
        const newBooking = { ...req.body, createdAt, updatedAt };
        const booking = await bookingColl.insertOne(newBooking);
        res.send(booking);
      } catch (error) {
        console.error(error);
        res.status(500).send("internal server Error");
      }
    });
    app.get("/bookings", jwtVerify, async (req, res) => {
      try {
        const role = await userColl.findOne({ email: req.tokenEmail });
        console.log(role);
        const bookings = await bookingColl.find().toArray();
        res.send(bookings);
      } catch (error) {
        console.error(error);
        res.status(500).send("internal server Error");
      }
    });

    //
  } finally {
  }
}
run().catch(console.dir);

app.use((req, res) => {
  res.status(404).json({ message: "API Not Found" });
});

app.get("/", (req, res) => {
  res.send("api working fine!");
});
app.listen(port, () => {
  console.log(`app running on: ${port}`);
});
