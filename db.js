import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

let db = null;
const mongoClient = new MongoClient(process.env.MONGO_URI);

try {
    await mongoClient.connect();
    db = mongoClient.db(process.env.DATABASE);
    console.log("Connected to mongodb database!")
} catch (error) {
    console.log("Error connecting to database!");
    console.log(error);
}

export default db;