# Ticket Analytics Dashboard

This project is a web application for visualizing ticket data. It's built with Next.js and uses MongoDB for the database.

## Features

*   **Dashboard:** Visualizes ticket trends, priorities, and statuses.
*   **Data Migration:** Includes a script to migrate data from CSV files into the database.
*   **Database:** Uses MongoDB to store ticket data.

## Prerequisites

*   [Node.js](https://nodejs.org/en/) (v20 or later)
*   [npm](https://www.npmjs.com/)
*   [MongoDB](https://www.mongodb.com/try/download/community)

## Getting Started

Follow these steps to get the project running locally.

### 1. Installation

Clone the repository and install the dependencies.

```bash
git clone https://github.com/your-username/ticket-analytics-dashboard.git
cd ticket-analytics-dashboard
npm install
```

### 2. Database Setup

1.  Ensure your MongoDB server is running. The default connection string is `mongodb://localhost:27017`.

2.  Run the migration script to import ticket data from the `ticketCorpus` directory into your database.

    ```bash
    npm run migrate
    ```

3.  Create a `.env.local` file in the root of the project and add your MongoDB connection string:

    ```
    MONGODB_URI=mongodb://localhost:27017
    ```

### 3. Run the Application

Start the development server.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the dashboard.

## Project Structure

*   `src/`: Main application code.
    *   `app/`: Pages and components.
    *   `lib/`: Utility functions, including the database connection.
    *   `models/`: Mongoose model for the `Ticket` schema.
*   `ticketCorpus/`: Sample CSV ticket data.
*   `migration-script.js`: Script for data migration.
*   `package.json`: Project dependencies and scripts.
