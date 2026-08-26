// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {LicenseSkus} from 'utils/constants';
import {daysToLicenseExpire, isLicenseExpired, isLicenseExpiring, isLicensedForDelegatedAdministration, isLicensePastGracePeriod} from 'utils/license_utils';

describe('license_utils', () => {
    const millisPerDay = 24 * 60 * 60 * 1000;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('isLicensedForDelegatedAdministration', () => {
        it('should return true for an Enterprise license with LDAPGroups enabled', () => {
            const license = {IsLicensed: 'true', LDAPGroups: 'true', SkuShortName: LicenseSkus.Enterprise};

            expect(isLicensedForDelegatedAdministration(license)).toBe(true);
        });

        it('should return true for an Enterprise Advanced license with LDAPGroups enabled', () => {
            const license = {IsLicensed: 'true', LDAPGroups: 'true', SkuShortName: LicenseSkus.EnterpriseAdvanced};

            expect(isLicensedForDelegatedAdministration(license)).toBe(true);
        });

        it('should return false for an Entry license even with LDAPGroups enabled', () => {
            const license = {IsLicensed: 'true', LDAPGroups: 'true', SkuShortName: LicenseSkus.Entry};

            expect(isLicensedForDelegatedAdministration(license)).toBe(false);
        });

        it('should return false when LDAPGroups is not enabled', () => {
            const license = {IsLicensed: 'true', LDAPGroups: 'false', SkuShortName: LicenseSkus.Professional};

            expect(isLicensedForDelegatedAdministration(license)).toBe(false);
        });

        it('should return false when not licensed', () => {
            const license = {IsLicensed: 'false', LDAPGroups: 'true', SkuShortName: LicenseSkus.Enterprise};

            expect(isLicensedForDelegatedAdministration(license)).toBe(false);
        });

        it('should return false when license is undefined', () => {
            expect(isLicensedForDelegatedAdministration(undefined)).toBe(false);
        });
    });
    describe('isLicenseExpiring', () => {
        it('should return false if cloud expiring in 5 days', () => {
            const license = {Id: '1234', IsLicensed: 'true', Cloud: 'true', ExpiresAt: `${Date.now() + (5 * millisPerDay)}`};

            expect(isLicenseExpiring(license)).toBeFalsy();
        });

        it('should return True if expiring in 5 days - non Cloud', () => {
            const license = {Id: '1234', IsLicensed: 'true', Cloud: 'false', ExpiresAt: `${Date.now() + (5 * millisPerDay)}`};

            expect(isLicenseExpiring(license)).toBeTruthy();
        });
    });
    describe('isLicenseExpired', () => {
        it('should return false if cloud expired 1 day ago', () => {
            const license = {Id: '1234', IsLicensed: 'true', Cloud: 'true', ExpiresAt: `${Date.now() - (Number(millisPerDay))}`};

            expect(isLicenseExpired(license)).toBeFalsy();
        });

        it('should return True if expired 1 day ago - non Cloud', () => {
            const license = {Id: '1234', IsLicensed: 'true', Cloud: 'false', ExpiresAt: `${Date.now() - (Number(millisPerDay))}`};

            expect(isLicenseExpired(license)).toBeTruthy();
        });
    });

    describe('isLicensePastGracePeriod', () => {
        it('should return False if cloud expired 11 days ago', () => {
            const license = {Id: '1234', IsLicensed: 'true', Cloud: 'true', ExpiresAt: `${Date.now() - (11 * millisPerDay)}`};

            expect(isLicensePastGracePeriod(license)).toBeFalsy();
        });

        it('should return True if expired 1 day ago - non Cloud', () => {
            const license = {Id: '1234', IsLicensed: 'true', Cloud: 'false', ExpiresAt: `${Date.now() - (11 * millisPerDay)}`};

            expect(isLicensePastGracePeriod(license)).toBeTruthy();
        });
    });

    describe('daysToLicenseExpire', () => {
        it('should return undefined for a cloud license', () => {
            const license = {Id: '1234', IsLicensed: 'true', Cloud: 'true', ExpiresAt: `${Date.now() + (5 * millisPerDay)}`};

            expect(daysToLicenseExpire(license)).toBeUndefined();
        });

        it('should return undefined when not licensed', () => {
            const license = {Id: '1234', IsLicensed: 'false', Cloud: 'false', ExpiresAt: `${Date.now() + (5 * millisPerDay)}`};

            expect(daysToLicenseExpire(license)).toBeUndefined();
        });

        it('should return a positive day count for a license expiring in the future', () => {
            const license = {Id: '1234', IsLicensed: 'true', Cloud: 'false', ExpiresAt: `${Date.now() + (10 * millisPerDay)}`};

            expect(daysToLicenseExpire(license)).toBe(10);
        });

        it('should return a negative day count for an already-expired license', () => {
            const license = {Id: '1234', IsLicensed: 'true', Cloud: 'false', ExpiresAt: `${Date.now() - (3 * millisPerDay)}`};

            expect(daysToLicenseExpire(license)).toBe(-3);
        });

        it('should return 0 for a license expiring later today', () => {
            const license = {Id: '1234', IsLicensed: 'true', Cloud: 'false', ExpiresAt: `${Date.now() + (2 * 60 * 60 * 1000)}`};

            expect(daysToLicenseExpire(license)).toBe(0);
        });
    });
});
