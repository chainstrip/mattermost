// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    getBrowserUtcOffset,
    getCurrentDateForTimezone,
    getCurrentDateTimeForTimezone,
    getCurrentMomentForTimezone,
    getUtcOffsetForTimeZone,
    isValidTimezone,
    parseDateInTimezone,
} from './timezone';

describe('timezone', () => {
    beforeEach(() => {
        // A fixed instant in June so America/New_York is observing EDT (UTC-4)
        // and there's no ambiguity around a DST transition.
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-06-15T02:00:00.000Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('getBrowserUtcOffset', () => {
        it('returns the local (process TZ) offset in minutes', () => {
            // The test process runs with TZ=Etc/UTC, so the offset is 0.
            expect(getBrowserUtcOffset()).toBeCloseTo(0);
        });
    });

    describe('getUtcOffsetForTimeZone', () => {
        it('returns the UTC offset in minutes for a DST-observing zone', () => {
            expect(getUtcOffsetForTimeZone('America/New_York')).toBe(-240);
        });

        it('returns the UTC offset in minutes for a non-DST zone', () => {
            expect(getUtcOffsetForTimeZone('Asia/Tokyo')).toBe(540);
        });
    });

    describe('getCurrentDateForTimezone', () => {
        it('returns a Date carrying the year/month/day as observed in the given timezone', () => {
            // 2025-06-15T02:00:00Z is still 2025-06-14 22:00 in America/New_York.
            const result = getCurrentDateForTimezone('America/New_York');
            expect(result.getFullYear()).toBe(2025);
            expect(result.getMonth()).toBe(5); // June, 0-indexed
            expect(result.getDate()).toBe(14);
            expect(result.getHours()).toBe(0);
            expect(result.getMinutes()).toBe(0);
        });

        it('returns the same day for a timezone that has already rolled over to the next day', () => {
            // 2025-06-15T02:00:00Z is 2025-06-15 11:00 in Asia/Tokyo.
            const result = getCurrentDateForTimezone('Asia/Tokyo');
            expect(result.getFullYear()).toBe(2025);
            expect(result.getMonth()).toBe(5);
            expect(result.getDate()).toBe(15);
        });
    });

    describe('getCurrentDateTimeForTimezone', () => {
        it('returns a Date carrying the full date and time as observed in the given timezone', () => {
            const result = getCurrentDateTimeForTimezone('America/New_York');
            expect(result.getFullYear()).toBe(2025);
            expect(result.getMonth()).toBe(5);
            expect(result.getDate()).toBe(14);
            expect(result.getHours()).toBe(22);
            expect(result.getMinutes()).toBe(0);
            expect(result.getSeconds()).toBe(0);
        });
    });

    describe('getCurrentMomentForTimezone', () => {
        it('returns the current moment localized to the given timezone', () => {
            const result = getCurrentMomentForTimezone('America/New_York');
            expect(result.format()).toBe('2025-06-14T22:00:00-04:00');
        });

        it('returns the current moment in the local zone when no timezone is given', () => {
            const result = getCurrentMomentForTimezone();
            expect(result.toISOString()).toBe('2025-06-15T02:00:00.000Z');
        });
    });

    describe('isValidTimezone', () => {
        it('returns true for a recognized IANA timezone', () => {
            expect(isValidTimezone('America/New_York')).toBe(true);
            expect(isValidTimezone('Asia/Tokyo')).toBe(true);
        });

        it('returns false for an unrecognized timezone string', () => {
            expect(isValidTimezone('Not/A_Zone')).toBe(false);
            expect(isValidTimezone('')).toBe(false);
        });
    });
});

describe('parseDateInTimezone', () => {
    test('should parse an ISO datetime as an absolute instant when no timezone is given', () => {
        const parsed = parseDateInTimezone('2025-01-15T14:30:00Z');

        expect(parsed).not.toBeNull();
        expect(parsed!.toISOString()).toBe('2025-01-15T14:30:00.000Z');
    });

    test('should ignore a timezone that moment does not know', () => {
        const parsed = parseDateInTimezone('2025-01-15T14:30:00Z', 'Not/AZone');

        expect(parsed).not.toBeNull();
        expect(parsed!.toISOString()).toBe('2025-01-15T14:30:00.000Z');
    });

    test('should treat a date-only string as midnight in the target timezone', () => {
        const parsed = parseDateInTimezone('2025-01-15', 'America/New_York');

        expect(parsed).not.toBeNull();
        expect(parsed!.format('YYYY-MM-DD HH:mm')).toBe('2025-01-15 00:00');
        expect(parsed!.utcOffset()).toBe(-300);
        expect(parsed!.toISOString()).toBe('2025-01-15T05:00:00.000Z');
    });

    test('should convert a UTC datetime string into the target timezone', () => {
        const parsed = parseDateInTimezone('2025-01-15T14:30:00Z', 'America/New_York');

        expect(parsed).not.toBeNull();
        expect(parsed!.format('YYYY-MM-DD HH:mm')).toBe('2025-01-15 09:30');
        expect(parsed!.toISOString()).toBe('2025-01-15T14:30:00.000Z');

        const tokyo = parseDateInTimezone('2025-01-15T14:30:00Z', 'Asia/Tokyo');
        expect(tokyo!.format('YYYY-MM-DD HH:mm')).toBe('2025-01-15 23:30');
    });

    test('should return null for an impossible calendar date', () => {
        expect(parseDateInTimezone('2025-02-30')).toBeNull();
        expect(parseDateInTimezone('2025-02-30', 'America/New_York')).toBeNull();
        expect(parseDateInTimezone('2025-02-30T10:00:00Z', 'America/New_York')).toBeNull();
    });
});
