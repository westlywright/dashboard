<script>
import { mapPref, AFTER_LOGIN_ROUTE, READ_WHATS_NEW, HIDE_HOME_PAGE_CARDS } from '@/store/prefs';
import Banner from '@/components/Banner';
import BannerGraphic from '@/components/BannerGraphic';
import IndentedPanel from '@/components/IndentedPanel';
import SortableTable from '@/components/SortableTable';
import BadgeState from '@/components/BadgeState';
import CommunityLinks from '@/components/CommunityLinks';
import SimpleBox from '@/components/SimpleBox';
import LandingPagePreference from '@/components/LandingPagePreference';
import { mapGetters } from 'vuex';
import { MANAGEMENT, CAPI } from '@/config/types';
import { NAME as MANAGER } from '@/config/product/manager';
import { STATE } from '@/config/table-headers';
import { MODE, _IMPORT } from '@/config/query-params';
import { createMemoryFormat, createMemoryValues, formatSi, parseSi } from '@/utils/units';
import { getVersionInfo, readReleaseNotes, markReadReleaseNotes, markSeenReleaseNotes } from '@/utils/version';
import PageHeaderActions from '@/mixins/page-actions';
import { getVendor } from '@/config/private-label';
import ConsumptionGauge from '@/components/ConsumptionGauge';
import { get } from '@/utils/object';
import { mapFeature, MULTI_CLUSTER } from '@/store/features';
import { SETTING } from '@/config/settings';

const SET_LOGIN_ACTION = 'set-as-login';
const RESET_CARDS_ACTION = 'reset-homepage-cards';

