# Project Buttle Database Design

This document describes the proposed MongoDB database structure for the Online Job Fair Registration API.

The project uses MongoDB Atlas with Mongoose. The database consists of three main collections:

- `users`
- `companies`
- `interviewBookings`

## Collection Relationships

```text
users 1 -------- many interviewBookings many -------- 1 companies
```

Each interview booking belongs to one user and one company. A user may have no more than three active interview bookings.

## 1. Users Collection

Collection name: `users`

| Field | Mongoose type | Required | Description |
| --- | --- | --- | --- |
| `_id` | `ObjectId` | Automatic | Unique user identifier |
| `name` | `String` | Yes | User's full name |
| `telephone` | `String` | Yes | User's telephone number |
| `email` | `String` | Yes | Login email; must be unique and stored in lowercase |
| `passwordHash` | `String` | Yes | Password hashed with bcrypt; never store the original password |
| `role` | `String` | Yes | Either `user` or `admin`; defaults to `user` |
| `createdAt` | `Date` | Automatic | Date and time the user was created |
| `updatedAt` | `Date` | Automatic | Date and time the user was last updated |

Recommended index:

```javascript
{ email: 1 } // unique
```

Example document:

```json
{
  "_id": "ObjectId('...')",
  "name": "Example User",
  "telephone": "+66XXXXXXXXX",
  "email": "user@example.com",
  "passwordHash": "$2b$12$...",
  "role": "user",
  "createdAt": "2026-10-22T00:00:00.000Z",
  "updatedAt": "2026-10-22T00:00:00.000Z"
}
```

## 2. Companies Collection

Collection name: `companies`

| Field | Mongoose type | Required | Description |
| --- | --- | --- | --- |
| `_id` | `ObjectId` | Automatic | Unique company identifier |
| `name` | `String` | Yes | Company name; should be unique |
| `address` | `String` | Yes | Company address |
| `website` | `String` | Yes | Company website URL |
| `description` | `String` | Yes | Description of the company |
| `telephone` | `String` | Yes | Company telephone number |
| `isActive` | `Boolean` | Yes | Whether the company is currently available; defaults to `true` |
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
  "createdAt": "2026-10-22T00:00:00.000Z",
  "updatedAt": "2026-10-22T00:00:00.000Z"
}
```

## 3. Interview Bookings Collection

Collection name: `interviewBookings`

| Field | Mongoose type | Required | Description |
| --- | --- | --- | --- |
| `_id` | `ObjectId` | Automatic | Unique booking identifier |
| `userId` | `ObjectId` | Yes | References the user in the `users` collection |
| `companyId` | `ObjectId` | Yes | References the company in the `companies` collection |
| `interviewDate` | `Date` | Yes | Scheduled interview date |
| `status` | `String` | Yes | `booked`, `cancelled`, or `completed`; defaults to `booked` |
| `createdAt` | `Date` | Automatic | Date and time the booking was created |
| `updatedAt` | `Date` | Automatic | Date and time the booking was last updated |

Recommended indexes:

```javascript
{ userId: 1 }
{ companyId: 1, interviewDate: 1 }
{ userId: 1, companyId: 1, interviewDate: 1 } // unique
```

Example document:

```json
{
  "_id": "ObjectId('...')",
  "userId": "ObjectId('...')",
  "companyId": "ObjectId('...')",
  "interviewDate": "2026-05-10T09:00:00.000Z",
  "status": "booked",
  "createdAt": "2026-04-01T00:00:00.000Z",
  "updatedAt": "2026-04-01T00:00:00.000Z"
}
```

## Business Rules

The API should enforce the following rules:

1. A registered user may have no more than three active interview bookings.
2. A user cannot book the same company for the same interview date more than once.
3. A normal user may only view, edit, or delete their own bookings.
4. An administrator may view, edit, or delete any booking.
5. A booking must reference an existing user and an active company.
6. Passwords must be hashed with `bcryptjs` before they are stored.
7. Email addresses should be normalized to lowercase before they are stored.
8. Telephone numbers should be stored as strings so leading zeros and country codes are preserved.

## Event-Date Configuration

The original project brief specifies May 10-13, 2022 as the interview period. Because that period has passed, the application should keep the event dates in environment variables or another configuration source instead of hard-coding them.

For example:

```env
EVENT_START_DATE=2026-05-10
EVENT_END_DATE=2026-05-13
```

## Optional Time-Slot Fields

The project requirements only specify an interview date. If the application later needs exact interview times or company capacity limits, add the following fields:

| Field | Collection | Type | Description |
| --- | --- | --- | --- |
| `startTime` | `interviewBookings` | `Date` | Interview start date and time |
| `endTime` | `interviewBookings` | `Date` | Interview end date and time |
| `capacity` | `companies` or a separate `interviewSlots` collection | `Number` | Maximum number of bookings for a slot |

These optional fields should not be added until the team confirms that time-slot scheduling is part of the required scope.
