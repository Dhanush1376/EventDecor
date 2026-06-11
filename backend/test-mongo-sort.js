const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Product = require('./dist/src/models/Product.js').default;

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const explain = await Product.find({ isActive: true })
    .select(
      '-description -seoTitle -seoDescription -customizationConfig -variants -dimensions -weight',
    )
    .sort({ createdAt: -1 })
    .skip(0)
    .limit(12)
    .lean()
    .explain('executionStats');

  console.log('Query execution plan:');
  console.log('winningPlan:', JSON.stringify(explain.queryPlanner.winningPlan, null, 2));
  console.log('totalDocsExamined:', explain.executionStats.totalDocsExamined);
  console.log('executionTimeMillis:', explain.executionStats.executionTimeMillis);

  await mongoose.disconnect();
}

run().catch(console.error);
