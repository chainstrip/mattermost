// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createIntl} from 'react-intl';

import {formatRelativeScheduleTime} from './schedule_time_format';

describe('formatRelativeScheduleTime', () => {
    const intl = createIntl({locale: 'en', messages: {}, defaultLocale: 'en'});

    // 2025-03-10T15:00:00Z is a Monday. In America/New_York (EDT, UTC-4) it is 11:00 AM.
    const nowMs = Date.parse('2025-03-10T15:00:00Z');
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;

    test('should render "Today at" for a target on the same calendar day in the schedule timezone', () => {
        const targetMs = nowMs + (2 * hour);

        expect(formatRelativeScheduleTime(intl, targetMs, nowMs, 'America/New_York')).toBe('Today at 1:00 PM');
    });

    test('should render "Today at" for a target earlier the same day', () => {
        const targetMs = nowMs - (3 * hour);

        expect(formatRelativeScheduleTime(intl, targetMs, nowMs, 'America/New_York')).toBe('Today at 8:00 AM');
    });

    test('should render "Tomorrow at" for the next calendar day', () => {
        const targetMs = nowMs + day;

        expect(formatRelativeScheduleTime(intl, targetMs, nowMs, 'America/New_York')).toBe('Tomorrow at 11:00 AM');
    });

    test('should render the weekday for a target within the next week', () => {
        expect(formatRelativeScheduleTime(intl, nowMs + (2 * day), nowMs, 'America/New_York')).toBe('Wednesday at 11:00 AM');
        expect(formatRelativeScheduleTime(intl, nowMs + (7 * day), nowMs, 'America/New_York')).toBe('Monday at 11:00 AM');
    });

    test('should render the date for a target more than a week away', () => {
        expect(formatRelativeScheduleTime(intl, nowMs + (8 * day), nowMs, 'America/New_York')).toBe('Mar 18 at 11:00 AM');
    });

    test('should compute the calendar day in the schedule timezone, not in UTC', () => {
        // At 12:00 UTC on Monday it is 8:00 AM in New York and 9:00 PM in Tokyo. A target at 23:30 UTC
        // is still Monday evening in New York, but already Tuesday morning in Tokyo.
        const middayMs = Date.parse('2025-03-10T12:00:00Z');
        const targetMs = Date.parse('2025-03-10T23:30:00Z');

        expect(formatRelativeScheduleTime(intl, targetMs, middayMs, 'America/New_York')).toBe('Today at 7:30 PM');
        expect(formatRelativeScheduleTime(intl, targetMs, middayMs, 'Asia/Tokyo')).toBe('Tomorrow at 8:30 AM');
    });

    test('should fall back to the browser zone when the timezone is unknown or missing', () => {
        // The test runner pins TZ=Etc/UTC, so the fallback renders UTC wall-clock time.
        const targetMs = nowMs + (2 * hour);

        expect(formatRelativeScheduleTime(intl, targetMs, nowMs, 'Not/AZone')).toBe('Today at 5:00 PM');
        expect(formatRelativeScheduleTime(intl, targetMs, nowMs, undefined)).toBe('Today at 5:00 PM');
    });

    test('should append the timezone abbreviation only when asked and when the zone resolved', () => {
        const targetMs = nowMs + (2 * hour);

        expect(formatRelativeScheduleTime(intl, targetMs, nowMs, 'America/New_York', {includeTimezoneAbbreviation: true})).toBe('Today at 1:00 PM (EDT)');
        expect(formatRelativeScheduleTime(intl, targetMs, nowMs, 'America/New_York', {includeTimezoneAbbreviation: false})).toBe('Today at 1:00 PM');
        expect(formatRelativeScheduleTime(intl, targetMs, nowMs, 'Not/AZone', {includeTimezoneAbbreviation: true})).toBe('Today at 5:00 PM');
    });

    test('should switch abbreviation with daylight saving in the schedule timezone', () => {
        const winterNow = Date.parse('2025-01-06T15:00:00Z');
        const targetMs = winterNow + hour;

        expect(formatRelativeScheduleTime(intl, targetMs, winterNow, 'America/New_York', {includeTimezoneAbbreviation: true})).toBe('Today at 11:00 AM (EST)');
    });
});