export default {
  name:       'Home',
  layout:     'home',
  components: {
    Banner,
    BannerGraphic,
    IndentedPanel,
    SortableTable,
    BadgeState,
    CommunityLinks,
    SimpleBox,
    LandingPagePreference,
    ConsumptionGauge
  },

  mixins: [PageHeaderActions],

  async fetch() {
    this.clusters = await this.$store.dispatch('management/findAll', {
      type: MANAGEMENT.CLUSTER,
      opt:  { url: MANAGEMENT.CLUSTER }
    });
  },

  data() {
    const fullVersion = getVersionInfo(this.$store).fullVersion;
    // Page actions don't change on the Home Page
    const pageActions = [
      {
        labelKey: 'nav.header.setLoginPage',
        action:   SET_LOGIN_ACTION
      },
      { seperator: true },
      {
        labelKey: 'nav.header.restoreCards',
        action:   RESET_CARDS_ACTION
      },
    ];

    return {

      HIDE_HOME_PAGE_CARDS, clusters: [], fullVersion, pageActions, vendor: getVendor(), clusterDetail: null,
    };
  },

  computed: {
    ...mapGetters(['currentCluster']),
    mcm: mapFeature(MULTI_CLUSTER),

    createLocation() {
      return {
        name:   'c-cluster-product-resource-create',
        params: {
          product:  MANAGER,
          cluster:  this.currentCluster?.id || 'local',
          resource: CAPI.RANCHER_CLUSTER
        },
      };
    },

    importLocation() {
      return {
        name:   'c-cluster-product-resource-create',
        params: {
          product:  MANAGER,
          cluster:  this.currentCluster?.id || 'local',
          resource: CAPI.RANCHER_CLUSTER
        },
        query: { [MODE]: _IMPORT }
      };
    },

    afterLoginRoute: mapPref(AFTER_LOGIN_ROUTE),
    homePageCards:   mapPref(HIDE_HOME_PAGE_CARDS),

    readWhatsNewAlready() {
      return readReleaseNotes(this.$store);
    },

    showSidePanel() {
      return this.showCommercialSupport || !this.homePageCards.communitySupportTip;
    },

    clusterHeaders() {
      return [
        STATE,
        {
          name:          'name',
          labelKey:      'tableHeaders.name',
          value:         'nameDisplay',
          sort:          ['nameSort'],
          canBeVariable: true,
        },
        {
          label: this.t('landing.clusters.provider'),
          value: 'status.provider',
          name:  'Provider',
          sort:  ['status.provider'],
        },
        {
          label: this.t('landing.clusters.kubernetesVersion'),
          value: 'kubernetesVersion',
          name:  'Kubernetes Version'
        },
        {
          label: this.t('tableHeaders.cpu'),
          value: '',
          name:  'cpu',
          sort:  ['status.allocatable.cpu', 'status.available.cpu']

        },
        {
          label: this.t('tableHeaders.memory'),
          value: '',
          name:  'memory',
          sort:  ['status.allocatable.memory', 'status.available.memory']

        },
        {
          label: this.t('tableHeaders.pods'),
          name:  'pods',
          value: '',
          sort:  ['status.allocatable.pods', 'status.available.pods']
        },
        // {
        //   name:  'explorer',
        //   label:  this.t('landing.clusters.explorer')
        // }
      ];
    },

    showCommercialSupport() {
      const hasSupport = this.$store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.SUPPORTED) || {};

      return !this.homePageCards.commercialSupportTip && hasSupport.value !== 'true';
    },

    ...mapGetters(['currentCluster', 'defaultClusterId'])
  },

  watch: {
    async clusters(neu) {
      if (!this.mcm) {
        this.clusterDetail = neu[1];
        const nodeMetrics = await this.clusterDetail.fetchNodeMetrics();

        this.$set(this.clusterDetail, 'metrics', {
          cpu:    {
            total: parseInt(get(this.clusterDetail, 'status.capacity.cpu')),
            used:  nodeMetrics?.cpu || 0
          },
          memory: createMemoryValues(get(this.clusterDetail, 'status.capacity.memory'), nodeMetrics?.memory || 0 )
        });
      }
    }
  },

  async created() {
    // Update last visited on load
    await this.$store.dispatch('prefs/setLastVisited', { name: 'home' });
    markSeenReleaseNotes(this.$store);
  },

  methods: {
    handlePageAction(action) {
      if (action.action === RESET_CARDS_ACTION) {
        this.resetCards();
      } else if (action.action === SET_LOGIN_ACTION) {
        this.afterLoginRoute = 'home';
      }
    },

    cpuUsed(cluster) {
      return parseSi(cluster.status.requested?.cpu);
    },

    cpuAllocatable(cluster) {
      return parseSi(cluster.status.allocatable?.cpu);
    },

    memoryUsed(cluster) {
      const parsedUsed = (parseSi(cluster.status.requested?.memory) || 0).toString();
      const format = createMemoryFormat(parsedUsed);

      return formatSi(parsedUsed, format);
    },

    memoryAllocatable(cluster) {
      const parsedAllocatable = (parseSi(cluster.status.allocatable?.memory) || 0).toString();
      const format = createMemoryFormat(parsedAllocatable);

      return formatSi(parsedAllocatable, format);
    },

    showWhatsNew() {
      // Update the value, so that the message goes away
      markReadReleaseNotes(this.$store);
      this.$router.push({ name: 'docs-doc', params: { doc: 'release-notes' } });
    },

    async resetCards() {
      await this.$store.dispatch('prefs/set', { key: HIDE_HOME_PAGE_CARDS, value: {} });
      await this.$store.dispatch('prefs/set', { key: READ_WHATS_NEW, value: '' });
    },
    get,
    parseSi
  }
};

