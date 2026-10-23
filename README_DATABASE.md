# Project Buttle Database Design

This document describes the proposed MongoDB database structure for the Online Job Fair Registration API. It covers the original project requirements and the seven additional requirements for company representatives, interview sessions, candidate check-in, and booking status management.

The project uses MongoDB Atlas with Mongoose. The database consists of four main collections:

- `users`
- `companies`
- `interviewSessions`
- `interviewBookings`

## Collection Relationships

```text
companies 1 -------- many users (representatives)
companies 1 -------- many interviewSessions
users 1 ------------ many interviewBookings
interviewSessions 1  many interviewBookings
```

- A representative belongs to one company.
- A company can have multiple representatives and interview sessions.
- A registered user may book no more than three interview sessions.
- Each booking belongs to one registered user and one interview session.

## 1. Users Collection

Collection name: `users`

This collection stores registered users, company representatives, and administrators.

| Field | Mongoose type | Required | Description |
| --- | --- | --- | --- |
| `_id` | `ObjectId` | Automatic | Unique account identifier |
| `name` | `String` | Yes | Account holder's full name |
| `telephone` | `String` | Yes | Telephone number stored as text |
| `email` | `String` | Yes | Login email; unique and stored in lowercase |
| `passwordHash` | `String` | Yes | Password hashed with bcrypt; never store the original password |
| `role` | `String` | Yes | `user`, `representative`, or `admin`; defaults to `user` |
| `companyId` | `ObjectId` | Representative only | Representative's company; references `companies` |
| `approvalStatus` | `String` | Representative only | `pending`, `approved`, or `rejected`; representative accounts start as `pending` |
| `reviewedAt` | `Date` | No | Date and time the representative's registration was approved or rejected |
| `rejectionReason` | `String` | No | Optional reason for rejecting a representative account |
| `createdAt` | `Date` | Automatic | Date and time the account was created |
| `updatedAt` | `Date` | Automatic | Date and time the account was last updated |

Validation rules:

- `companyId` and `approvalStatus` are required when `role` is `representative`.
- Normal users and administrators should not have a `companyId`.

Recommended indexes:

```javascript
{ email: 1 } // unique
{ role: 1, approvalStatus: 1 }
{ companyId: 1, role: 1 }
```

Example registered user:

```json
{
  "_id": "ObjectId('...')",
  "name": "Example User",
  "telephone": "+66XXXXXXXXX",
  "email": "user@example.com",
  "passwordHash": "$2b$12$...",
  "role": "user",
  "createdAt": "2022-04-01T00:00:00.000Z",
  "updatedAt": "2022-04-01T00:00:00.000Z"
}
```

Example company representative:

```json
{
  "_id": "ObjectId('...')",
  "name": "Example Representative",
  "telephone": "+66XXXXXXXXX",
  "email": "representative@example.com",
  "passwordHash": "$2b$12$...",
  "role": "representative",
  "companyId": "ObjectId('...')",
  "approvalStatus": "pending",
  "createdAt": "2022-04-01T00:00:00.000Z",
  "updatedAt": "2022-04-01T00:00:00.000Z"
}
```

## 2. Companies Collection

Collection name: `companies`

| Field | Mongoose type | Required | Description |
| --- | --- | --- | --- |
| `_id` | `ObjectId` | Automatic | Unique company identifier |
| `name` | `String` | Yes | Company name; must be unique |
| `address` | `String` | Yes | Company address |
| `website` | `String` | Yes | Company website URL |
| `description` | `String` | Yes | Description of the company |
| `telephone` | `String` | Yes | Company telephone number |
| `createdAt` | `Date` | Automatic | Date and time the company was created |
| `updatedAt` | `Date` | Automatic | Date and time the company was last updated |

Recommended index:

```javascript
{ name: 1 } // unique
```

Example document:

```json
{
  "_id": "ObjectId('...')",
  "name": "Example Company",
  "address": "Bangkok, Thailand",
  "website": "https://example.com",
  "description": "A software development company.",
  "telephone": "+66XXXXXXXXX",
  "createdAt": "2022-04-01T00:00:00.000Z",
  "updatedAt": "2022-04-01T00:00:00.000Z"
}
```

