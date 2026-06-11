const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Product = require('./dist/models/Product').default;

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  console.log('Testing countDocuments...');
  const startCount = performance.now();
  await Product.countDocuments({ isActive: true });
  console.log('countDocuments took', performance.now() - startCount, 'ms');

  console.log('Testing estimatedDocumentCount...');
  const startEst = performance.now();
  await Product.estimatedDocumentCount();
  console.log('estimatedDocumentCount took', performance.now() - startEst, 'ms');

  console.log('Testing find...');
  const startFind = performance.now();
  const explain = await Product.find({ isActive: true })
    .select(
      '-description -seoTitle -seoDescription -customizationConfig -variants -dimensions -weight',
    )
    .sort({ createdAt: -1 })
    .skip(0)
    .limit(12)
    .lean()
    .explain('executionStats');

  console.log('find executionStats:', explain.executionStats.executionTimeMillis, 'ms');
  console.log('Total docs examined:', explain.executionStats.totalDocsExamined);
  console.log('Total keys examined:', explain.executionStats.totalKeysExamined);

  await mongoose.disconnect();
}

run().catch(console.error);
