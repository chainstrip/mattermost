// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    getBrowserUtcOffset,
    getCurrentDateForTimezone,
    getCurrentDateTimeForTimezone,
    getCurrentMomentForTimezone,
    getUtcOffsetForTimeZone,
    isValidTimezone,
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