</script>
<template>
  <div class="home-page">
    <BannerGraphic :small="true" :title="t('landing.welcomeToRancher', {vendor})" :pref="HIDE_HOME_PAGE_CARDS" pref-key="welcomeBanner" />
    <IndentedPanel class="mt-20 mb-20">
      <div v-if="!readWhatsNewAlready" class="row">
        <div class="col span-12">
          <Banner color="info whats-new">
            <div>{{ t('landing.seeWhatsNew') }}</div>
            <a class="hand" @click.prevent.stop="showWhatsNew"><span v-html="t('landing.whatsNewLink')" /></a>
          </Banner>
        </div>
      </div>

      <div
        v-if="!mcm && clusterDetail"
        class="cluster-dashboard-glance"
      >
        <div>
          <label>{{ t('glance.provider') }}: </label>
          <span>
            {{ t(`cluster.provider.${ clusterDetail.status.provider || 'other' }`) }}</span>
        </div>
        <div>
          <label>{{ t('glance.version') }}: </label>
          <span v-if="clusterDetail.kubernetesVersionExtension" style="font-size: 0.5em">{{ clusterDetail.kubernetesVersionExtension }}</span>
          <span>{{ clusterDetail.kubernetesVersionBase }}</span>
        </div>
        <div>
          <label>{{ t('glance.created') }}: </label>
          <span><LiveDate :value="clusterDetail.metadata.creationTimestamp" :add-suffix="true" :show-tooltip="true" /></span>
        </div>

        <div class="glance-gauge">
          <span>{{ t('landing.clusters.cpuUsed') }}:</span>

          <ConsumptionGauge

            :capacity="get(clusterDetail, 'metrics.cpu.total')"
            :used="get(clusterDetail, 'metrics.cpu.used')"
          >
            <template #title>
              <span class="text-muted">
                {{ get(clusterDetail, 'metrics.cpu.used') || 0 }} / {{ get(clusterDetail, 'metrics.cpu.total') }}
              </span>
            </template>
          </ConsumptionGauge>
        </div>
        <div class="glance-gauge">
          <span>{{ t('landing.clusters.memoryUsed') }}:</span>
          <ConsumptionGauge
            :units="get(clusterDetail, 'metrics.memory.units')"
            :capacity="get(clusterDetail, 'metrics.memory.total')"
            :used="get(clusterDetail, 'metrics.memory.used')"
          >
            <template #title>
              <span class="text-muted">
                {{ get(clusterDetail, 'metrics.memory.used') || 0 }} / {{ get(clusterDetail, 'metrics.memory.total') }}{{ get(clusterDetail, 'metrics.memory.units') }}
              </span>
            </template>
          </ConsumptionGauge>
        </div>
        <div :style="{'flex':1}" />
      </div>

      <div class="row">
        <div :class="{'span-9': showSidePanel, 'span-12': !showSidePanel }" class="col">
          <SimpleBox
            id="migration"
            class="panel"
            :title="t('landing.gettingStarted.title')"
            :pref="HIDE_HOME_PAGE_CARDS"
            pref-key="migrationTip"
          >
            <div class="getting-started">
              <span>
                {{ t('landing.gettingStarted.body') }}
              </span>
              <nuxt-link :to="{name: 'docs-doc', params: {doc: 'getting-started'}}" class="getting-started-btn">
                {{ t('landing.learnMore') }}
              </nuxt-link>
            </div>
          </SimpleBox>
          <SimpleBox :title="t('landing.landingPrefs.title')" :pref="HIDE_HOME_PAGE_CARDS" pref-key="setLoginPage" class="panel">
            <LandingPagePreference />
          </SimpleBox>
          <div class="row panel">
            <div v-if="mcm" class="col span-12">
              <SortableTable :table-actions="false" :row-actions="false" key-field="id" :rows="clusters" :headers="clusterHeaders">
                <template #header-left>
                  <div class="row table-heading">
                    <h2 class="mb-0">
                      {{ t('landing.clusters.title') }}
                    </h2>
                    <BadgeState :label="clusters.length.toString()" color="role-tertiary ml-20 mr-20" />
                  </div>
                </template>
                <template #header-middle>
                  <n-link
                    :to="importLocation"
                    class="btn btn-sm role-primary"
                  >
                    {{ t('cluster.importAction') }}
                  </n-link>
                  <n-link
                    :to="createLocation"
                    class="btn btn-sm role-primary"
                  >
                    {{ t('generic.create') }}
                  </n-link>
                </template>
                <template #col:name="{row}">
                  <td>
                    <span>
                      <n-link v-if="row.isReady" :to="{ name: 'c-cluster-explorer', params: { cluster: row.id }}">
                        {{ row.nameDisplay }}
                      </n-link>
                      <span v-else>{{ row.nameDisplay }}</span>
                    </span>
                  </td>
                </template>
                <template #col:cpu="{row}">
                  <td v-if="cpuAllocatable(row)">
                    {{ `${cpuUsed(row)}/${cpuAllocatable(row)} ${t('landing.clusters.cores', {count:cpuAllocatable(row) })}` }}
                  </td>
                  <td v-else>
                    &mdash;
                  </td>
                </template>
                <template #col:memory="{row}">
                  <td v-if="memoryAllocatable(row) && !memoryAllocatable(row).match(/^0 [a-zA-z]/)">
                    {{ `${memoryUsed(row)}/${memoryAllocatable(row)}` }}
                  </td>
                  <td v-else>
                    &mdash;
                  </td>
                </template>
                <template #col:pods="{row}">
                  <td v-if="row.status.allocatable && row.status.allocatable.pods!== '0'">
                    {{ `${row.status.requested.pods}/${row.status.allocatable.pods}` }}
                  </td>
                  <td v-else>
                    &mdash;
                  </td>
                </template>
                <!-- <template #cell:explorer="{row}">
                  <n-link v-if="row && row.isReady" class="btn btn-sm role-primary" :to="{name: 'c-cluster', params: {cluster: row.id}}">
                    {{ t('landing.clusters.explore') }}
                  </n-link>
                  <button v-else :disabled="true" class="btn btn-sm role-primary">
                    {{ t('landing.clusters.explore') }}
                  </button>
                </template> -->
              </SortableTable>
            </div>
          </div>
        </div>
        <div v-if="showSidePanel" class="col span-3">
          <CommunityLinks :pref="HIDE_HOME_PAGE_CARDS" pref-key="communitySupportTip" class="mb-20" />
          <SimpleBox v-if="showCommercialSupport" :pref="HIDE_HOME_PAGE_CARDS" pref-key="commercialSupportTip" :title="t('landing.commercial.title')">
            <nuxt-link :to="{ path: 'support'}">
              {{ t('landing.commercial.body') }}
            </nuxt-link>
          </SimpleBox>
        </div>
      </div>
    </IndentedPanel>
  </div>
