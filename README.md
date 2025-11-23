# Ticket Analytics Dashboard

This is a [Next.js](https://nextjs.org) project that provides a dashboard for analyzing ticket data.

## Features

*   **Interactive Dashboard:** Visualize ticket trends, priorities, and status.
*   **Data Migration:** Easily import ticket data from CSV files.
*   **MongoDB Backend:** Uses MongoDB for storing and querying ticket data.

## Prerequisites

Before you begin, ensure you have the following installed:

*   [Node.js](https://nodejs.org/en/) (v20 or later)
*   [npm](https://www.npmjs.com/)
*   [MongoDB](https://www.mongodb.com/try/download/community)

## Getting Started

### 1. Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/your-username/ticket-analytics-dashboard.git
cd ticket-analytics-dashboard
npm install
```

### 2. Database Setup

1.  **Start your MongoDB server.** Make sure your MongoDB instance is running on `mongodb://localhost:27017`.

2.  **Run the migration script.** This will populate the database with the data from the `ticketCorpus` directory:

    ```bash
    npm run migrate
    ```

3.  **Set the environment variable.** Create a `.env.local` file in the root of the project and add the following line:

    ```
    MONGODB_URI=mongodb://localhost:27017
    ```

### 3. Running the Application

Once the database is set up, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

*   `.next/`: Next.js build output
*   `public/`: Static assets
*   `src/`: Application source code
    *   `app/`: Next.js App Router
        *   `api/`: API routes
        *   `components/`: React components
        *   `layout.tsx`: Root layout
        *   `page.tsx`: Main page
    *   `lib/`: Library files (e.g., `dbConnect.ts`)
    *   `models/`: Mongoose models
*   `ticketCorpus/`: CSV files for data migration
*   `check-db.js`: A script to check the database connection
*   `migration-script.js`: The script to migrate data from CSV files to MongoDB
*   `next.config.ts`: Next.js configuration
*   `package.json`: Project dependencies and scripts

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.