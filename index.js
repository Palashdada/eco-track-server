const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://eco-track:6CDEXlO0HuSTzUuE@cluster0.hgrlmye.mongodb.net/?appName=Cluster0";

app.get("/", (req, res) => {
  res.send("Server is ok");
});

app.listen(port, () => {
  console.log(` app listening on port ${port}`);
});

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
    const db = client.db("eco-track-db");
    const challengesColl = db.collection("challenges-Collection");
    const tipsCall = db.collection("tips-Collection");
    const eventsCall = db.collection("events-Collection");
    const userChallengeColl = db.collection("userChallenge-Collection");
    app.get("/hero-challenges", async (req, res) => {
      const result = await challengesColl
        .find()
        .sort({
          participants: -1,
        })
        .limit(4)
        .toArray();
      res.send(result);
    });
    app.get("/all-challenges", async (req, res) => {
      const result = await challengesColl.find().toArray();
      res.send(result);
    });
    app.get("/live-statics", async (req, res) => {
      const totalChallenges = await challengesColl.countDocuments();
      const totalParticipants = await challengesColl
        .aggregate([
          { $group: { _id: null, total: { $sum: "$participants" } } },
        ])
        .toArray();
      const totalTips = await tipsCall.countDocuments();
      const totalEvents = await eventsCall.countDocuments();
      res.send({
        totalParticipants: totalParticipants[0].total || 0,
        totalEvents,
        totalTips,
        totalChallenges,
      });
    });
    app.get("/active-challenges", async (req, res) => {
      const date = new Date().toISOString();
      const activeChallenges = await challengesColl.find().limit(4).toArray();
      res.send(activeChallenges);
    });
    app.get("/recent-tips", async (req, res) => {
      const tips = await tipsCall
        .find()
        .sort({
          createdAt: -1,
        })
        .limit(5)
        .toArray();
      res.send(tips);
    });
    app.get("/upcoming-events", async (req, res) => {
      const event = await eventsCall
        .find()
        .sort({ date: 1 })
        .limit(4)
        .toArray();
      res.send(event);
    });
    app.get("/challenges/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await challengesColl.findOne(query);
      res.send(result);
    });
    app.post("/challenges/join/:id", async (req, res) => {
      const id = req.params.id;
      const { userId, email } = req.body;
      const challenge = await challengesColl.findOne({
        _id: new ObjectId(id),
      });
      const alreadyJoined = await userChallengeColl.findOne({
        challengeId: new ObjectId(id),
        userId,
      });
      if (alreadyJoined) {
        return res
          .status(400)
          .send({ message: "You already joined this challenge." });
      }
      await userChallengeColl.insertOne({
        challenge,
        userId,
        challengeId: new ObjectId(id),
        email,
        status: "Not Started",
        progress: 0,
        joinDate: new Date(),
      });
      await challengesColl.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { participants: 1 } }
      );
      res.send({ message: "Joined successfully" });
    });

    app.post("/challenges/add", async (req, res) => {
      const {
        title,
        category,
        description,
        duration,
        target,
        impactMetric,
        imageUrl,
        createdBy,
        startDate,
        endDate,
      } = req.body;

      const newChallenge = {
        title,
        category,
        description,
        duration: Number(duration),
        target,
        participants: 0,
        impactMetric,
        createdBy: createdBy,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        imageUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await challengesColl.insertOne(newChallenge);

      res.status(201).send({
        message: "Challenge created successfully!",
      });
    });
    app.patch("/challenges/:id", async (req, res) => {
      const { id } = req.params;
      const { userEmail, ...updateData } = req.body;

      const challenge = await challengesColl.findOne({
        _id: new ObjectId(id),
      });

      if (challenge.createdBy !== userEmail) {
        return res.status(403).send({
          success: false,
          message: "You are not authorized to update this challenge",
        });
      }

      const result = await challengesColl.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updateData, updatedAt: new Date() } }
      );

      res.send({ message: "Challenge updated successfully!" });
    });
    app.delete("/challenges/:id", async (req, res) => {
      const { id } = req.params;
      const { userEmail } = req.body;

      const challenge = await challengesColl.findOne({
        _id: new ObjectId(id),
      });

      if (challenge.createdBy !== userEmail) {
        return res.status(403).send({
          message: "You are not authorized to delete this challenge",
        });
      }

      await challengesColl.deleteOne({ _id: new ObjectId(id) });

      res.send({
        message: "Challenge deleted successfully!",
      });
    });
    app.get("/my-activities", async (req, res) => {
      const { email } = req.query;
      const activities = await userChallengeColl.find({ email }).toArray();

      res.send(activities);
    });
    app.get("/my-activities/:id", async (req, res) => {
      const { id } = req.params;
      const activity = await userChallengeColl.findOne({
        _id: new ObjectId(id),
      });

      const challenge = await challengesColl.findOne({
        _id: new ObjectId(activity.challengeId),
      });

      res.send({ ...activity, challenge });
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);
