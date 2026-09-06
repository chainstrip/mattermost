// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {act, render, screen} from 'tests/react_testing_utils';

import AutoHeightSwitcher, {AutoHeightSlots} from './auto_height_switcher';

describe('AutoHeightSwitcher', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    const slot1 = <span>{'first slot'}</span>;
    const slot2 = <span>{'second slot'}</span>;

    test('should render the selected slot without animating', () => {
        const onTransitionEnd = jest.fn();
        const {container} = render(
            <AutoHeightSwitcher
                showSlot={AutoHeightSlots.SLOT2}
                slot1={slot1}
                slot2={slot2}
                onTransitionEnd={onTransitionEnd}
            />,
        );

        expect(screen.getByText('second slot')).toBeInTheDocument();
        expect(screen.queryByText('first slot')).not.toBeInTheDocument();

        const wrapper = container.querySelector('.AutoHeight') as HTMLElement;
        expect(wrapper.style.height).toBe('auto');
        expect(wrapper.style.overflow).toBe('visible');
        expect(wrapper.style.transitionDuration).toBe('250ms');

        act(() => {
            jest.advanceTimersByTime(1000);
        });
        expect(onTransitionEnd).not.toHaveBeenCalled();
    });

    test('should update the visible slot in place when its content changes', () => {
        const {rerender} = render(
            <AutoHeightSwitcher
                showSlot={AutoHeightSlots.SLOT1}
                slot1={slot1}
                slot2={slot2}
            />,
        );

        rerender(
            <AutoHeightSwitcher
                showSlot={AutoHeightSlots.SLOT1}
                slot1={<span>{'first slot, edited'}</span>}
                slot2={slot2}
            />,
        );

        expect(screen.getByText('first slot, edited')).toBeInTheDocument();
        expect(screen.queryByText('second slot')).not.toBeInTheDocument();
    });

    test('should switch slots through a height transition and report when it ends', () => {
        const onTransitionEnd = jest.fn();
        const {container, rerender} = render(
            <AutoHeightSwitcher
                showSlot={AutoHeightSlots.SLOT1}
                slot1={slot1}
                slot2={slot2}
                duration={100}
                onTransitionEnd={onTransitionEnd}
            />,
        );
        const wrapper = container.querySelector('.AutoHeight') as HTMLElement;

        expect(screen.getByText('first slot')).toBeInTheDocument();

        rerender(
            <AutoHeightSwitcher
                showSlot={AutoHeightSlots.SLOT2}
                slot1={slot1}
                slot2={slot2}
                duration={100}
                onTransitionEnd={onTransitionEnd}
            />,
        );

        // onEnter/onEntering have run: the new slot is mounted and the wrapper is clipped to a fixed height
        // while the CSS transition is in flight.
        expect(screen.getByText('second slot')).toBeInTheDocument();
        expect(screen.queryByText('first slot')).not.toBeInTheDocument();
        expect(wrapper.style.overflow).toBe('hidden');
        expect(wrapper.style.height).toBe('0px');
        expect(onTransitionEnd).not.toHaveBeenCalled();

        act(() => {
            jest.advanceTimersByTime(99);
        });
        expect(onTransitionEnd).not.toHaveBeenCalled();

        act(() => {
            jest.advanceTimersByTime(1);
        });

        // onEntered has run: the wrapper is released and the caller is told the transition finished.
        expect(onTransitionEnd).toHaveBeenCalledTimes(1);
        expect(onTransitionEnd).toHaveBeenCalledWith(wrapper);
        expect(wrapper.style.height).toBe('auto');
        expect(wrapper.style.overflow).toBe('visible');
        expect(screen.getByText('second slot')).toBeInTheDocument();
    });

    test('should be able to switch back after a completed transition', () => {
        const onTransitionEnd = jest.fn();
        const props = {slot1, slot2, duration: 50, onTransitionEnd};
        const {rerender} = render(
            <AutoHeightSwitcher
                showSlot={AutoHeightSlots.SLOT1}
                {...props}
            />,
        );

        rerender(
            <AutoHeightSwitcher
                showSlot={AutoHeightSlots.SLOT2}
                {...props}
            />,
        );
        act(() => {
            jest.advanceTimersByTime(50);
        });
        expect(onTransitionEnd).toHaveBeenCalledTimes(1);

        rerender(
            <AutoHeightSwitcher
                showSlot={AutoHeightSlots.SLOT1}
                {...props}
            />,
        );
        expect(screen.getByText('first slot')).toBeInTheDocument();

        act(() => {
            jest.advanceTimersByTime(50);
        });
        expect(onTransitionEnd).toHaveBeenCalledTimes(2);
    });
});
