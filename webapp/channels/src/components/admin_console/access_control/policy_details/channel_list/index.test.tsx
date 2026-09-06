// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import type {ChannelWithTeamData} from '@mattermost/types/channels';

import {renderWithContext} from 'tests/react_testing_utils';

import type {GlobalState} from 'types/store';

import ChannelListInner from './channel_list';

import ConnectedChannelList from './index';

jest.mock('./channel_list', () => jest.fn(() => null));

const ChannelListMock = jest.mocked(ChannelListInner);

function channel(id: string, name: string, displayName: string): ChannelWithTeamData {
    return {
        id,
        name,
        display_name: displayName,
        team_id: 'team1',
        type: 'O',
        team_display_name: 'Team One',
        team_name: 'team-one',
        team_update_at: 0,
    } as ChannelWithTeamData;
}

function lastProps() {
    return ChannelListMock.mock.calls[ChannelListMock.mock.calls.length - 1][0];
}

describe('components/admin_console/access_control/channel_list (connected)', () => {
    const alpha = channel('c1', 'alpha-one', 'Alpha One');
    const beta = channel('c2', 'beta-two', 'Beta Two');

    const channelsToAdd = {
        c3: channel('c3', 'alpha-three', 'Alpha Three'),
        c4: channel('c4', 'gamma-four', 'Gamma Four'),
    };

    const baseState = (term: string) => ({
        entities: {
            channels: {
                channels: {c1: alpha, c2: beta},
            },
            teams: {
                teams: {team1: {id: 'team1', name: 'team-one', display_name: 'Team One', update_at: 0}},
            },
            admin: {
                channelsForAccessControlPolicy: {policy1: ['c1', 'c2']},
            },
        },
        views: {
            search: {
                channelListSearch: {term, filters: {}},
            },
        },
    } as unknown as GlobalState);

    beforeEach(() => {
        ChannelListMock.mockClear();
    });

    test('should pass every channel in the policy when there is no search term', () => {
        renderWithContext(
            <ConnectedChannelList
                policyId='policy1'
                channelsToAdd={channelsToAdd}
            />,
            baseState(''),
        );

        const props = lastProps();
        expect(props.searchTerm).toBe('');
        expect(props.totalCount).toBe(2);
        expect(props.channels.map((c) => c.id)).toEqual(['c1', 'c2']);
        expect(props.channels[0].team_display_name).toBe('Team One');
        expect(props.channelsToAdd).toBe(channelsToAdd);
        expect(typeof props.actions.searchChannels).toBe('function');
        expect(typeof props.actions.setChannelListSearch).toBe('function');
        expect(typeof props.actions.setChannelListFilters).toBe('function');
    });

    test('should filter both the policy channels and the pending additions by the search term', () => {
        renderWithContext(
            <ConnectedChannelList
                policyId='policy1'
                channelsToAdd={channelsToAdd}
            />,
            baseState('alpha'),
        );

        const props = lastProps();
        expect(props.searchTerm).toBe('alpha');
        expect(props.totalCount).toBe(1);
        expect(props.channels.map((c) => c.id)).toEqual(['c1']);
        expect(Object.keys(props.channelsToAdd)).toEqual(['c3']);
    });

    test('should return no policy channels while searching without a policy', () => {
        renderWithContext(
            <ConnectedChannelList channelsToAdd={channelsToAdd}/>,
            baseState('alpha'),
        );

        const props = lastProps();
        expect(props.channels).toEqual([]);
        expect(props.totalCount).toBe(0);
        expect(Object.keys(props.channelsToAdd)).toEqual(['c3']);
    });

    test('should reuse the filtered additions across renders until an input changes', () => {
        const {rerender, updateStoreState} = renderWithContext(
            <ConnectedChannelList
                policyId='policy1'
                channelsToAdd={channelsToAdd}
                teamId='team1'
            />,
            baseState('alpha'),
        );

        const first = lastProps().channelsToAdd;
        expect(Object.keys(first)).toEqual(['c3']);

        // A change to an unrelated own prop recomputes mapStateToProps with the same inputs.
        rerender(
            <ConnectedChannelList
                policyId='policy1'
                channelsToAdd={channelsToAdd}
                teamId='team2'
            />,
        );

        expect(ChannelListMock.mock.calls.length).toBeGreaterThan(1);
        expect(lastProps().channelsToAdd).toBe(first);

        // Changing the search term invalidates the memoized result.
        updateStoreState({views: {search: {channelListSearch: {term: 'gamma', filters: {}}}}} as any);

        const second = lastProps().channelsToAdd;
        expect(second).not.toBe(first);
        expect(Object.keys(second)).toEqual(['c4']);
    });
});
