const { MongoClient } = require('mongodb');

async function checkAuditLogs() {
  const uri =
    process.env.MONGO_URI ||
    'mongodb+srv://siriadmin:Balusiri.05@cluster0.odfo3tb.mongodb.net/siri-arts-crafts?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    console.log('Checking adminauditlogs for product deletions...');
    const logs = await db
      .collection('adminauditlogs')
      .find({
        $or: [{ path: { $regex: /products/i } }, { method: 'DELETE' }],
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    console.log(`Found ${logs.length} related audit logs.`);
    for (const log of logs) {
      console.log(
        `[${log.createdAt}] ${log.method} ${log.path} (Status: ${log.statusCode}) - Actor: ${log.actorRole}`,
      );
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkAuditLogs();
