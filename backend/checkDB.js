const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://siriadmin:Balusiri.05@cluster0.odfo3tb.mongodb.net/siri-arts-crafts?retryWrites=true&w=majority&appName=Cluster0')
  .then(async () => {
    console.log('Products:', await mongoose.connection.db.collection('products').countDocuments());
    console.log('Users:', await mongoose.connection.db.collection('users').countDocuments());
    console.log('Admins:', await mongoose.connection.db.collection('users').countDocuments({ role: { $in: ['admin', 'super_admin', 'main_admin'] } }));
    process.exit(0);
  })
  .catch(console.error);
