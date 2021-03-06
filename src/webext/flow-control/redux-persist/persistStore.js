// @flow

import type {
  Persistor,
  PersistConfig,
  PersistorOptions,
  MigrationManifest,
  RehydrateAction,
  RehydrateErrorType,
} from './types'

import { createStore } from 'redux'
import persistReducer from './persistReducer'
import { PERSIST, PURGE, REGISTER, REHYDRATE } from './constants'

type PendingRehydrate = [Object, RehydrateErrorType, PersistConfig]
type Persist = <R>(PersistConfig, MigrationManifest) => R => R // eslint-disable-line no-undef
type CreatePersistor = Object => void
type BoostrappedCb = () => void

const initialState = {
  registry: [],
  bootstrapped: false,
}

const persistorReducer = (state = initialState, action) => {
  switch (action.type) {
    case REGISTER:
      return { ...state, registry: [...state.registry, action.key] }
    case REHYDRATE:  // eslint-disable-line no-case-declarations
      let firstIndex = state.registry.indexOf(action.key)
      let registry = [...state.registry]
      registry.splice(firstIndex, 1)
      return { ...state, registry, bootstrapped: registry.length === 0 }
    default:
      return state
  }
}

export default function persistStore(
  store: Object,
  options: PersistorOptions = {},
  cb?: BoostrappedCb
): Persistor {
  let boostrappedCb = cb || false
  let persistor = createStore(persistorReducer, undefined, options.enhancer)
  persistor.purge = () => {
    store.dispatch({
      type: PURGE,
    })
    return persistor
  }

  let register = (key: string) => {
    persistor.dispatch({
      type: REGISTER,
      key,
    })
  }

  let rehydrate = (key: string, payload: Object, err: any) => {
    let rehydrateAction = {
      type: REHYDRATE,
      payload,
      err,
      key,
    }
    // dispatch to `store` to rehydrate and `persistor` to track result
    store.dispatch(rehydrateAction)
    persistor.dispatch(rehydrateAction)
    if (boostrappedCb && persistor.getState().bootstrapped) {
      boostrappedCb()
      boostrappedCb = false
    }
  }

  store.dispatch({ type: PERSIST, register, rehydrate })

  return persistor
}
