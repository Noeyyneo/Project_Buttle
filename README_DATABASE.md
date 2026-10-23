# Project Buttle Database Design

This document describes the proposed MongoDB database structure for the Online Job Fair Registration API. It covers the original project requirements and the seven additional requirements for company representatives, interview sessions, candidate check-in, and booking status management.

The project uses MongoDB Atlas with Mongoose. The database consists of five main collections:

- `users`
- `companies`
- `interviewSessions`
- `interviewBookings`
- `authSessions`

## Collection Relationships

```text
companies 1 -------- many users (representatives)
companies 1 -------- many interviewSessions
users 1 ------------ many interviewBookings
interviewSessions 1  many interviewBookings
users 1 ------------ many authSessions
```

- A representative belongs to one company.
- A company can have multiple representatives and interview sessions.
- A registered user may have no more than three active interview bookings.
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
| `approvedBy` | `ObjectId` | No | Admin who approved or rejected the representative; references `users` |
| `approvedAt` | `Date` | No | Date and time the representative was approved or rejected |
| `rejectionReason` | `String` | No | Optional reason for rejecting a representative account |
| `isActive` | `Boolean` | Yes | Whether the account can log in; defaults to `true` |
| `tokenVersion` | `Number` | Yes | Incremented to invalidate all existing tokens when required; defaults to `0` |
| `createdAt` | `Date` | Automatic | Date and time the account was created |
| `updatedAt` | `Date` | Automatic | Date and time the account was last updated |

Validation rules:

- `companyId` and `approvalStatus` are required when `role` is `representative`.
- A representative may access company resources only when `approvalStatus` is `approved` and `isActive` is `true`.
- Normal users and administrators should not have a `companyId`.

Recommended indexes:

```javascript
{ email: 1 } // unique
{ companyId: 1, role: 1, approvalStatus: 1 }
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
  "isActive": true,
  "tokenVersion": 0,
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
  "isActive": true,
  "tokenVersion": 0,
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
| `isActive` | `Boolean` | Yes | Whether the company is available; defaults to `true` |
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
  "isActive": true,
  "createdAt": "2022-04-01T00:00:00.000Z",
  "updatedAt": "2022-04-01T00:00:00.000Z"
}
```

## 3. Interview Sessions Collection

Collection name: `interviewSessions`

Approved representatives can create, view, edit, and delete sessions belonging to their own company. Administrators may manage any session.

| Field | Mongoose type | Required | Description |
| --- | --- | --- | --- |
| `_id` | `ObjectId` | Automatic | Unique interview-session identifier |
| `companyId` | `ObjectId` | Yes | Company that owns the session; references `companies` |
| `createdBy` | `ObjectId` | Yes | Representative or admin who created the session; references `users` |
| `startAt` | `Date` | Yes | Session starting date and time |
| `endAt` | `Date` | Yes | Session ending date and time |
| `capacity` | `Number` | Yes | Maximum number of active bookings; must be a positive integer |
| `status` | `String` | Yes | `open`, `closed`, or `cancelled`; defaults to `open` |
| `createdAt` | `Date` | Automatic | Date and time the session was created |
| `updatedAt` | `Date` | Automatic | Date and time the session was last updated |

Recommended indexes:

```javascript
{ companyId: 1, startAt: 1 }
{ status: 1, startAt: 1 }
```

Example document:

```json
{
  "_id": "ObjectId('...')",
  "companyId": "ObjectId('...')",
  "createdBy": "ObjectId('...')",
  "startAt": "2022-05-10T09:00:00.000Z",
  "endAt": "2022-05-10T09:30:00.000Z",
  "capacity": 10,
  "status": "open",
  "createdAt": "2022-04-01T00:00:00.000Z",
  "updatedAt": "2022-04-01T00:00:00.000Z"
}
```

Session validation rules:

- `startAt` and `endAt` must fall within May 10-13, 2022.
- `endAt` must be later than `startAt`.
- Sessions belonging to the same company must not overlap.
- Only approved representatives may manage sessions for their associated company.
- The API must reject bookings when the number of active bookings reaches `capacity`.

