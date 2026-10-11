# Project Buttle

Backend REST API for the SW Development Practice Online Job Fair Registration project.

## Current setup

- Node.js and Express
- MongoDB Atlas with Mongoose
- Postman for API testing

## Prerequisites

- Node.js 18 or newer
- npm
- A MongoDB Atlas database and connection string

## Local setup

1. Clone the repository and open its folder:

   ```bash
   git clone https://github.com/Noeyyneo/Project_Buttle.git
   cd Project_Buttle
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create your private environment file:

   ```bash
   cp .env.example .env
   ```

4. Set `MONGODB_URI` and `JWT_SECRET` in `.env` using your own private values.
5. Start the API:

   ```bash
   npm start
   ```

6. Confirm the server is running:

   ```text
   http://localhost:3000/health
   ```

## Joining the shared development database

Complete these steps when joining the project for the first time:

1. Ask a project owner to invite your MongoDB Atlas account to the `Project_Buttle` Atlas project.
2. Ask the owner to add your current IP address in Atlas under **Security** > **Database & Network Access** > **Network Access**.
3. Receive the shared `MONGODB_URI` only through a private channel. Never place it in GitHub, an issue, or a pull-request comment.
4. Copy the environment template and set your local values:

   ```bash
   cp .env.example .env
   ```

   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=the-private-Atlas-connection-string
   JWT_SECRET=your-private-random-secret
   ```

5. Generate a private JWT secret for your own local environment:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

6. Start the server and verify the connection:

   ```bash
   npm start
   ```

   Expected output:

   ```text
   MongoDB connected
   Server is running at http://localhost:3000
   ```

If the database connection fails, first confirm that your current IP address is allowed in Atlas and that your private `MONGODB_URI` is complete.

## Team Git workflow

See [CONTRIBUTING.md](CONTRIBUTING.md) for the complete collaboration and pull-request guide.

Before starting a change, update your local `main` branch:

```bash
git switch main
git pull origin main
```

Create a separate branch for your work:

```bash
git switch -c feature/short-description
```

When your change is ready, commit and push that branch:

```bash
git add .
git commit -m "Add short description"
git push -u origin feature/short-description
```

Open a pull request on GitHub and merge it only after another teammate reviews it. Do not commit directly to `main` after the initial setup.

## Repository rules

- Never commit `.env`, database passwords, JWT secrets, or access tokens.
- Commit `package-lock.json` so teammates use the same dependency versions.
- Use a separate branch for each feature or fix.
- Test API requests in Postman before opening a pull request.

## Project structure

```text
config/       Database connection configuration
models/       Database schemas, added when implementation begins
routes/       REST endpoints, added when implementation begins
middleware/   Authentication and authorization, added when implementation begins
postman/      Exported Postman collections and environments
server.js     Express application entry point
```
