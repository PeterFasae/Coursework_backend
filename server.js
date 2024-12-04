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
    const database = client.db('Webstore'); //  Database name
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
app.use('/coursework', staticMiddleware);


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

//inserting customer orders into the database
// app.post('/api/orders', async (req, res) => {
//   try {
//     const order = req.body;
//     console.log('Received order:', order); // Log the incoming order for debugging

//     if (!order.customer || !order.items || !order.total) {
//       console.error('Invalid order data:', order);
//       return res.status(400).json({ success: false, message: 'Invalid order data' });
//     }


//     ordersCollection.insertOne(order);
//     res.json({ success: true, message: 'Order placed successfully' });
//   } catch (error) {
//     console.error('Error saving order:', error);
//     res.status(500).json({ success: false, message: 'Failed to place order' });
//   }
// });

app.post('/api/orders', async (req, res) => {
  try {
    const order = req.body;
    console.log('Received order:', order); // Log the incoming order for debugging

    if (!order.customer || !order.items || !order.total) {
      console.error('Invalid order data:', order);
      return res.status(400).json({ success: false, message: 'Invalid order data' });
    }

    // Start a transaction
    const session = client.startSession();
    session.startTransaction();

    try {
      // Update inventory for each item in the order
      for (const item of order.items) {
        const product = await productsCollection.findOne({ id: item.id }, { session });

        if (!product) {
          throw new Error(`Product with ID ${item.id} not found`);
        }

        if (product.spaces < item.quantity) {
          throw new Error(`Not enough spaces for product ${item.subject}`);
        }

        // Deduct quantity from available spaces
        await productsCollection.updateOne(
          { id: item.id },
          { $inc: { spaces: -item.quantity } },
          { session }
        );
      }

      // Save the order to the orders collection
      await ordersCollection.insertOne(order, { session });

      // Commit the transaction
      await session.commitTransaction();
      res.json({ success: true, message: 'Order placed successfully' });
    } catch (error) {
      await session.abortTransaction(); // Rollback changes if any error occurs
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Error processing order:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to place order' });
  }
});

//updating products in the database

app.put('/api/products/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id); // Parse `id` from the URL as an integer
    const updatedProduct = req.body; // Get the updated product data from the request body

    console.log('Updating product:', productId, updatedProduct); // Log the update request for debugging

    // Validate the update payload
    if (!updatedProduct) {
      console.error('Invalid product update data:', updatedProduct);
      return res.status(400).json({ success: false, message: 'Invalid update data' });
    }

    // Update the product in the database
    const result = await productsCollection.updateOne(
      { id: productId }, // Match the product by `id`
      { $set: updatedProduct } // Update the fields with provided data
    );

    if (result.matchedCount === 0) {
      console.error('Product not found:', productId);
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

// API route to fetch all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await productsCollection.find({}).toArray(); // Fetch all products
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});