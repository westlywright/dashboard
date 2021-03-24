<script>
import { AVAILABLE_USER_TESTS, mapPref } from '@/store/prefs';
import { filterBy } from '@/utils/array';
import isEmpty from 'lodash/isEmpty';
import sortBy from 'lodash/sortBy';

export default {
  data() {
    return { activeUserTest: null, userTestPrefKey: AVAILABLE_USER_TESTS };
  },
  computed: { availabeUserTests: mapPref(AVAILABLE_USER_TESTS) },
  watch:    {
    availabeUserTests() {
      const { availabeUserTests } = this;
      const runningTest = (availabeUserTests || []).find(mut => mut?.isRunning);
      const untriggeredTests = sortBy(
        filterBy(availabeUserTests || [], { triggered: false }),
        'rank'
      );

      if (!isEmpty(runningTest)) {
        this.activeUserTest = runningTest;
        this.$store.commit('utm/setActiveTest', runningTest);
        this.$store.commit('utm/setRunning', true);

        return;
      }

      if (!isEmpty(untriggeredTests) && !isEmpty(untriggeredTests[0])) {
        this.activeUserTest = untriggeredTests[0];
        this.$store.commit('utm/setActiveTest', untriggeredTests[0]);

        this.$nextTick(() => {
          this.$modal.show('user-test');
        });
      }
    },
  },
  methods: {
    startUserTest() {
      this.$store.dispatch('utm/start', this.activeUserTest);

      this.$modal.hide('user-test');
    },
    cancel() {
      this.$modal.hide('user-test');

      this.$store.dispatch('utm/end');
    },
  },
};
</script>

<template>
  <modal
    v-if="activeUserTest"
    class="modal-user-test"
    name="user-test"
    :width="440"
    height="auto"
    :scrollable="true"
  >
    <div class="header">
      <h4 class="text-default-text">
        <span>{{ activeUserTest.title }}</span>
      </h4>
    </div>
    <div class="body">
      <p>
        {{ activeUserTest.content }}
      </p>
    </div>
    <div class="footer">
      <button type="button" class="btn role-primary" @click="startUserTest">
        Start
      </button>
      <button type="button" class="btn role-secondary" @click="cancel">
        Cancel
      </button>
    </div>
  </modal>
</template>

<style lang="scss" scoped>
.modal-user-test {
  .v--modal-box {
    .header {
      background-color: var(--info);
    }
  }
}
</style>
