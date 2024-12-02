const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const fs = require('fs');
const { MongoClient } = require('mongodb');


const app = express();

// MongoDB Atlas connection
const MONGO_URI = 'mongodb+srv://peter_f:ayomide%402324@backend-cluster.4v1jr.mongodb.net/'; //  MongoDB Atlas URI
const client = new MongoClient(MONGO_URI);

let productsCollection;
let ordersCollection;

// Connect to MongoDB Atlas
(async () => {
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    const database = client.db('webstore'); //  Database name
    productsCollection = database.collection('products'); //  collection name
    ordersCollection = database.collection('orders'); //  collection name
  } catch (err) {
    console.error('Error connecting to MongoDB Atlas:', err);
  }
})();

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(morgan("short"));

const staticMiddleware = express.static(path.join(__dirname, '../coursework/dist'));

// Use a middleware to log errors if static files cannot be served
app.use((req, res, next) => {
  staticMiddleware(req, res, (err) => {
    if (err) {
      console.error(`Error serving static file: ${err.message}`);
      res.status(500).send('Internal Server Error while serving static files.');
    } else {
      next();
    }
  });
});