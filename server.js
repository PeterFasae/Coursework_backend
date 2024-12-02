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