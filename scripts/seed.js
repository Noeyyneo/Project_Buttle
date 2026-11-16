require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const TEST_PASSWORD = 'Password123!';

function objectId(value) {
  return new mongoose.Types.ObjectId(value);
}

const ids = {
  companies: {
    alpha: objectId('64a000000000000000000001'),
    bright: objectId('64a000000000000000000002'),
    creative: objectId('64a000000000000000000003'),
  },
  users: {
    admin: objectId('64b000000000000000000001'),
    maxThree: objectId('64b000000000000000000002'),
    fullSession: objectId('64b000000000000000000003'),
    statusHistory: objectId('64b000000000000000000004'),
    cancelled: objectId('64b000000000000000000005'),
    noBookings: objectId('64b000000000000000000006'),
    alphaRepresentative: objectId('64b000000000000000000007'),
    brightRepresentative: objectId('64b000000000000000000008'),
    creativeRepresentative: objectId('64b000000000000000000009'),
    pendingRepresentative: objectId('64b00000000000000000000a'),
    rejectedRepresentative: objectId('64b00000000000000000000b'),
  },
  sessions: {
    alphaMay10: objectId('64c000000000000000000001'),
    alphaMay11: objectId('64c000000000000000000002'),
    alphaMay12: objectId('64c000000000000000000003'),
    brightFull: objectId('64c000000000000000000004'),
    brightMay11: objectId('64c000000000000000000005'),
    brightMay13: objectId('64c000000000000000000006'),
    creativeMay13: objectId('64c000000000000000000007'),
  },
  bookings: {
    maxThreeOne: objectId('64d000000000000000000001'),
    maxThreeTwo: objectId('64d000000000000000000002'),
    maxThreeThree: objectId('64d000000000000000000003'),
    fullSession: objectId('64d000000000000000000004'),
    checkedIn: objectId('64d000000000000000000005'),
    completed: objectId('64d000000000000000000006'),
    noShow: objectId('64d000000000000000000007'),
    cancelled: objectId('64d000000000000000000008'),
  },
};

function withTimestamps(document, createdAt = '2022-04-01T00:00:00.000Z') {
  const timestamp = new Date(createdAt);
  return { ...document, createdAt: timestamp, updatedAt: timestamp };
}

function buildCompanies() {
  return [
    withTimestamps({
      _id: ids.companies.alpha,
      name: 'Alpha Tech',
      address: '1 Innovation Road, Bangkok',
      website: 'https://alpha-tech.example.com',
      description: 'Software engineering and cloud services.',
      telephone: '02-100-1001',
    }),
    withTimestamps({
      _id: ids.companies.bright,
      name: 'Bright Finance',
      address: '2 Finance Avenue, Bangkok',
      website: 'https://bright-finance.example.com',
      description: 'Financial technology and digital payment services.',
      telephone: '02-100-1002',
    }),
    withTimestamps({
      _id: ids.companies.creative,
      name: 'Creative Works',
      address: '3 Design Street, Bangkok',
      website: 'https://creative-works.example.com',
      description: 'Digital product design and media production.',
      telephone: '02-100-1003',
    }),
  ];
}

