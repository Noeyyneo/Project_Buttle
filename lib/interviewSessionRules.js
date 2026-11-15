const EVENT_START_DATE = process.env.EVENT_START_DATE || '2022-05-10';
const EVENT_END_DATE = process.env.EVENT_END_DATE || '2022-05-13';
const EVENT_START = new Date(`${EVENT_START_DATE}T00:00:00.000Z`);
const EVENT_END = new Date(`${EVENT_END_DATE}T00:00:00.000Z`);

EVENT_END.setUTCDate(EVENT_END.getUTCDate() + 1);

function isEventDate(value) {
    const date = new Date(value);
    return !Number.isNaN(date.valueOf()) && date >= EVENT_START && date < EVENT_END;
}

function validateSessionData({ startAt, endAt, capacity }) {
    const start = new Date(startAt);
    const end = new Date(endAt);

    if (!isEventDate(start) || !isEventDate(end)) {
        return 'Session dates must fall within May 10-13, 2022';
    }

    if (end <= start) {
        return 'endAt must be later than startAt';
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
        return 'capacity must be a positive integer';
    }

    return null;
}

module.exports = { isEventDate, validateSessionData };
