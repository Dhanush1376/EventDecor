const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const uri = process.env.MONGO_URI;

if (!uri) {
  console.log('No MONGO_URI');
  process.exit(1);
}

mongoose
  .connect(uri)
  .then(async () => {
    // 1. Update first review (6a176b5bbc30fd475eb42440) - set customerName to 'Radha Krishnan'
    const res1 = await mongoose.connection
      .collection('reviews')
      .updateOne(
        { _id: new mongoose.Types.ObjectId('6a176b5bbc30fd475eb42440') },
        { $set: { customerName: 'Radha Krishnan' } },
      );
    console.log('Updated first review:', res1);

    // 2. Update second review (6a2a9cc6e68be283b24cc1bb) - set customerName to 'Test'
    const res2 = await mongoose.connection
      .collection('reviews')
      .updateOne(
        { _id: new mongoose.Types.ObjectId('6a2a9cc6e68be283b24cc1bb') },
        { $set: { customerName: 'Test' } },
      );
    console.log('Updated second review:', res2);

    // 3. Update third review (6a2ad5ec701e55d85e7528ef) - set customerName to 'Sirisha Atmakuri'
    const res3 = await mongoose.connection
      .collection('reviews')
      .updateOne(
        { _id: new mongoose.Types.ObjectId('6a2ad5ec701e55d85e7528ef') },
        { $set: { customerName: 'Sirisha Atmakuri' } },
      );
    console.log('Updated third review:', res3);

    process.exit();
  })
  .catch(console.error);
