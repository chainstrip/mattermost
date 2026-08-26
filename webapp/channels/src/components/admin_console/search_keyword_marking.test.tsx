// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {act, renderWithContext} from 'tests/react_testing_utils';

import SearchKeywordMarking from './search_keyword_marking';

describe('components/admin_console/SearchKeywordMarking', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('wraps matching keyword occurrences in <mark> elements', () => {
        const {container} = renderWithContext(
            <SearchKeywordMarking keyword='delete'>
                <div>Delete this workspace permanently</div>
            </SearchKeywordMarking>,
        );

        act(() => {
            jest.advanceTimersByTime(200);
        });

        const marks = container.querySelectorAll('mark');
        expect(marks.length).toBeGreaterThan(0);
        expect(marks[0].textContent?.toLowerCase()).toBe('delete');
    });

    test('does not mark anything when keyword is empty', () => {
        const {container} = renderWithContext(
            <SearchKeywordMarking keyword=''>
                <div>Delete this workspace permanently</div>
            </SearchKeywordMarking>,
        );

        act(() => {
            jest.advanceTimersByTime(200);
        });

        expect(container.querySelectorAll('mark')).toHaveLength(0);
    });

    test('debounces rapid keyword changes so only the latest keyword is marked', () => {
        const {container, rerender} = renderWithContext(
            <SearchKeywordMarking keyword='del'>
                <div>Delete this workspace permanently</div>
            </SearchKeywordMarking>,
        );

        // A keystroke arriving before the debounce window elapses should not mark yet.
        act(() => {
            jest.advanceTimersByTime(100);
        });
        rerender(
            <SearchKeywordMarking keyword='delete'>
                <div>Delete this workspace permanently</div>
            </SearchKeywordMarking>,
        );

        act(() => {
            jest.advanceTimersByTime(200);
        });

        const marks = container.querySelectorAll('mark');
        expect(marks.length).toBeGreaterThan(0);
        expect(marks[0].textContent?.toLowerCase()).toBe('delete');
    });

    test('unmarks the previous keyword before marking the new one after the debounce settles', () => {
        const {container, rerender} = renderWithContext(
            <SearchKeywordMarking keyword='delete'>
                <div>Delete this workspace permanently</div>
            </SearchKeywordMarking>,
        );

        act(() => {
            jest.advanceTimersByTime(200);
        });
        expect(container.querySelectorAll('mark').length).toBeGreaterThan(0);

        rerender(
            <SearchKeywordMarking keyword='workspace'>
                <div>Delete this workspace permanently</div>
            </SearchKeywordMarking>,
        );

        act(() => {
            jest.advanceTimersByTime(200);
        });

        const marks = container.querySelectorAll('mark');
        expect(marks.length).toBeGreaterThan(0);
        expect(marks[0].textContent?.toLowerCase()).toBe('workspace');
    });
});