function buildUsers(passwordHash) {
  const approvedAt = new Date('2022-04-03T09:00:00.000Z');
  const rejectedAt = new Date('2022-04-04T09:00:00.000Z');

  return [
    withTimestamps({
      _id: ids.users.admin,
      name: 'System Admin',
      telephone: '081-000-0001',
      email: 'admin@buttle.test',
      passwordHash,
      role: 'admin',
    }),
    withTimestamps({
      _id: ids.users.maxThree,
      name: 'Max Three Candidate',
      telephone: '081-000-0002',
      email: 'maxthree@buttle.test',
      passwordHash,
      role: 'user',
    }),
    withTimestamps({
      _id: ids.users.fullSession,
      name: 'Full Session Candidate',
      telephone: '081-000-0003',
      email: 'fullsession@buttle.test',
      passwordHash,
      role: 'user',
    }),
    withTimestamps({
      _id: ids.users.statusHistory,
      name: 'Status History Candidate',
      telephone: '081-000-0004',
      email: 'statuses@buttle.test',
      passwordHash,
      role: 'user',
    }),
    withTimestamps({
      _id: ids.users.cancelled,
      name: 'Cancelled Booking Candidate',
      telephone: '081-000-0005',
      email: 'cancelled@buttle.test',
      passwordHash,
      role: 'user',
    }),
    withTimestamps({
      _id: ids.users.noBookings,
      name: 'New Candidate',
      telephone: '081-000-0006',
      email: 'newcandidate@buttle.test',
      passwordHash,
      role: 'user',
    }),
    withTimestamps({
      _id: ids.users.alphaRepresentative,
      name: 'Alpha Representative',
      telephone: '082-000-0001',
      email: 'rep.alpha@buttle.test',
      passwordHash,
      role: 'representative',
      companyId: ids.companies.alpha,
      approvalStatus: 'approved',
      reviewedAt: approvedAt,
    }),
    withTimestamps({
      _id: ids.users.brightRepresentative,
      name: 'Bright Representative',
      telephone: '082-000-0002',
      email: 'rep.bright@buttle.test',
      passwordHash,
      role: 'representative',
      companyId: ids.companies.bright,
      approvalStatus: 'approved',
      reviewedAt: approvedAt,
    }),
    withTimestamps({
      _id: ids.users.creativeRepresentative,
      name: 'Creative Representative',
      telephone: '082-000-0003',
      email: 'rep.creative@buttle.test',
      passwordHash,
      role: 'representative',
      companyId: ids.companies.creative,
      approvalStatus: 'approved',
      reviewedAt: approvedAt,
    }),
    withTimestamps({
      _id: ids.users.pendingRepresentative,
      name: 'Pending Representative',
      telephone: '082-000-0004',
      email: 'rep.pending@buttle.test',
      passwordHash,
      role: 'representative',
      companyId: ids.companies.creative,
      approvalStatus: 'pending',
    }),
    withTimestamps({
      _id: ids.users.rejectedRepresentative,
      name: 'Rejected Representative',
      telephone: '082-000-0005',
      email: 'rep.rejected@buttle.test',
      passwordHash,
      role: 'representative',
      companyId: ids.companies.bright,
      approvalStatus: 'rejected',
      reviewedAt: rejectedAt,
      rejectionReason: 'The company association could not be verified.',
    }),
  ];
}

function buildSessions() {
  return [
    withTimestamps({
      _id: ids.sessions.alphaMay10,
      companyId: ids.companies.alpha,
      startAt: new Date('2022-05-10T09:00:00.000Z'),
      endAt: new Date('2022-05-10T09:30:00.000Z'),
      capacity: 3,
    }),
    withTimestamps({
      _id: ids.sessions.alphaMay11,
      companyId: ids.companies.alpha,
      startAt: new Date('2022-05-11T10:00:00.000Z'),
      endAt: new Date('2022-05-11T10:30:00.000Z'),
      capacity: 2,
    }),
    withTimestamps({
      _id: ids.sessions.alphaMay12,
      companyId: ids.companies.alpha,
      startAt: new Date('2022-05-12T13:00:00.000Z'),
      endAt: new Date('2022-05-12T13:30:00.000Z'),
      capacity: 2,
    }),
    withTimestamps({
      _id: ids.sessions.brightFull,
      companyId: ids.companies.bright,
      startAt: new Date('2022-05-10T09:00:00.000Z'),
      endAt: new Date('2022-05-10T09:30:00.000Z'),
      capacity: 1,
    }),
    withTimestamps({
      _id: ids.sessions.brightMay11,
      companyId: ids.companies.bright,
      startAt: new Date('2022-05-11T14:00:00.000Z'),
      endAt: new Date('2022-05-11T14:30:00.000Z'),
      capacity: 2,
    }),
    withTimestamps({
      _id: ids.sessions.brightMay13,
      companyId: ids.companies.bright,
      startAt: new Date('2022-05-13T10:00:00.000Z'),
      endAt: new Date('2022-05-13T10:30:00.000Z'),
      capacity: 2,
    }),
    withTimestamps({
      _id: ids.sessions.creativeMay13,
      companyId: ids.companies.creative,
      startAt: new Date('2022-05-13T15:00:00.000Z'),
      endAt: new Date('2022-05-13T15:30:00.000Z'),
      capacity: 2,
    }),
  ];
}

