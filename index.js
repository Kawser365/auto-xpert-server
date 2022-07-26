require('dotenv').config();
const express = require('express')
const bodyParser = require('body-parser');
const cors = require ('cors');
const admin = require("firebase-admin");
const stripe = require('stripe')(process.env.STRIPE_SECRET)
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;



const port = process.env.PORT || 5000;


const app = express()
app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Hello World!')
})



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eqysd.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})



async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }

    }
    next();
}




async function run() {

try{

        await client.connect();
        const servicesCollection = client.db("CarRepairCompany").collection("Services");
        const reviewCollection = client.db("CarRepairCompany").collection("Reviews");
        const orderCollection = client.db("CarRepairCompany").collection("Orders");
        const adminCollection = client.db("CarRepairCompany").collection("Admin");
        const usersCollection = client.db("CarRepairCompany").collection("Users");
        console.log('database connection successfully')


        app.get('/services', async (req,res)=>{
           const cursor = servicesCollection.find()
           const result = await cursor.toArray();
           res.json(result)
        })
        app.post('/addService', async (req,res)=>{
            const newService = req.body;
            const result  = await servicesCollection.insertOne(newService)
            res.json(result)
            
        })
    
        app.delete('/deleteService/:id', async (req,res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await servicesCollection.deleteOne(query)
            console.log(result)
            res.send(result);
    
        })
        app.post('/postReviews', async (req,res)=>{
            const reviews = req.body;
            const result = await reviewCollection.insertOne(reviews)
            res.json(result)
            
        })
        app.get('/reviews' , async (req,res)=>{
            const cursor = reviewCollection.find()
           const result = await cursor.toArray();
           res.json(result)
        })
    
        app.post('/orderService', async (req,res)=>{
            const newOrder = req.body;
            const result = await orderCollection.insertOne(newOrder)
            res.json(result)
            
        })
    

        app.get('/order', async (req, res) => {
            let query = {};
            const email = req.query.email;
            if(email){
             query = { email: email };
            }
                const cursor = orderCollection.find(query);
                const orders = await cursor.toArray();
                res.json(orders);
      
        });


        app.get('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(query);
            res.json(result);
        })
    
    
        app.put('/order/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    payment: payment
                }
            };
            const result = await orderCollection.updateOne(filter, updateDoc);
            res.json(result);
        });
    
    
    
    // usres
    

      
      app.post('/users', async (req, res) => {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        console.log(result);
        res.json(result);
      });

      
      app.put('/users', async (req, res) => {
        const user = req.body;
        const filter = { email: user.email };
        const options = { upsert: true };
        const updateDoc = { $set: user };
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        res.json(result);
      });

      
      app.get('/users/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        let isAdmin = false;
        if (user?.role === 'admin') {
            isAdmin = true;
        }
        res.json({ admin: isAdmin });
      })
      
      app.put('/users/admin', verifyToken, async (req, res) => {
        const user = req.body;
        const requester = req.decodedEmail;
        if (requester) {
            const requesterAccount = await usersCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: user.email };
                const updateDoc = { $set: { role: 'admin' } };
                const result = await usersCollection.updateOne(filter, updateDoc);
                res.json(result);
            }
        }
        else {
            res.status(403).json({ message: 'you do not have access to make admin' })
        }
      
      })
    
    // payment intent
    
    
    app.post('/create-payment-intent', async (req, res) => {
        const price = req?.body?.price
        console.log(price)
        const amount = price * 100
        if (amount > 999999) {
            return res.status(500).send({ message: 'Your price is too high' })
        }
        if(price){
          const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: "usd",
            payment_method_types: [
                "card"
            ],
        });
        res.send({
          clientSecret: paymentIntent.client_secret,
      });
        }
        
      
        
      
      })



}
finally{

}


}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Autoxpert server is running');
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
  })
