// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment';

import {
    getDiff,
    isToday,
    isYesterday,
    relativeFormatDate,
} from './datetime';

describe('isToday and isYesterday', () => {
    test('tomorrow at 12am', () => {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        date.setHours(0);
        date.setMinutes(0);

        expect(isToday(date)).toBe(false);
        expect(isYesterday(date)).toBe(false);
    });

    test('now', () => {
        const date = new Date();

        expect(isToday(date)).toBe(true);
        expect(isYesterday(date)).toBe(false);
    });

    test('today at 12am', () => {
        const date = new Date();
        date.setHours(0);
        date.setMinutes(0);

        expect(isToday(date)).toBe(true);
        expect(isYesterday(date)).toBe(false);
    });

    test('today at 11:59pm', () => {
        const date = new Date();
        date.setHours(23);
        date.setMinutes(59);

        expect(isToday(date)).toBe(true);
        expect(isYesterday(date)).toBe(false);
    });

    test('yesterday at 11:59pm', () => {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        date.setHours(23);
        date.setMinutes(59);

        expect(isToday(date)).toBe(false);
        expect(isYesterday(date)).toBe(true);
    });

    test('yesterday at 12am', () => {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        date.setHours(0);
        date.setMinutes(0);

        expect(isToday(date)).toBe(false);
        expect(isYesterday(date)).toBe(true);
    });

    test('two days ago at 11:59pm', () => {
        const date = new Date();
        date.setDate(date.getDate() - 2);
        date.setHours(23);
        date.setMinutes(59);

        expect(isToday(date)).toBe(false);
        expect(isYesterday(date)).toBe(false);
    });
});

describe('diff: day', () => {
    const tz = '';

    test('tomorrow at 12am', () => {
        const now = new Date();
        const date = new Date();
        date.setDate(date.getDate() + 1);
        date.setHours(0);
        date.setMinutes(0);

        expect(getDiff(date, now, tz, 'day')).toBe(+1);
    });

    test('now', () => {
        const now = new Date();
        const date = new Date();

        expect(getDiff(date, now, tz, 'day')).toBe(0);
    });

    test('today at 12am', () => {
        const now = new Date();
        const date = new Date();
        date.setHours(0);
        date.setMinutes(0);

        expect(getDiff(date, now, tz, 'day')).toBe(0);
    });

    test('today at 11:59pm', () => {
        const now = new Date();
        const date = new Date();
        date.setHours(23);
        date.setMinutes(59);

        expect(getDiff(date, now, tz, 'day')).toBe(0);
    });

    test('yesterday at 11:59pm', () => {
        const now = new Date();
        const date = new Date();
        date.setDate(date.getDate() - 1);
        date.setHours(23);
        date.setMinutes(59);

        expect(getDiff(date, now, tz, 'day')).toBe(-1);
    });

    test('yesterday at 12am', () => {
        const now = new Date();
        const date = new Date();
        date.setDate(date.getDate() - 1);
        date.setHours(0);
        date.setMinutes(0);

        expect(getDiff(date, now, tz, 'day')).toBe(-1);
    });

    test('two days ago at 11:59pm', () => {
        const now = new Date();
        const date = new Date();
        date.setDate(date.getDate() - 2);
        date.setHours(23);
        date.setMinutes(59);

        expect(getDiff(date, now, tz, 'day')).toBe(-2);
    });

    test('366 days ago at 11:59pm', () => {
        const now = new Date();
        const date = new Date();
        date.setDate(date.getDate() - 366);
        date.setHours(23);
        date.setMinutes(59);

        expect(getDiff(date, now, tz, 'day')).toBe(-366);
    });
});

describe('relativeFormatDate', () => {
    // formatMessage is only invoked for the today/yesterday/tomorrow shortcuts;
    // the fallback path goes through luxon's DateTime formatting directly.
    const formatMessage = jest.fn(({defaultMessage}: {defaultMessage: string}) => defaultMessage);

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
        formatMessage.mockClear();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('returns "Today" for a date on the same day as now', () => {
        const result = relativeFormatDate(moment('2025-06-15T08:00:00Z'), formatMessage as any);
        expect(result).toBe('Today');
        expect(formatMessage).toHaveBeenCalledWith(expect.objectContaining({id: 'date_separator.today'}));
    });

    test('returns "Yesterday" for a date one day before now', () => {
        const result = relativeFormatDate(moment('2025-06-14T08:00:00Z'), formatMessage as any);
        expect(result).toBe('Yesterday');
        expect(formatMessage).toHaveBeenCalledWith(expect.objectContaining({id: 'date_separator.yesterday'}));
    });

    test('returns "Tomorrow" for a date one day after now', () => {
        const result = relativeFormatDate(moment('2025-06-16T08:00:00Z'), formatMessage as any);
        expect(result).toBe('Tomorrow');
        expect(formatMessage).toHaveBeenCalledWith(expect.objectContaining({id: 'date_separator.tomorrow'}));
    });

    test('formats a distant date via luxon toLocaleString when no format is given', () => {
        const result = relativeFormatDate(moment('2025-01-01T08:00:00Z'), formatMessage as any);
        expect(result).toBe('1/1/2025');
        expect(formatMessage).not.toHaveBeenCalled();
    });

    test('formats a distant date using the given luxon format string', () => {
        const result = relativeFormatDate(moment('2025-01-01T08:00:00Z'), formatMessage as any, 'yyyy-MM-dd');
        expect(result).toBe('2025-01-01');
        expect(formatMessage).not.toHaveBeenCalled();
    });
});