## 3. Interview Sessions Collection

Collection name: `interviewSessions`

Approved representatives can create, view, edit, and delete sessions belonging to their own company.

| Field | Mongoose type | Required | Description |
| --- | --- | --- | --- |
| `_id` | `ObjectId` | Automatic | Unique interview-session identifier |
| `companyId` | `ObjectId` | Yes | Company that owns the session; references `companies` |
| `startAt` | `Date` | Yes | Session starting date and time |
| `endAt` | `Date` | Yes | Session ending date and time |
| `capacity` | `Number` | Yes | Maximum participant capacity; must be a positive integer |
| `createdAt` | `Date` | Automatic | Date and time the session was created |
| `updatedAt` | `Date` | Automatic | Date and time the session was last updated |

Recommended indexes:

```javascript
{ companyId: 1, startAt: 1 }
```

Example document:

```json
{
  "_id": "ObjectId('...')",
  "companyId": "ObjectId('...')",
  "startAt": "2022-05-10T09:00:00.000Z",
  "endAt": "2022-05-10T09:30:00.000Z",
  "capacity": 10,
  "createdAt": "2022-04-01T00:00:00.000Z",
  "updatedAt": "2022-04-01T00:00:00.000Z"
}
```

Session validation rules:

- `startAt` and `endAt` must fall within May 10-13, 2022.
- `endAt` must be later than `startAt`.
- Sessions belonging to the same company must not overlap.

## 4. Interview Bookings Collection

Collection name: `interviewBookings`

| Field | Mongoose type | Required | Description |
| --- | --- | --- | --- |
| `_id` | `ObjectId` | Automatic | Unique booking identifier |
| `userId` | `ObjectId` | Yes | Registered user or candidate; references `users` |
| `sessionId` | `ObjectId` | Yes | Booked interview session; references `interviewSessions` |
| `status` | `String` | Yes | `booked`, `checked_in`, `completed`, `cancelled`, or `no_show`; defaults to `booked` |
| `checkedInAt` | `Date` | No | Date and time the registered user checked in |
| `createdAt` | `Date` | Automatic | Date and time the booking was created |
| `updatedAt` | `Date` | Automatic | Date and time the booking was last updated |

Recommended indexes:

```javascript
{ userId: 1, sessionId: 1 } // unique
{ sessionId: 1, status: 1 }
{ userId: 1, status: 1 }
```

Example document:

```json
{
  "_id": "ObjectId('...')",
  "userId": "ObjectId('...')",
  "sessionId": "ObjectId('...')",
  "status": "booked",
  "createdAt": "2022-04-01T00:00:00.000Z",
  "updatedAt": "2022-04-01T00:00:00.000Z"
}
```

Candidate information should be retrieved by joining bookings with `users`. A separate `candidates` collection is not required.

## Event-Date Configuration

The project requirements specify May 10-13, 2022 as the interview period. The application may keep these dates in environment variables so validation is centralized and testable, but the configured values for this project must remain the required 2022 dates.

```env
EVENT_START_DATE=2022-05-10
EVENT_END_DATE=2022-05-13
```

The actual values belong in the private `.env` file. If these variable names are added to `.env.example`, use placeholder or non-secret requirement values only.

## Additional-Requirement Coverage

| Requirement | Database support |
| --- | --- |
| AR1: Representative registration | `users.role`, `users.companyId`, and `users.approvalStatus` |
| AR2: Admin approval or rejection | `approvalStatus`, `reviewedAt`, and `rejectionReason` |
| AR3: Representative CRUD for own-company sessions | `interviewSessions.companyId` |
| AR4: Session time, date, overlap, and capacity validation | `startAt`, `endAt`, and `capacity`; overlap is validated in the application |
| AR5: Representative views own-company candidates | Join `interviewBookings` to `interviewSessions` and `users`, restricted by `companyId` |
| AR6: User check-in and representative status updates | `status` and `checkedInAt` |
| AR7: Admin manages representative accounts | Representative approval and company-association fields in `users` |
