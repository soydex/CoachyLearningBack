import 'dotenv/config';
import dbConnect from './lib/db';

// Import models to ensure they are registered with Mongoose
import './models/User';
import './models/Organization';
import './models/Capsule';
import './models/Session';

async function main() {
  try {
    await dbConnect();
    console.log('✅ Connected to MongoDB');

    // Example: Create a sample organization
    // const Organization = mongoose.model('Organization');
    // const org = new Organization({ name: 'Coach y Média' });
    // await org.save();
    // console.log('Organization created:', org);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

if (require.main === module) {
  main();
}

export { dbConnect };