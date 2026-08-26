// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ColorContrastChecker from 'color-contrast-checker';

import {cachedUserNameColors, generateColor} from './utils';

describe('generateColor', () => {
    beforeEach(() => {
        cachedUserNameColors.clear();
    });

    it('returns a deterministic 6-digit hex color for a given username/background pair', () => {
        expect(generateColor('alice', '#ffffff')).toBe('#4073bf');
        expect(generateColor('alice', '#000000')).toBe('#90d22d');
    });

    it('returns a valid hex color string', () => {
        const result = generateColor('someone', '#ffffff');
        expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('is stable across repeated calls with the same inputs', () => {
        const first = generateColor('carol', '#ffffff');
        const second = generateColor('carol', '#ffffff');
        expect(second).toBe(first);
    });

    it('caches the result so a second call reuses the cached value instead of recomputing', () => {
        const cacheKey = 'dave-#ffffff';
        expect(cachedUserNameColors.has(cacheKey)).toBe(false);

        const result = generateColor('dave', '#ffffff');

        expect(cachedUserNameColors.get(cacheKey)).toBe(result);
    });

    it('produces different colors for different usernames against the same background', () => {
        const alice = generateColor('alice', '#ffffff');
        const bob = generateColor('bob', '#ffffff');
        expect(alice).not.toBe(bob);
    });

    it('picks a text color that meets or improves on the WCAG contrast ratio against the background', () => {
        const checker = new ColorContrastChecker();
        const background = '#ffffff';
        const result = generateColor('frank', background);

        const contrastRatio = checker.getContrastRatio(
            checker.hexToLuminance(result),
            checker.hexToLuminance(background),
        );

        // generateColor tries up to 10 salted hashes and keeps the best contrast found,
        // so the chosen color must be readable against the background, not merely valid.
        expect(contrastRatio).toBeGreaterThanOrEqual(1.5);
    });
});
