import dotenv from 'dotenv';

// Load env before importing DB configs
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db';
import Product from '../models/Product';

async function run() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected.');

    const products = await Product.find({
      $or: [{ name: /Floral/i }, { title: /Floral/i }, { description: /Floral/i }],
    }).lean();

    console.log('Found products matching Floral:', JSON.stringify(products, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed.');
  }
}

run();
