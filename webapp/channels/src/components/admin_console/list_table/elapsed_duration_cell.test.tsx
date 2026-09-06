// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithContext, screen} from 'tests/react_testing_utils';

import {ElapsedDurationCell} from './elapsed_duration_cell';

describe('ElapsedDurationCell', () => {
    const day = 24 * 60 * 60 * 1000;

    // 2025-06-15T12:00Z, and the runner pins TZ=Etc/UTC so day boundaries are UTC midnights.
    const now = Date.parse('2025-06-15T12:00:00.000Z');

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date(now));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('should render nothing without a date', () => {
        const {container} = renderWithContext(<ElapsedDurationCell/>);

        expect(container).toBeEmptyDOMElement();
    });

    test('should render "Today" for a date earlier on the same day', () => {
        renderWithContext(<ElapsedDurationCell date={now - (3 * 60 * 60 * 1000)}/>);

        expect(screen.getByText('Today')).toBeInTheDocument();
    });

    test('should render "Yesterday" for a date on the previous calendar day', () => {
        renderWithContext(<ElapsedDurationCell date={Date.parse('2025-06-14T23:30:00.000Z')}/>);

        expect(screen.getByText('Yesterday')).toBeInTheDocument();
    });

    test('should count whole calendar days for older dates', () => {
        renderWithContext(<ElapsedDurationCell date={now - (5 * day)}/>);

        expect(screen.getByText('5 days')).toBeInTheDocument();
    });

    test('should count from the start of the day, not from 24-hour blocks', () => {
        // 23:00 on the 13th is only 37 hours before now, but two calendar days ago.
        renderWithContext(<ElapsedDurationCell date={Date.parse('2025-06-13T23:00:00.000Z')}/>);

        expect(screen.getByText('2 days')).toBeInTheDocument();
    });
});
