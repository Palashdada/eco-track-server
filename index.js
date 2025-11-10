const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
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
