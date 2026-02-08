const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const dropIndex = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        const db = mongoose.connection.db;
        const collection = db.collection('users');

        // Check if index exists
        const indexes = await collection.indexes();
        console.log('Current Indexes:', indexes);

        const indexExists = indexes.some(idx => idx.name === 'username_1');

        if (indexExists) {
            await collection.dropIndex('username_1');
            console.log('Index "username_1" dropped successfully.');
        } else {
            console.log('Index "username_1" not found.');
        }

        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

dropIndex();
