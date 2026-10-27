require('dotenv').config();

const express = require('express');
const dotenv = require('dotenv');
const connectDatabase = require('./config/database');

//Load env vars
dotenv.config({path: './.env'})

//Route files
const auth = require('./routes/auth');
const companies = require('./routes/companies');
const interviewSessions = require('./routes/interviewSessions');
const cookieParser = require('cookie-parser');

const app = express();


//Body parser
app.use(express.json());

//Query parser
app.set('query parser', 'extended');

//Cookie parser
app.use(cookieParser());

//Mount routers
app.use('/api/v1/auth', auth);
app.use('/api/v1/companies', companies);
app.use('/api/v1/interviewSessions', interviewSessions);

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(`Unable to connect to MongoDB: ${error.message}`);
    process.exit(1);
  }
}

startServer();
