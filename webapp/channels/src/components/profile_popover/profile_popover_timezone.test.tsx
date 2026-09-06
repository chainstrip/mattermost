// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import type {UserTimezone} from '@mattermost/types/users';

import {renderWithContext, screen} from 'tests/react_testing_utils';

import ProfileTimezone from './profile_popover_timezone';

function manualTimezone(zone: string): UserTimezone {
    return {
        useAutomaticTimezone: 'false',
        automaticTimezone: '',
        manualTimezone: zone,
    };
}

describe('ProfileTimezone', () => {
    const currentUserId = 'current-user';

    const initialState = {
        entities: {
            users: {
                currentUserId,
                profiles: {
                    [currentUserId]: {id: currentUserId, timezone: manualTimezone('America/New_York')},
                },
            },
            preferences: {
                myPreferences: {},
            },
        },
    };

    beforeEach(() => {
        jest.useFakeTimers();

        // A June instant: New York is on EDT (UTC-4) and London on BST (UTC+1). Intl names the London
        // zone GMT+1 in the en-US locale, which is what offsetNameShort renders.
        jest.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('should render nothing when the profile has an override or no timezone', () => {
        const {container, rerender} = renderWithContext(
            <ProfileTimezone
                currentUserTimezone='America/New_York'
                profileUserTimezone={manualTimezone('Europe/London')}
                haveOverrideProp={true}
            />,
            initialState,
        );
        expect(container).toBeEmptyDOMElement();

        rerender(
            <ProfileTimezone
                currentUserTimezone='America/New_York'
                haveOverrideProp={false}
            />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    test('should show the local time in the profile timezone with its short zone name', () => {
        renderWithContext(
            <ProfileTimezone
                currentUserTimezone='America/New_York'
                profileUserTimezone={manualTimezone('Europe/London')}
                haveOverrideProp={false}
            />,
            initialState,
        );

        expect(screen.getByText('Local Time (GMT+1)')).toBeInTheDocument();
        expect(screen.getByText('1:00 PM')).toBeInTheDocument();
    });

    test('should say how far ahead the profile timezone is', () => {
        renderWithContext(
            <ProfileTimezone
                currentUserTimezone='America/New_York'
                profileUserTimezone={manualTimezone('Europe/London')}
                haveOverrideProp={false}
            />,
            initialState,
        );

        expect(screen.getByText('(5 hr ahead)')).toBeInTheDocument();
    });

    test('should say how far behind the profile timezone is', () => {
        renderWithContext(
            <ProfileTimezone
                currentUserTimezone='Europe/London'
                profileUserTimezone={manualTimezone('America/New_York')}
                haveOverrideProp={false}
            />,
            initialState,
        );

        expect(screen.getByText('Local Time (EDT)')).toBeInTheDocument();
        expect(screen.getByText('8:00 AM')).toBeInTheDocument();
        expect(screen.getByText('(5 hr behind)')).toBeInTheDocument();
    });

    test('should express fractional offsets in hours', () => {
        renderWithContext(
            <ProfileTimezone
                currentUserTimezone='Europe/London'
                profileUserTimezone={manualTimezone('Asia/Kolkata')}
                haveOverrideProp={false}
            />,
            initialState,
        );

        expect(screen.getByText('(4.5 hr ahead)')).toBeInTheDocument();
    });

    test('should omit the difference when both users share a timezone or the current one is unknown', () => {
        const {container, rerender} = renderWithContext(
            <ProfileTimezone
                currentUserTimezone='America/New_York'
                profileUserTimezone={manualTimezone('America/New_York')}
                haveOverrideProp={false}
            />,
            initialState,
        );

        expect(screen.getByText('Local Time (EDT)')).toBeInTheDocument();
        expect(container.textContent).not.toMatch(/ahead|behind/);

        rerender(
            <ProfileTimezone
                currentUserTimezone={undefined}
                profileUserTimezone={manualTimezone('Europe/London')}
                haveOverrideProp={false}
            />,
        );

        expect(screen.getByText('Local Time (GMT+1)')).toBeInTheDocument();
        expect(container.textContent).not.toMatch(/ahead|behind/);
    });

    test('should fall back to UTC when the profile timezone resolves to nothing', () => {
        renderWithContext(
            <ProfileTimezone
                currentUserTimezone='America/New_York'
                profileUserTimezone={{useAutomaticTimezone: 'true', automaticTimezone: '', manualTimezone: ''}}
                haveOverrideProp={false}
            />,
            initialState,
        );

        expect(screen.getByText('Local Time (UTC)')).toBeInTheDocument();
        expect(screen.getByText('(4 hr ahead)')).toBeInTheDocument();
    });
});