## 4. Interview Bookings Collection

Collection name: `interviewBookings`

| Field | Mongoose type | Required | Description |
| --- | --- | --- | --- |
| `_id` | `ObjectId` | Automatic | Unique booking identifier |
| `userId` | `ObjectId` | Yes | Registered user or candidate; references `users` |
| `sessionId` | `ObjectId` | Yes | Booked interview session; references `interviewSessions` |
| `status` | `String` | Yes | `booked`, `checked_in`, `completed`, `cancelled`, or `no_show`; defaults to `booked` |
| `checkedInAt` | `Date` | No | Date and time the registered user checked in |
| `statusUpdatedBy` | `ObjectId` | No | Representative or admin who last changed the status; references `users` |
| `statusUpdatedAt` | `Date` | No | Date and time the booking status was last changed |
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

## 5. Authentication Sessions Collection

Collection name: `authSessions`

This collection allows the API to use expiring authentication tokens and invalidate a token when a user logs out. Store only a token identifier or secure token hash, never the complete bearer token.

| Field | Mongoose type | Required | Description |
| --- | --- | --- | --- |
| `_id` | `ObjectId` | Automatic | Unique authentication-session identifier |
| `userId` | `ObjectId` | Yes | Authenticated account; references `users` |
| `tokenId` | `String` | Yes | Unique JWT ID (`jti`) or secure hash used to identify the token |
| `expiresAt` | `Date` | Yes | Date and time the token expires |
| `revokedAt` | `Date` | No | Date and time the token was invalidated during logout |
| `createdAt` | `Date` | Automatic | Date and time the authentication session was created |

Recommended indexes:

```javascript
{ tokenId: 1 } // unique
{ userId: 1, revokedAt: 1 }
{ expiresAt: 1 } // TTL index with expireAfterSeconds: 0
```

## Business Rules

The API should enforce the following rules:

1. A registered user may have no more than three active bookings. Active bookings are bookings with `booked` or `checked_in` status.
2. A registered user cannot book the same interview session more than once.
3. A new booking must reference an open session with remaining capacity.
4. A registered user cannot book sessions whose times overlap.
5. A registered user may only view, edit, delete, or check in to their own bookings.
6. A check-in is accepted only within the team's agreed time window around the session start time.
7. An administrator may view, edit, or delete any booking.
8. A representative account starts with `pending` approval status.
9. Only an administrator may approve, reject, deactivate, or reassign a representative account.
10. Only an approved representative may manage sessions and view candidates belonging to their associated company.
11. A representative may update an own-company booking to an allowed status: `checked_in`, `completed`, `cancelled`, or `no_show`.
12. Passwords must be hashed with `bcryptjs` before storage and must never be returned by the API.
13. Email addresses should be normalized to lowercase before storage.
14. Telephone numbers should be stored as strings so leading zeros and country codes are preserved.
15. Authentication tokens must expire. Logging out must revoke the current authentication session.

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
| AR2: Admin approval or rejection | `approvalStatus`, `approvedBy`, `approvedAt`, and `rejectionReason` |
| AR3: Representative CRUD for own-company sessions | `interviewSessions.companyId` and `createdBy` |
| AR4: Session time, date, overlap, and capacity validation | `startAt`, `endAt`, `capacity`, and session indexes |
| AR5: Representative views own-company candidates | Join `interviewBookings` to `interviewSessions` and `users`, restricted by `companyId` |
| AR6: User check-in and representative status updates | `status`, `checkedInAt`, `statusUpdatedBy`, and `statusUpdatedAt` |
| AR7: Admin manages representative accounts | Representative approval, company association, and active-state fields in `users` |

## Security Notes

- Never commit `.env`, `MONGODB_URI`, `JWT_SECRET`, credentials, access tokens, or production database exports.
- Do not store plain-text passwords or complete bearer tokens.
- API responses must exclude `passwordHash`, token identifiers, and other authentication secrets.
- Authorization must be checked in the service or route layer; database references alone do not enforce ownership.
