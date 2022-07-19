require('dotenv').config();
const express = require('express')
const bodyParser = require('body-parser');
const cors = require ('cors');
const admin = require("firebase-admin");
const stripe = require('stripe')(process.env.STRIPE_SECRET)
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;


const port = 5000





const app = express()
app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Hello World!')
})

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eqysd.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    console.log('connection err', err)
    const servicesCollection = client.db("CarRepairCompany").collection("Services");
    const reviewCollection = client.db("CarRepairCompany").collection("Reviews");
    const orderCollection = client.db("CarRepairCompany").collection("Orders");
    const adminCollection = client.db("CarRepairCompany").collection("Admin");
    const usersCollection = client.db("CarRepairCompany").collection("Users");

    app.get('/services',(req,res)=>{
        servicesCollection.find()
        .toArray((err, service)=>{
            res.send(service)
           
        })
    })
    app.post('/addService',(req,res)=>{
        const newService = req.body;
        servicesCollection.insertOne(newService)
        .then(result=>{
        })
        
    })

    app.delete('/deleteService/:id',(req,res)=>{
        const id = ObjectId(req.params.id);
        const result = servicesCollection.findOneAndDelete({_id: id})
        res.send(result);
        // .then(document=> res.send(document.value))

    })
    app.post('/postReviews',(req,res)=>{
        const reviews = req.body;
        reviewCollection.insertOne(reviews)
        .then(result=>{
            console.log('add successfully', result);
        })
        
    })
    app.get('/reviews',(req,res)=>{
        reviewCollection.find()
        .toArray((err, review)=>{
            res.send(review)
        })
    })

    app.post('/orderService',(req,res)=>{
        const newOrder = req.body;
        orderCollection.insertOne(newOrder)
        .then(result=>{
            console.log(result)
        })
        
    })

    app.get('/order',(req,res)=>{
        orderCollection.find({email:req.query.email})
        .toArray((err, order)=>{
            res.send(order)
        })
    })
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



    app.post('/addAdmin',(req,res)=>{
        const admin = req.body;
        adminCollection.insertOne(admin)
        .then(result=>{
            console.log(result)
        })
        
    })
    app.post('/isAdmin',(req,res)=>{
        const email = req.body.email;
        console.log(email)
        adminCollection.find({email:email})
        .toArray((err,documents)=>{
          res.send(documents.length > 0)
        })
    })





// usres

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
  
  app.put('/users/admin', async (req, res) => {
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





    
});


app.listen(process.env.PORT || port)