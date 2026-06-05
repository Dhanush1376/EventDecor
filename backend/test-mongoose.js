const mongoose = require('mongoose');
async function run() {
  await mongoose.connect('mongodb://localhost:27017/test');
  const Model = mongoose.model('Test', new mongoose.Schema({ name: String }));
  await Model.findOneAndUpdate({}, { name: 'test' }, { new: true });
  console.log('Done');
  process.exit(0);
}
run();
