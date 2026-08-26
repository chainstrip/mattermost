// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {computePosition} from '@floating-ui/react';

import {horizontallyWithin} from './floating';

function mockRect(el: HTMLElement, rect: {top: number; left: number; right: number; bottom: number}) {
    el.getBoundingClientRect = () => ({
        ...rect,
        x: rect.left,
        y: rect.top,
        width: rect.right - rect.left,
        height: rect.bottom - rect.top,
        toJSON() {
            return this;
        },
    });
}

// horizontallyWithin is a real @floating-ui/react middleware, so it's driven
// through the library's own computePosition rather than by hand-building a
// MiddlewareState - that's the only way to reach its `fn` with a state shape
// the real detectOverflow() call will accept.
describe('horizontallyWithin', () => {
    function makeElements() {
        const reference = document.createElement('div');
        const floating = document.createElement('div');
        document.body.appendChild(reference);
        document.body.appendChild(floating);

        mockRect(reference, {top: 0, left: 200, right: 220, bottom: 20});
        mockRect(floating, {top: 20, left: 200, right: 300, bottom: 60});

        return {reference, floating};
    }

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('does not alter the computed position when no boundary is given', async () => {
        const {reference, floating} = makeElements();

        const natural = await computePosition(reference, floating, {
            placement: 'bottom-start',
            middleware: [],
        });
        const result = await computePosition(reference, floating, {
            placement: 'bottom-start',
            middleware: [horizontallyWithin({})],
        });

        expect(result.x).toBe(natural.x);
        expect(result.y).toBe(natural.y);
    });

    it('adjusts the computed x position once a boundary element is supplied', async () => {
        const {reference, floating} = makeElements();

        const natural = await computePosition(reference, floating, {
            placement: 'bottom-start',
            middleware: [],
        });
        const result = await computePosition(reference, floating, {
            placement: 'bottom-start',
            middleware: [horizontallyWithin({boundary: document.body})],
        });

        // Proves the real detectOverflow()-driven branch of horizontallyWithin ran
        // (as opposed to the `if (!boundary) return {}` early-out above) - it
        // changed x away from the natural, un-middlewared position.
        expect(result.x).not.toBe(natural.x);
        expect(result.y).toBe(natural.y);
    });

    it('is deterministic for the same reference/floating geometry and boundary', async () => {
        const first = makeElements();
        const firstResult = await computePosition(first.reference, first.floating, {
            placement: 'bottom-start',
            middleware: [horizontallyWithin({boundary: document.body})],
        });
        document.body.innerHTML = '';

        const second = makeElements();
        const secondResult = await computePosition(second.reference, second.floating, {
            placement: 'bottom-start',
            middleware: [horizontallyWithin({boundary: document.body})],
        });

        expect(secondResult.x).toBe(firstResult.x);
        expect(secondResult.y).toBe(firstResult.y);
    });
});
