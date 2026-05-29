const mongoose = require('mongoose');

const uri = "mongodb+srv://siriadmin:Balusiri.05@cluster0.odfo3tb.mongodb.net/siri-arts-crafts?retryWrites=true&w=majority&appName=Cluster0";

const options = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 30000,
  heartbeatFrequencyMS: 10000,
  maxIdleTimeMS: 30000,
  waitQueueTimeoutMS: 10000,
  family: 4,
  bufferCommands: false,
  compressors: ['zstd', 'snappy'],
  retryReads: true,
  retryWrites: true,
  serverApi: { version: '1', strict: false, deprecationErrors: true },
};

mongoose.connect(uri, options)
  .then(() => {
    console.log("Connected successfully with options!");
    process.exit(0);
  })
  .catch(err => {
    console.error("Connection error with options:", err);
    process.exit(1);
  });
