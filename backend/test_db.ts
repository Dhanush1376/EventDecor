import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/Product';

dotenv.config();

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(async () => {
    const products = await Product.find({ title: /ganesh/i });
    products.forEach((p) => console.log(JSON.stringify(p, null, 2)));
    mongoose.disconnect();
  })
  .catch(console.error);
