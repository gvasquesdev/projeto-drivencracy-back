import express, { json } from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

dotenv.config();

const app = express();
app.use(json()); 
app.use(cors());

// Conexão do banco de dados

let db = null;
const mongoClient = new MongoClient(process.env.MONGO_URI);
const promise = mongoClient.connect();
promise.then(() => {
    db = mongoClient.db(process.env.DATABASE);
    console.log("Conexão com o banco de dados estabelecida!")
});
promise.catch((e) => console.log("Erro ao se conectar ao banco de dados", e));

//

const pollSchema = joi.object({
    title: joi.string().required(),
    expireAt: joi.string()
});

const choiceSchema = joi.object({
    title: joi.string().required(),
    pollId: joi.string().required()
})

// post /poll

app.post("/poll", async (req,res) => {
    let {title, expireAt} = req.body;
    const validation = pollSchema.validate(req.body);
    if(validation.error){
        res.status(422).send("Ih, deu xabu. Tente novamente");
    }
    if (!expireAt || expireAt.length === 0){
        expireAt = (dayjs().add(30, 'day').format("YYYY-MM-DD HH:mm"))
    }

    try{
        await db.collection("poll").insertOne({title: title, expireAt: expireAt })
        res.sendStatus(201);
    }catch(error){
        res.send(error);
    }
});

// get /poll

app.get("/poll", async (req,res) => {
    try {
        const poll = await db.collection("poll").find().toArray();
        res.status(200).send(poll)
    } catch (error) {
        res.status(500).send(error);
    } 
})

// post /choice

app.post("/choice", async (req,res) => {
    const { error } = choiceSchema.validate(req.body); 
    const {title, pollId} = req.body;
    if(error){
        res.status(422).send("Ih, deu xabu. Tente novamente");
    }
    
    try{
        const poll = await db.collection("poll").findOne({ _id: new ObjectId(pollId) });
        console.log(poll)
         if (!poll) {
             return res.status(404).send("Essa enquete não existe")
         }
         
         if(poll){
             const choice = await db.collection("choice").findOne({title: title});
             if(choice){
                 return res.sendStatus(409)
             }
             if (!dayjs().isBefore(dayjs(poll.expireAt))){
                 return res.status(403).send("Enquete encerrada")
             }
         }
 
         const voteChoice = {
            title: title,
            pollId: pollId,
            votes:0
        }

        await db.collection("choice").insertOne(voteChoice)
        return res.sendStatus(201)
        
    }catch(error){
        res.send(error)
    } 
});

//get choice

app.get("poll/:id/choice", async (req,res) => {
    try{
        const choice = await db.collection("choice").find({pollId:req.params.id}).toArray();
        if(choice.length===0){return res.status(404).send("Enquete não existe")}
        return res.send(choice)
    }catch(error){
        res.send(404)
        res.send(error)
        return;
    }
});

// post vote

app.post("poll/:id/vote", async (req,res) => {
    const choiceId = req.params.id
    try{
        const choice = await db.collection("choices").findOne({ _id: new ObjectId(choiceId)});
        console.log(choice)
        if(!choice){
            return res.status(404).send("Opção não encontrada")
        }

        const poll = await db.collection("poll").findOne({_id: new ObjectId(choice.pollId)})
        if (!dayjs().isBefore(dayjs(poll.expireAt))){
            return res.status(403).send("Enquete já encerrada")
        }

        await db.collection("choice").updateOne(choice, {$inc:{votes: 1}})
        return res.sendStatus(201)

    }catch(error){
        console.log(error)
        return res.send(error)
    }
})


// get result

app.get("poll/:id/result", async (req,res) => {
    const pollId = req.params.id
    try{
        const poll = await db.collection("polls").findOne({_id: new ObjectId(pollId)})
        if(!poll){return res.status(404).send("Enquete não existe")}

        const choices = await db.collection("choices").find({pollId: pollId}). toArray();
        if(!choices){return res.send("Erro ao buscar as alternativas")}

        const result = {
            poll: poll,
            choices: choices
        }

        res.status(200).send(result)

    }catch(error){
        return res.send(error)
    }
}) 


const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Running on PORT ${port}.`);
});