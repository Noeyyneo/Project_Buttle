const EVENT_START = new Date('2022-05-10T00:00:00.000Z');
const EVENT_END = new Date('2022-05-14T00:00:00.000Z');

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
