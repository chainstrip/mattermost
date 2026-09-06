// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    callsChannelExplicitlyDisabled,
    callsChannelExplicitlyEnabled,
    getCallsChannelState,
    getCallsConfig,
    getSessionsInCalls,
    isCallsEnabled,
    isCallsRingingEnabledOnServer,
} from 'selectors/calls';

import {suitePluginIds} from 'utils/constants';

import type {GlobalState} from 'types/store';

const CALLS_PLUGIN_STATE = `plugins-${suitePluginIds.calls}`;

function makeState(pluginVersion?: string, callsState?: Record<string, unknown>): GlobalState {
    const plugins: Record<string, {id: string; version: string}> = {};
    if (pluginVersion !== undefined) {
        plugins[suitePluginIds.calls] = {id: suitePluginIds.calls, version: pluginVersion};
    }

    return {
        plugins: {plugins},
        [CALLS_PLUGIN_STATE]: callsState,
    } as unknown as GlobalState;
}

describe('selectors/calls', () => {
    describe('isCallsEnabled', () => {
        test('should be false when the calls plugin is not installed', () => {
            expect(isCallsEnabled(makeState())).toBe(false);
        });

        test('should be true when the installed version meets the default minimum', () => {
            expect(isCallsEnabled(makeState('0.4.2'))).toBe(true);
            expect(isCallsEnabled(makeState('0.5.0'))).toBe(true);
            expect(isCallsEnabled(makeState('1.0.0'))).toBe(true);
        });

        test('should be false when the installed version is below the default minimum', () => {
            expect(isCallsEnabled(makeState('0.4.1'))).toBe(false);
            expect(isCallsEnabled(makeState('0.3.9'))).toBe(false);
        });

        test('should clean a version string carrying a v prefix or whitespace before comparing', () => {
            expect(isCallsEnabled(makeState('v0.4.2'))).toBe(true);
            expect(isCallsEnabled(makeState(' 0.4.3 '))).toBe(true);
            expect(isCallsEnabled(makeState('v0.4.1'))).toBe(false);
        });

        test('should compare against an explicit minimum version', () => {
            expect(isCallsEnabled(makeState('0.9.0'), '1.0.0')).toBe(false);
            expect(isCallsEnabled(makeState('1.0.0'), '1.0.0')).toBe(true);
            expect(isCallsEnabled(makeState('1.2.3'), '1.0.0')).toBe(true);
        });

        test('should treat a missing plugin version as 0.0.0', () => {
            expect(isCallsEnabled(makeState(''))).toBe(false);
            expect(isCallsEnabled(makeState(''), '0.0.0')).toBe(true);
        });

        test('should treat prereleases as older than the release they precede', () => {
            expect(isCallsEnabled(makeState('0.4.2-rc1'))).toBe(false);
            expect(isCallsEnabled(makeState('0.4.3-rc1'))).toBe(true);
        });
    });

    describe('isCallsRingingEnabledOnServer', () => {
        test('should read EnableRinging from the plugin config', () => {
            expect(isCallsRingingEnabledOnServer(makeState('0.5.0'))).toBe(false);
            expect(isCallsRingingEnabledOnServer(makeState('0.5.0', {callsConfig: {EnableRinging: false}}))).toBe(false);
            expect(isCallsRingingEnabledOnServer(makeState('0.5.0', {callsConfig: {EnableRinging: true}}))).toBe(true);
        });
    });

    describe('getSessionsInCalls and getCallsConfig', () => {
        test('should fall back to empty objects when the plugin state is absent', () => {
            const state = makeState('0.5.0');

            expect(getSessionsInCalls(state)).toEqual({});
            expect(getCallsConfig(state)).toEqual({});
        });

        test('should return the sessions and config from the plugin state', () => {
            const sessions = {channel1: {session1: {user_id: 'user1'}}};
            const callsConfig = {EnableRinging: true, ICEServers: []};
            const state = makeState('0.5.0', {sessions, callsConfig});

            expect(getSessionsInCalls(state)).toBe(sessions);
            expect(getCallsConfig(state)).toBe(callsConfig);
        });
    });

    describe('channel state', () => {
        test('should return an empty state when nothing is known about the channel', () => {
            expect(getCallsChannelState(makeState('0.5.0'), 'channel1')).toEqual({});
            expect(getCallsChannelState(makeState('0.5.0', {channels: {}}), 'channel1')).toEqual({});
            expect(callsChannelExplicitlyEnabled(makeState('0.5.0'), 'channel1')).toBe(false);
            expect(callsChannelExplicitlyDisabled(makeState('0.5.0'), 'channel1')).toBe(false);
        });

        test('should distinguish explicitly enabled from explicitly disabled', () => {
            const state = makeState('0.5.0', {channels: {enabled: {enabled: true}, disabled: {enabled: false}}});

            expect(callsChannelExplicitlyEnabled(state, 'enabled')).toBe(true);
            expect(callsChannelExplicitlyDisabled(state, 'enabled')).toBe(false);

            expect(callsChannelExplicitlyEnabled(state, 'disabled')).toBe(false);
            expect(callsChannelExplicitlyDisabled(state, 'disabled')).toBe(true);
        });
    });
});
