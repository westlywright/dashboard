<script>
import InfoBox from '@/components/InfoBox';
import Checkbox from '@/components/form/Checkbox';
import CopyCode from '@/components/CopyCode';
import LabeledInput from '@/components/form/LabeledInput';
import KeyValue from '@/components/form/KeyValue';
import Taints from '@/components/form/Taints';
import RadioGroup from '@/components/form/RadioGroup';

export default {
  components: {
    Checkbox, CopyCode, InfoBox, KeyValue, LabeledInput, Taints, RadioGroup
  },

  props: {
    clusterToken: {
      type:     Object,
      required: true,
    }
  },

  data() {
    return {
      nodeOsTypes:     [{ label: 'Linux', value: 'linux' }, { label: 'Windows', value: 'windows' }],
      nodeOsType:      'linux', // current design states cluster won't have a windows specific parameter, the only way to find this would be to look up additional windows kubelet args but those are currently unknown.
      showAdvanced:    false,
      etcd:            true,
      controlPlane:    true,
      worker:          true,
      insecure:        false,
      address:         '',
      internalAddress: '',
      nodeName:        '',
      labels:          {},
      taints:          []
    };
  },

  computed: {
    command() {
      const windowsCmdPostfix = ` | iex}"`;
      let out;

      if (this.isWindows) {
        out = [this.clusterToken?.windowsNodeCommand.replace('--isolation hyperv ', '').replace(windowsCmdPostfix, '')];
      } else {
        out = this.insecure ? [this.clusterToken.insecureNodeCommand] : [this.clusterToken.nodeCommand];

        this.etcd && out.push('--etcd');
        this.controlPlane && out.push('--controlplane');
      }

      this.worker && out.push('--worker');
      this.address && out.push(`--address ${ this.address }`);
      this.internalAddress && out.push(`--internal-address ${ this.internalAddress }`);
      this.nodeName && out.push(`--node-name ${ this.nodeName }`);

      for ( const key in this.labels ) {
        const k = sanitizeKey(key);
        const v = sanitizeValue(this.labels[k]);

        if ( k && v ) {
          out.push(`--label ${ k }=${ v }`);
        }
      }

      for ( const t of this.taints ) {
        const k = sanitizeKey(t.key);
        const v = sanitizeValue(t.value);
        const e = sanitizeValue(t.effect);

        if ( k && v && e ) {
          out.push(`--taint ${ k }=${ v }:${ e }`);
        }
      }

      if (this.isWindows) {
        out.push(windowsCmdPostfix);
      }

      return out.join(' ');
    },
    isWindows() {
      return this.nodeOsType === 'windows';
    },
  },

  watch: {
    nodeOsType(neu) {
      if (neu === 'windows') {
        this.etcd = false;
        this.controlPlane = false;
      }
    },
  },

  methods: {
    toggleAdvanced() {
      this.showAdvanced = !this.showAdvanced;
    },
  },
};

function sanitizeKey(k) {
  return (k || '').replace(/[^a-z0-9./_-]/ig, '');
}

function sanitizeValue(v) {
  return (v || '').replace(/[^a-z0-9._-]/ig, '');
}
</script>

<template>
  <div>
    <InfoBox :step="1" class="step-box">
      <h3 v-t="'cluster.custom.nodeType.label'" />
      <h4 v-t="'cluster.custom.nodeType.detail'" />
      <RadioGroup
        v-model="nodeOsType"
        name="node-os-type"
        :options="nodeOsTypes"
      />
    </InfoBox>

    <InfoBox :step="2" class="step-box">
      <h3 v-t="'cluster.custom.nodeRole.label'" />
      <h4 v-t="'cluster.custom.nodeRole.detail'" />
      <Checkbox v-model="etcd" :disabled="isWindows" label-key="model.machine.role.etcd" />
      <Checkbox v-model="controlPlane" :disabled="isWindows" label-key="model.machine.role.controlPlane" />
      <Checkbox v-model="worker" label-key="model.machine.role.worker" />
    </InfoBox>

    <InfoBox v-if="showAdvanced" :step="3" class="step-box">
      <h3 v-t="'cluster.custom.advanced.label'" />
      <h4 v-t="'cluster.custom.advanced.detail'" />

      <div class="row mb-10">
        <div class="col span-4">
          <LabeledInput v-model="nodeName" label="Node Name" />
        </div>
        <div class="col span-4">
          <LabeledInput v-model="address" label="Node Public IP" />
        </div>
        <div class="col span-4">
          <LabeledInput v-model="internalAddress" label="Node Private IP" />
        </div>
      </div>

      <KeyValue v-model="labels" class="mb-10" mode="edit" title="Node Labels" :read-allowed="false" />

      <Taints v-model="taints" class="mb-10" mode="edit" :value="taints" />

      <a v-t="'generic.hideAdvanced'" @click="toggleAdvanced" />
    </InfoBox>

    <div v-else class="mb-20">
      <a v-t="'generic.showAdvanced'" @click="toggleAdvanced" />
    </div>

    <InfoBox :step="showAdvanced ? 4 : 3" class="step-box">
      <h3 v-t="'cluster.custom.registrationCommand.label'" />
      <h4 v-t="'cluster.custom.registrationCommand.detail'" />
      <CopyCode class="m-10 p-10">
        {{ command }}
      </CopyCode>

      <Checkbox v-model="insecure" label-key="cluster.custom.registrationCommand.insecure" />
    </InfoBox>
  </div>
</template>
