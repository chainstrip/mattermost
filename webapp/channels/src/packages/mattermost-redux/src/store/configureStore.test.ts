// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {AnyAction, Reducer} from 'redux';

import configureStore from './configureStore';
import reducerRegistry from './reducer_registry';

describe('configureStore', () => {
    const counter: Reducer<number, AnyAction> = (state = 0, action) => {
        return action.type === 'INCREMENT' ? state + 1 : state;
    };

    afterEach(() => {
        reducerRegistry.setReducers({});
        reducerRegistry.setChangeListener(() => {});
    });

    test('should build a store that combines the service reducers with the app reducers', () => {
        const store = configureStore({appReducers: {counter}});

        const state = store.getState() as unknown as {counter: number; entities: unknown; requests: unknown};
        expect(state.counter).toBe(0);
        expect(state.entities).toBeDefined();
        expect(state.requests).toBeDefined();

        store.dispatch({type: 'INCREMENT'});

        expect((store.getState() as unknown as {counter: number}).counter).toBe(1);
    });

    test('should apply preloaded state on top of the initial state', () => {
        const store = configureStore({
            appReducers: {counter},
            preloadedState: {counter: 41} as any,
        });

        store.dispatch({type: 'INCREMENT'});

        expect((store.getState() as unknown as {counter: number}).counter).toBe(42);
    });

    test('should support thunks and hand them the loaders extra argument', () => {
        const store = configureStore({appReducers: {counter}});

        const seen = store.dispatch(((dispatch: any, getState: any, extra: any) => {
            dispatch({type: 'INCREMENT'});
            return {count: getState().counter, extra};
        }) as any) as unknown as {count: number; extra: unknown};

        expect(seen.count).toBe(1);
        expect(seen.extra).toEqual({loaders: {}});
    });

    test('should swap in reducers registered after the store was created', () => {
        const store = configureStore({appReducers: {counter}});

        expect((store.getState() as any).late).toBeUndefined();

        const late: Reducer<string, AnyAction> = (state = 'initial', action) => {
            return action.type === 'SET_LATE' ? action.value : state;
        };
        reducerRegistry.register('late', late);

        expect((store.getState() as any).late).toBe('initial');

        store.dispatch({type: 'SET_LATE', value: 'changed'});
        store.dispatch({type: 'INCREMENT'});

        const state = store.getState() as any;
        expect(state.late).toBe('changed');
        expect(state.counter).toBe(1);
    });
});