function buildBookings() {
  return [
    withTimestamps({
      _id: ids.bookings.maxThreeOne,
      userId: ids.users.maxThree,
      sessionId: ids.sessions.alphaMay10,
      status: 'booked',
    }),
    withTimestamps({
      _id: ids.bookings.maxThreeTwo,
      userId: ids.users.maxThree,
      sessionId: ids.sessions.alphaMay11,
      status: 'booked',
    }),
    withTimestamps({
      _id: ids.bookings.maxThreeThree,
      userId: ids.users.maxThree,
      sessionId: ids.sessions.alphaMay12,
      status: 'booked',
    }),
    withTimestamps({
      _id: ids.bookings.fullSession,
      userId: ids.users.fullSession,
      sessionId: ids.sessions.brightFull,
      status: 'booked',
    }),
    withTimestamps({
      _id: ids.bookings.checkedIn,
      userId: ids.users.statusHistory,
      sessionId: ids.sessions.brightMay11,
      status: 'checked_in',
      checkedInAt: new Date('2022-05-11T13:45:00.000Z'),
    }),
    withTimestamps({
      _id: ids.bookings.completed,
      userId: ids.users.statusHistory,
      sessionId: ids.sessions.brightMay13,
      status: 'completed',
      checkedInAt: new Date('2022-05-13T09:45:00.000Z'),
    }),
    withTimestamps({
      _id: ids.bookings.noShow,
      userId: ids.users.statusHistory,
      sessionId: ids.sessions.creativeMay13,
      status: 'no_show',
    }),
    withTimestamps({
      _id: ids.bookings.cancelled,
      userId: ids.users.cancelled,
      sessionId: ids.sessions.alphaMay10,
      status: 'cancelled',
    }),
  ];
}

async function upsertDocuments(collection, documents) {
  const operations = documents.map((document) => ({
    replaceOne: {
      filter: { _id: document._id },
      replacement: document,
      upsert: true,
    },
  }));

  await collection.bulkWrite(operations, { ordered: true });
}

async function seedDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured. Add it to your private .env file.');
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed while NODE_ENV is set to production.');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const companies = buildCompanies();
  const users = buildUsers(passwordHash);
  const sessions = buildSessions();
  const bookings = buildBookings();
  const database = mongoose.connection.db;

  await upsertDocuments(database.collection('companies'), companies);
  await upsertDocuments(database.collection('users'), users);
  await upsertDocuments(database.collection('interviewSessions'), sessions);
  await upsertDocuments(database.collection('interviewBookings'), bookings);

  console.log('Mock data seeded successfully.');
  console.log(`Companies: ${companies.length}`);
  console.log(`Accounts: ${users.length}`);
  console.log(`Interview sessions: ${sessions.length}`);
  console.log(`Interview bookings: ${bookings.length}`);
  console.log(`Shared test password: ${TEST_PASSWORD}`);
}

if (require.main === module) {
  seedDatabase()
    .catch((error) => {
      console.error(`Unable to seed mock data: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}

module.exports = {
  TEST_PASSWORD,
  buildBookings,
  buildCompanies,
  buildSessions,
  buildUsers,
  ids,
};
