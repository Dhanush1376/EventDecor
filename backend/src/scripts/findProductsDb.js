const { MongoClient } = require('mongodb');

async function checkAllDatabasesForProducts() {
  const uri =
    'mongodb+srv://siriadmin:Balusiri.05@cluster0.odfo3tb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected successfully to server');

    const db = client.db().admin();
    const result = await db.listDatabases();

    console.log("Checking all databases for 'products' collection:");

    for (const dbInfo of result.databases) {
      const dbName = dbInfo.name;
      const database = client.db(dbName);

      const collections = await database.listCollections().toArray();
      const hasProducts = collections.some((c) => c.name === 'products');

      if (hasProducts) {
        const count = await database.collection('products').countDocuments();
        console.log(`- Database: ${dbName} -> products count: ${count}`);
      } else {
        console.log(`- Database: ${dbName} -> NO products collection`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkAllDatabasesForProducts();
