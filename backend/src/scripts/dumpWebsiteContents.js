const mongoose = require('mongoose');

async function dumpWebsiteContents() {
  const uri =
    'mongodb+srv://siriadmin:Balusiri.05@cluster0.odfo3tb.mongodb.net/siri-arts-crafts?retryWrites=true&w=majority&appName=Cluster0';
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.client.db('siri-arts-crafts');

    const contents = await db.collection('websitecontents').find({}).toArray();

    const fs = require('fs');
    fs.writeFileSync('websitecontents_dump.json', JSON.stringify(contents, null, 2));
    console.log('Dumped websitecontents to websitecontents_dump.json');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

dumpWebsiteContents();
