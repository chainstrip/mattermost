// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import type {ComponentProps} from 'react';

import {CheckIcon} from '@mattermost/compass-icons/components';

import {act, render, screen, userEvent} from 'tests/react_testing_utils';

import InfoToast from './info_toast';

describe('components/InfoToast', () => {
    const baseProps: ComponentProps<typeof InfoToast> = {
        content: {
            icon: <CheckIcon/>,
            message: 'test',
            undo: jest.fn(),
        },
        className: 'className',
        onExited: jest.fn(),
    };

    test('should match snapshot', () => {
        const {container} = render(<InfoToast {...baseProps}/>);
        expect(container).toMatchSnapshot();
    });

    test('should close the toast on undo', async () => {
        render(<InfoToast {...baseProps}/>);

        await userEvent.click(screen.getByText(/undo/i));
        expect(baseProps.content.undo).toHaveBeenCalled();
        expect(baseProps.onExited).toHaveBeenCalled();
    });

    test('should close the toast on close button click', async () => {
        render(<InfoToast {...baseProps}/>);

        await userEvent.click(screen.getByRole('button', {name: /close/i}));
        expect(baseProps.onExited).toHaveBeenCalled();
    });

    test('should run the CSSTransition appear animation through to completion', () => {
        jest.useFakeTimers();

        try {
            const {container} = render(<InfoToast {...baseProps}/>);
            const toastEl = container.querySelector('.info-toast');

            // CSSTransition (appear=true, timeout=300) applies the *-appear /
            // *-appear-active classes synchronously on mount.
            expect(toastEl?.className).toContain('toast-appear');
            expect(toastEl?.className).toContain('toast-appear-active');

            act(() => {
                jest.advanceTimersByTime(300);
            });

            // After the real timeout elapses, react-transition-group swaps in the
            // *-done classes and drops the *-active one.
            expect(toastEl?.className).toContain('toast-appear-done');
            expect(toastEl?.className).not.toContain('toast-appear-active');
        } finally {
            jest.useRealTimers();
        }
    });

    test('auto-dismisses after 5 seconds', () => {
        jest.useFakeTimers();

        try {
            render(<InfoToast {...baseProps}/>);

            expect(baseProps.onExited).not.toHaveBeenCalled();

            act(() => {
                jest.advanceTimersByTime(5000);
            });

            expect(baseProps.onExited).toHaveBeenCalledTimes(1);
        } finally {
            jest.useRealTimers();
        }
    });
});
