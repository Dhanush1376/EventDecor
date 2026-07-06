const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(
    'mongodb+srv://siriadmin:Balusiri.05@cluster0.odfo3tb.mongodb.net/siri-arts-crafts?retryWrites=true&w=majority&appName=Cluster0',
  );

  const productSchema = new mongoose.Schema({}, { strict: false });
  const Product = mongoose.model('Product', productSchema, 'products');

  const latestProduct = await Product.findOne().sort({ createdAt: -1 }).lean();
  console.log(JSON.stringify(latestProduct, null, 2));

  mongoose.disconnect();
}

run();
