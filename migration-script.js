const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');


// --- Configuration ---
const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'ticketing_analytics';
const COLLECTION_NAME = 'tickets';
// Use path.join with __dirname to make the path absolute and reliable
const TICKET_CORPUS_PATH = path.join(__dirname, 'ticketCorpus');
// ---------------------

console.log(`Debug Info:`);
console.log(`  - __dirname: ${__dirname}`);
console.log(`  - Current Dir: ${process.cwd()}`);
console.log(`  - Corpus Path: ${TICKET_CORPUS_PATH}`);
console.log(`------------------------------------`);

const ticketSchema = new mongoose.Schema({
    Ticket: String,
    Status: String,
    Priority: String,
    Created: Date,
    SnapshotDate: Date,
}, { strict: false });

const Ticket = mongoose.model('Ticket', ticketSchema, COLLECTION_NAME);

function parseCustomDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.toLowerCase() === 'nan') return null;
    const monthMap = { 'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11 };
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = monthMap[parts[1].toLowerCase()];
    const year = parseInt(parts[2], 10) + 2000;
    if (isNaN(day) || month === undefined || isNaN(year)) return null;
    return new Date(Date.UTC(year, month, day));
}

async function migrate() {
    try {
        await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
        console.log('Connected to MongoDB.');
        await mongoose.connection.db.collection(COLLECTION_NAME).drop().catch(err => {
            if (err.codeName !== 'NamespaceNotFound') throw err;
        });
        console.log('Dropped existing collection.');

        console.log(`Searching for CSV files in: ${TICKET_CORPUS_PATH}`);
        const allFiles = fs.readdirSync(TICKET_CORPUS_PATH);
        console.log('--- All files found in directory ---');
        console.log(allFiles);
        console.log('------------------------------------');
        const csvFiles = allFiles.filter(file => path.extname(file).toLowerCase() === '.csv').map(file => path.join(TICKET_CORPUS_PATH, file));
        console.log(`Found ${csvFiles.length} CSV files.`);

        for (const file of csvFiles) {
            const basename = path.basename(file);
            const dateMatch = basename.match(/(\d{4}-\d{2}-\d{2})/);
            let snapshotDate;

            if (dateMatch) {
                snapshotDate = new Date(dateMatch[1]);
            }

            // If the date from the filename is invalid or not found, use the file's modification date as a fallback.
            if (!snapshotDate || isNaN(snapshotDate.getTime())) {
                const stats = fs.statSync(file);
                snapshotDate = stats.mtime;
                console.warn(`\n[!] Could not parse date from filename for "${basename}". Using file modification date as SnapshotDate: ${snapshotDate.toISOString()}`);
            }

            console.log(`\nProcessing ${basename} with SnapshotDate: ${snapshotDate.toISOString()}`);

            const parser = fs.createReadStream(file).pipe(parse({ columns: true, trim: true, skip_empty_lines: true }));
            const documents = [];
            for await (const record of parser) {
                documents.push({ ...record, Created: parseCustomDate(record.Created), SnapshotDate: snapshotDate });
            }
            if (documents.length > 0) {
                await Ticket.insertMany(documents);
                console.log(`Inserted ${documents.length} documents from ${basename}.`);
            }
        }
        console.log('\nMigration completed!');
    } finally {
        await mongoose.connection.close();
    }
}

migrate().catch(console.error);
