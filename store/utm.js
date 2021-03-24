import { AVAILABLE_USER_TESTS } from '@/store/prefs';
import { isEmpty } from 'lodash';
export const state = function() {
  return {
    activeUserTest: null,
    running:        false,
  };
};

export const getters = {
  activeTest: state => () => {
    return state.activeUserTest;
  }
};

export const mutations = {
  setActiveTest(state, test) {
    state.activeUserTest = test;
  },
  setRunning(state, running) {
    state.running = running;
  }
};

export const actions = {
  start({ commit, rootGetters }, test) {
    const { dispatch } = this;
    const availableUserTests = rootGetters['prefs/get'](AVAILABLE_USER_TESTS);
    const matched = availableUserTests.find(t => t.name === test?.name);

    if (!isEmpty(matched)) {
      matched.triggered = true;
      matched.isRunning = true;

      dispatch('prefs/set', {
        key:   AVAILABLE_USER_TESTS,
        value: availableUserTests,
      });

      commit('setActiveTest', test);
      commit('setRunning', true);
    }
  },
  end({ commit, getters, rootGetters }) {
    const { dispatch } = this;
    const activeTest = getters.activeTest();
    const availableUserTests = rootGetters['prefs/get'](AVAILABLE_USER_TESTS);
    const matched = availableUserTests.find(t => t.name === activeTest?.name);

    if (!isEmpty(matched)) {
      matched.isFinished = true;
      matched.isRunning = false;
      matched.triggered = true;

      dispatch('prefs/set', {
        key:   AVAILABLE_USER_TESTS,
        value: availableUserTests,
      });

      commit('setActiveTest', null);
      commit('setRunning', false);
      // todo start next?
    }
  },
};
