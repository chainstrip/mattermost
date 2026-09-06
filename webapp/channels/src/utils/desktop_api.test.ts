// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as UserAgent from '@mattermost/shared/utils/user_agent';

import {DesktopAppAPI} from 'utils/desktop_api';

jest.mock('@mattermost/shared/utils/user_agent', () => ({
    isDesktopApp: jest.fn(() => false),
}));

const isDesktopAppMock = jest.mocked(UserAgent.isDesktopApp);

describe('DesktopAppAPI version detection', () => {
    afterEach(() => {
        isDesktopAppMock.mockReturnValue(false);
        Reflect.deleteProperty(window, 'desktopAPI');
        Reflect.deleteProperty(window, 'desktop');
    });

    async function construct(version: string) {
        isDesktopAppMock.mockReturnValue(true);
        const getAppInfo = jest.fn().mockResolvedValue({name: 'Mattermost', version});
        window.desktopAPI = {getAppInfo};

        const api = new DesktopAppAPI();

        expect(getAppInfo).toHaveBeenCalledTimes(1);

        // The constructor attached its `.then` to this exact promise before we did, so by the time this
        // await resumes the version has been recorded.
        await getAppInfo.mock.results[0].value;

        return api;
    }

    test('should not query the Desktop App outside of it', () => {
        const getAppInfo = jest.fn();
        window.desktopAPI = {getAppInfo};

        const api = new DesktopAppAPI();

        expect(getAppInfo).not.toHaveBeenCalled();
        expect(api.getAppName()).toBeUndefined();
        expect(api.getAppVersion()).toBeUndefined();
        expect(api.getPrereleaseVersion()).toBeUndefined();
    });

    test('should record a plain release version as-is', async () => {
        const api = await construct('5.10.0');

        expect(api.getAppName()).toBe('Mattermost');
        expect(api.getAppVersion()).toBe('5.10.0');
        expect(api.getPrereleaseVersion()).toBeUndefined();
        expect(window.desktop?.version).toBe('5.10.0');
    });

    test('should strip the prerelease tag from the version and keep it separately', async () => {
        const api = await construct('5.10.0-rc.2');

        expect(api.getAppVersion()).toBe('5.10.0');
        expect(api.getPrereleaseVersion()).toBe('rc.2');
        expect(window.desktop?.version).toBe('5.10.0');
    });

    test('should coerce a short or prefixed version into a full semantic version', async () => {
        expect((await construct('v5.9')).getAppVersion()).toBe('5.9.0');
        expect((await construct('6')).getAppVersion()).toBe('6.0.0');
        expect((await construct('Mattermost/5.8.1 (Electron)')).getAppVersion()).toBe('5.8.1');
    });

    test('should leave the version unset when nothing in the string looks like a version', async () => {
        const api = await construct('unknown');

        expect(api.getAppVersion()).toBeNull();
        expect(window.desktop?.version).toBeNull();
    });
});
