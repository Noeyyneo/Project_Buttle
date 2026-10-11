require('dotenv').config();

const express = require('express');
const connectDatabase = require('./config/database');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

async function startServer() {
  try {
    await connectDatabase();

    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error(`Unable to connect to MongoDB: ${error.message}`);
    process.exit(1);
  }
}

startServer();
