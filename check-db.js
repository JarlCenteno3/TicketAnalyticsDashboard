// check-db.js
// Note: This script uses require for .ts files and may need 'ts-node' if they are complex.
// For now, we assume simple exports that 'require' can handle.

const mongoose = require('mongoose');

// Manually define connection and model to avoid TypeScript compilation issues.
const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'ticketing_analytics';
const COLLECTION_NAME = 'tickets';

const ticketSchema = new mongoose.Schema({
    Ticket: String,
    Status: String,
    Priority: String,
    Created: Date,
    SnapshotDate: Date,
}, { strict: false });

// Try to get existing model, otherwise create it.
const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema, COLLECTION_NAME);

async function checkDatabase() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    console.log('Connected successfully.');

    console.log('\nFetching up to 5 random tickets from the collection...');
    const ticketCount = await Ticket.countDocuments();
    
    if (ticketCount === 0) {
        console.log('The "tickets" collection is empty.');
    } else {
        const tickets = await Ticket.aggregate([ { $sample: { size: 5 } } ]);
        console.log(`Found ${ticketCount} total tickets. Showing up to 5 random samples:`)
        console.log('---------------------------------');
        tickets.forEach(ticket => {
            console.log({
                Ticket: ticket.Ticket,
                Status: ticket.Status,
                Created: ticket.Created,
                SnapshotDate: ticket.SnapshotDate,
            });
            console.log('---------------------------------');
        });
    }

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\nDatabase connection closed.');
    }
  }
}

checkDatabase();
