const mongoose = require('mongoose');

async function fixIndex() {
  try {
    // Read the mongo URI from .env if possible, or fallback to the one in .env
    require('dotenv').config();
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/EventDecor'; // adjust DB name if different
    console.log('Connecting to', uri);
    await mongoose.connect(uri);
    console.log('Connected to DB');

    // Get the products collection directly
    const collection = mongoose.connection.collection('products');
    
    // Drop the old text index
    console.log('Dropping old text index: title_text_description_text...');
    await collection.dropIndex('title_text_description_text');
    console.log('Successfully dropped old text index!');
  } catch (err) {
    console.error('Failed to drop index:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

fixIndex();