</template>
<style lang='scss' scoped>
.cluster-dashboard-glance {
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 20px;
  margin-bottom: 40px;
  display: flex;

  &>*:not(:last-child) {
    margin-right: 40px;

    & SPAN {
       font-weight: bold
    }
  }

  .glance-gauge{
    display:flex;
    flex:1;
    &>span {
      padding-right: 5px;
    }

    & .consumption-gauge {
      flex-grow: 1;
      max-width: 100px;
      position:relative;

      & >:first-child {
        font-size: 12px;
        position: absolute;
        bottom: calc(-1em - 3px);
        right:  0;
      }
      & >:last-child{
        margin-top: 0 !important;
        flex:1;
      }
    }
  }
}
  .banner.info.whats-new {
    border: 0;
    margin-top: 10px;
    display: flex;
    align-items: center;
    flex-direction: row;
    > div {
      flex: 1;
    }
    > a {
      align-self: flex-end;
    }
  }
  .table-heading {
    align-items: center;
  }
  .panel:not(:first-child) {
    margin-top: 20px;
  }
  .getting-started {
    align-items: flex-end;
    display: flex;

    > span {
      flex: 1;
      margin-right: 20px;
    }
  }
  .getting-started-btn {
    display: contents;
    white-space: nowrap;
  }
</style>
<style lang="scss">
.home-page {
  .search > INPUT {
    background-color: transparent;
    padding: 8px;
  }

  h2 {
    font-size: 16px;
  }
}
</style>
