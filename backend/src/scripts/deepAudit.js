const { MongoClient } = require('mongodb');
const fs = require('fs');

async function deepAudit() {
  const uri =
    process.env.MONGO_URI ||
    'mongodb+srv://siriadmin:Balusiri.05@cluster0.odfo3tb.mongodb.net/siri-arts-crafts?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  let report = '=== DEEP AUDIT REPORT ===\n';

  try {
    await client.connect();
    const db = client.db();
    report += `Connected to Database: ${db.databaseName}\n`;

    const collections = await db.listCollections().toArray();
    report += '\n--- COLLECTION COUNTS ---\n';

    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      report += `${col.name}: ${count}\n`;
    }

    report += '\n--- SEARCHING FOR PRODUCT-LIKE DATA ---\n';
    const targetCollections = [
      'products',
      'product',
      'inventory',
      'items',
      'catalog',
      'listings',
      'shop_products',
      'product_catalog',
      'archived_products',
      'galleries',
      'contentsections',
      'websitecontents',
      'showcasecollections',
    ];

    for (const col of collections) {
      if (
        targetCollections.includes(col.name) ||
        col.name.includes('product') ||
        col.name.includes('item')
      ) {
        const count = await db.collection(col.name).countDocuments();
        report += `\nInspecting '${col.name}' (count: ${count}):\n`;
        if (count > 0) {
          const sample = await db.collection(col.name).find().limit(2).toArray();
          report += JSON.stringify(sample, null, 2) + '\n';
        }
      }
    }

    fs.writeFileSync('deep_audit_report.txt', report);
    console.log('Audit complete. Report written to deep_audit_report.txt');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

deepAudit();
