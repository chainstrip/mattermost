// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react';

import {renderHookWithContext} from 'tests/react_testing_utils';

import {useListTableRowDnd} from './use_list_table_row_dnd';

// Companion to use_list_table_row_dnd.test.ts, which fully mocks
// @atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge (as every existing
// PDND test in this repo does, because native HTML5 drag events aren't
// available in jsdom). attachClosestEdge/extractClosestEdge are pure
// geometry helpers keyed off element.getBoundingClientRect() and cursor
// coordinates though - they don't need a real drag to run - so this file
// leaves that module unmocked to exercise the real dependency code the
// getData/onDrag closures call.
type DraggableConfig = {
    element: HTMLElement;
    dragHandle?: HTMLElement;
    getInitialData: () => Record<string, unknown>;
    onGenerateDragPreview: (args: {nativeSetDragImage: jest.Mock}) => void;
};

type DropTargetConfig = {
    element: HTMLElement;
    canDrop: (args: {source: {data: Record<string, unknown>}}) => boolean;
    getData: (args: {input: {clientX: number; clientY: number}; element: HTMLElement}) => Record<string | symbol, unknown>;
    onDrag: (args: {self: {data: Record<string | symbol, unknown>}}) => void;
    onDragLeave: () => void;
    onDrop: () => void;
};

const mockDropTargetRegistrations: DropTargetConfig[] = [];

jest.mock('@atlaskit/pragmatic-drag-and-drop/element/adapter', () => ({
    draggable: () => jest.fn(),
    dropTargetForElements: (config: DropTargetConfig) => {
        mockDropTargetRegistrations.push(config);
        return jest.fn();
    },
}));

jest.mock('@atlaskit/pragmatic-drag-and-drop/combine', () => ({
    combine: (...cleanups: Array<() => void>) => () => {
        for (const c of cleanups) {
            c();
        }
    },
}));

jest.mock('@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview', () => ({
    setCustomNativeDragPreview: jest.fn(),
}));

function makeRow(rect: {top: number; bottom: number; left: number; right: number}) {
    const row = document.createElement('tr');
    row.getBoundingClientRect = () => ({
        ...rect,
        x: rect.left,
        y: rect.top,
        width: rect.right - rect.left,
        height: rect.bottom - rect.top,
        toJSON() { return this; },
    });
    return row;
}

describe('useListTableRowDnd - real closest-edge dependency', () => {
    beforeEach(() => {
        mockDropTargetRegistrations.length = 0;
    });

    test('getData attaches the real closest-edge value nearest the cursor, and onDrag extracts it back out', () => {
        const rowElement = makeRow({top: 0, bottom: 100, left: 0, right: 200});

        const {result} = renderHookWithContext(() => useListTableRowDnd({
            dragKind: 'list-table-row:test',
            rowId: 'row-1',
            rowIndex: 0,
            rowElement,
            handleElement: null,
            enabled: true,
        }));

        const target = mockDropTargetRegistrations[0];

        // Cursor near the top edge (y=10 of a 0-100 row) - real attachClosestEdge
        // picks whichever of the allowed edges (top/bottom) is geometrically closer.
        const dataNearTop = target.getData({input: {clientX: 50, clientY: 10}, element: rowElement});
        expect(dataNearTop).toMatchObject({kind: 'list-table-row:test', rowId: 'row-1', rowIndex: 0});

        act(() => {
            target.onDrag({self: {data: dataNearTop}});
        });
        expect(result.current.closestEdge).toBe('top');

        // Cursor near the bottom edge (y=90 of a 0-100 row).
        const dataNearBottom = target.getData({input: {clientX: 50, clientY: 90}, element: rowElement});

        act(() => {
            target.onDrag({self: {data: dataNearBottom}});
        });
        expect(result.current.closestEdge).toBe('bottom');
    });

    test('extractClosestEdge returns null for a payload that was never passed through attachClosestEdge', () => {
        const rowElement = makeRow({top: 0, bottom: 100, left: 0, right: 200});

        const {result} = renderHookWithContext(() => useListTableRowDnd({
            dragKind: 'list-table-row:test',
            rowId: 'row-1',
            rowIndex: 0,
            rowElement,
            handleElement: null,
            enabled: true,
        }));

        const target = mockDropTargetRegistrations[0];

        act(() => {
            target.onDrag({self: {data: {kind: 'list-table-row:test'}}});
        });

        expect(result.current.closestEdge).toBeNull();
    });
});
