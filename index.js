const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config();
var admin = require("firebase-admin");
const stripe = require("stripe")(`${process.env.STRIPE_SECRET_KEY}`);

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

// booking Id generate
function generateSdId(digitLength = 5) {
  const max = Math.pow(10, digitLength);
  const num = Math.floor(Math.random() * max)
    .toString()
    .padStart(digitLength, "0");
  return `SD-${num}`;
}
const bookingId = generateSdId();

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
    app.patch("/update-user", jwtVerify, async (req, res) => {
      const updateUserInfo = {
        ...req.body,
        updatedAt,
      };
      const update = await userColl.updateOne(
        { email: req.tokenEmail },
        { $set: updateUserInfo }
      );
      res.send(update);
    });
    app.get("/users", jwtVerify, async (req, res) => {
      const isAdmin = await userColl.findOne({ email: req.tokenEmail });
      const query = { role: req.query.role };
      if (req.query.status) {
        query.status = req.query.status;
      }
      if (isAdmin.role === "admin") {
        try {
          if (req.query.role) {
            const users = await userColl.find(query).toArray();
            res.send(users);
          } else {
            const users = await userColl.find().toArray();
            res.send(users);
          }
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
    app.get("/users/me", jwtVerify, async (req, res) => {
      try {
        const me = await userColl.findOne({ email: req.tokenEmail });
        res.send(me);
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
        const services = await serviceColl.find({ available: true }).toArray();
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
    app.post("/new-booking", jwtVerify, async (req, res) => {
      try {
        const newBooking = {
          ...req.body,
          createdAt,
          updatedAt,
          bookingId,
          status: "Payment Pending",
        };
        const booking = await bookingColl.insertOne(newBooking);
        res.send(booking);
      } catch (error) {
        console.error(error);
        res.status(500).send("internal server Error");
      }
    });
    app.patch("/booking/:id", jwtVerify, async (req, res) => {
      try {
        const { role } = await userColl.findOne({ email: req.tokenEmail });
        if (role === "user") {
          const updateData = {
            serviceDate: req.body.serviceDate,
            location: req.body.location,
            updatedAt,
          };
          const booking = await bookingColl.updateOne(
            {
              _id: new ObjectId(req.params.id),
            },
            { $set: updateData }
          );
          return res.send(booking);
        }
      } catch (error) {
        console.error(error);
        res.status(500).send("internal server Error");
      }
    });
    app.patch("/booking-cancel/:id", jwtVerify, async (req, res) => {
      try {
        const { role } = await userColl.findOne({ email: req.tokenEmail });
        if (role === "user") {
          const updateData = {
            status: "canceled",
            updatedAt,
          };
          const booking = await bookingColl.updateOne(
            {
              _id: new ObjectId(req.params.id),
            },
            { $set: updateData }
          );
          return res.send(booking);
        }
      } catch (error) {
        console.error(error);
        res.status(500).send("internal server Error");
      }
    });
    app.get("/bookings", jwtVerify, async (req, res) => {
      try {
        const query = {};
        if (req.query.status) {
          query.status = req.query.status;
        }
        const { role } = await userColl.findOne({ email: req.tokenEmail });
        if (role === "user") {
          const bookings = await bookingColl
            .find({ userEmail: req.tokenEmail })
            .toArray();
          return res.send(bookings);
        } else if (role === "admin") {
          const bookings = await bookingColl.find(query).toArray();
          return res.send(bookings);
        }
      } catch (error) {
        console.error(error);
        res.status(500).send("internal server Error");
      }
    });
    app.patch("/booking-assigned/:id", jwtVerify, async (req, res) => {
      try {
        const id = req.params.id;
        const isAdmin = await userColl.findOne({ email: req.tokenEmail });
        if (isAdmin.role === "admin") {
          const updateData = req.body;
          const decorator = await userColl.updateOne(
            {
              email: req.body.decoratorEmail,
            },
            { $set: { status: "working" } }
          );
          const result = await bookingColl.updateOne(
            { _id: new ObjectId(id) },
            { $set: { ...updateData, status: "assigned" } }
          );
          res.send(result);
        } else {
          return res.status(403).send({ message: "Unauthorized" });
        }
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // payment collection && apis
    const paymentColl = styleDecorDB.collection("payments");
    app.post("/checkout-session", async (req, res) => {
      try {
        const { service_name, bookingId, cost, userEmail } = req.body;
        const session = await stripe.checkout.sessions.create({
          line_items: [
            {
              price_data: {
                currency: "USD",
                product_data: {
                  name: service_name,
                },
                unit_amount: Number(cost) * 100,
              },
              quantity: 1,
            },
          ],
          customer_email: userEmail,
          mode: "payment",
          metadata: {
            service_name,
            bookingId,
            userEmail,
          },
          success_url: `${process.env.baseUrl}/dashboard/booking-confirmed?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.baseUrl}/dashboard/payment-canceled`,
        });
        res.send(session);
      } catch (error) {
        res.status(500).send("internal server Error");
      }
    });
    app.post("/payment-success", jwtVerify, async (req, res) => {
      try {
        const { session_id } = req.query;
        const session = await stripe.checkout.sessions.retrieve(session_id);
        if (session) {
          const paymentInfo = {
            service_name: session.metadata.service_name,
            bookingId: session.metadata.bookingId,
            userEmail: session.metadata.userEmail,
            transactionId: session.payment_intent,
            cost: session.amount_total,
            createdAt,
          };
          res.send(paymentInfo);

          const isDuplicatePayment = await paymentColl.findOne({
            bookingId: paymentInfo.bookingId,
          });

          if (!isDuplicatePayment) {
            await bookingColl.updateOne(
              { bookingId: paymentInfo.bookingId },
              {
                $set: { status: "pending", paymentStatus: "paid", updatedAt },
              }
            );
            await paymentColl.insertOne(paymentInfo);
            return;
          } else return;
        } else {
          return res.send({
            message: "Payment issue, please contact with support!",
          });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send("internal server Error");
      }
    });
    app.get("/payments", jwtVerify, async (req, res) => {
      try {
        const isAdmin = await userColl.findOne({ email: req.tokenEmail });
        if (isAdmin.role === "admin") {
          const payments = await paymentColl.find().toArray();
          res.send(payments);
        } else {
          const payments = await paymentColl
            .find({ userEmail: req.tokenEmail })
            .toArray();
          res.send(payments);
        }
      } catch (error) {
        console.error(error);
        res.status(500).send("internal server Error");
      }
    });

    // decorators & APIS
    app.patch("/add-decorator", jwtVerify, async (req, res) => {
      try {
        const isAdmin = await userColl.findOne({ email: req.tokenEmail });
        if (isAdmin.role === "admin") {
          const update = await userColl.updateOne(
            { _id: new ObjectId(req.body.userId) },
            { $set: { role: "decorator" } }
          );
          res.send(update);
        } else {
          res.status(401);
        }
      } catch (error) {
        console.error(error);
        res.status(500).send("internal server Error");
      }
    });
    app.get("/decorators", jwtVerify, async (req, res) => {
      try {
        const isAdmin = await userColl.findOne({ email: req.tokenEmail });
        if (isAdmin.role === "admin") {
          const find = await userColl.find({ role: "decorator" }).toArray();
          res.send(find);
        }
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

app.get("/", (req, res) => {
  res.send({ message: "api working fine!" });
});
app.listen(port, () => {
  console.log(`app running on: ${port}`);
});
app.all(/.*/, (req, res) => {
  res.status(404).json({ status: 404, message: "invalid API call!" });
});
