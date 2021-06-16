require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Web3 = require("web3");
const { MongoClient, ObjectId } = require('mongodb');

var web3 = new Web3(process.env.RPC_URL);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_URL}/${process.env.DB_NAME}\
?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let collection;

async function run() {
  try {
    console.log("Starting DB connection...");
    await client.connect();
    const db = await client.db("bntestdb");
    collection = db.collection("bntestdb");
    console.log("DB ready!");
  } catch (e) {
    console.log(e);
  }
}

run();

var app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({credentials: true, origin: ["https://watchgod.matic.today", "http://localhost:3000", "http://localhost"]}));

app.get("/", async function (req, res) {
  res.send("Blocknative POC API");
});

app.listen(process.env.PORT || 8080, () => {
  console.log("Server starting on port 8080...")
});
