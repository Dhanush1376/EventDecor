const dotenv = require('dotenv');
const dns = require('dns');
const net = require('net');
const mongoose = require('mongoose');

// 1. Check Env Loading
console.log('--- 1. Environment Loading ---');
dotenv.config({ path: '.env.local' });
dotenv.config();

const mongoUri = process.env.MONGO_URI || '';
if (!mongoUri) {
  console.log('❌ MONGO_URI is not set!');
  process.exit(1);
}

// Redact password
const redactedUri = mongoUri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/, '$1***$3');
console.log(`✅ Loaded MONGODB_URI: ${redactedUri}`);
console.log(`✅ REQUIRE_REDIS: ${process.env.REQUIRE_REDIS}`);

// 2. Extract Hostname
const match = mongoUri.match(/@([^/?]+)/);
if (!match) {
  console.log('❌ Could not parse hostname from MONGO_URI');
  process.exit(1);
}
const hostname = match[1];
console.log(`\n--- 2. DNS Resolution ---`);
console.log(`Looking up SRV records for: _mongodb._tcp.${hostname}`);

dns.resolveSrv(`_mongodb._tcp.${hostname}`, (err, addresses) => {
  if (err) {
    console.error(`❌ DNS SRV Resolution Failed:`, err.message);
    if (err.code === 'ETIMEOUT' || err.code === 'ESERVFAIL') {
      console.log(
        '   -> exact failing step: DNS resolution. Your network or ISP is dropping the DNS query for MongoDB Atlas.',
      );
    }
    process.exit(1);
  }

  console.log(`✅ DNS SRV Resolution Succeeded. Found ${addresses.length} records.`);
  addresses.forEach((addr) => console.log(`   - ${addr.name}:${addr.port}`));

  // 3. TCP Connectivity
  console.log(`\n--- 3. TCP Reachability ---`);
  const target = addresses[0];
  console.log(`Attempting TCP connection to ${target.name}:${target.port}...`);

  const socket = new net.Socket();
  const timeoutMs = 5000;
  socket.setTimeout(timeoutMs);

  socket.on('connect', () => {
    console.log(`✅ TCP Connection Succeeded to ${target.name}:${target.port}`);
    socket.destroy();

    // 4. Mongoose Authentication
    console.log(`\n--- 4. MongoDB Authentication & IP Whitelist ---`);
    console.log(`Connecting via mongoose...`);

    mongoose
      .connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
      .then(() => {
        console.log(`✅ MongoDB Connection & Authentication Succeeded!`);
        mongoose.disconnect();
        process.exit(0);
      })
      .catch((err) => {
        console.error(`❌ MongoDB Connection Failed:`, err.message);
        if (err.message.includes('bad auth')) {
          console.log('   -> exact failing step: Atlas authentication (bad credentials).');
        } else if (
          err.message.includes("IP that isn't whitelisted") ||
          err.message.includes('ECONNREFUSED')
        ) {
          console.log('   -> exact failing step: IP whitelist. Your IP is blocked by Atlas.');
        } else {
          console.log('   -> exact failing step: Connection/Timeout during MongoDB handshake.');
        }
        process.exit(1);
      });
  });

  socket.on('timeout', () => {
    console.error(`❌ TCP Connection Timed out after ${timeoutMs}ms.`);
    console.log('   -> exact failing step: TCP connection. A firewall might be blocking the port.');
    socket.destroy();
    process.exit(1);
  });

  socket.on('error', (err) => {
    console.error(`❌ TCP Connection Failed:`, err.message);
    console.log('   -> exact failing step: TCP connection error.');
    process.exit(1);
  });

  socket.connect(target.port, target.name);
});
