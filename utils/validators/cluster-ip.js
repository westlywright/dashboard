import isEmpty from 'lodash/isEmpty';
import isIp from 'is-ip';

export function clusterIp(clusterIp, service, validatorArgs) {
  const {
    serviceType: { id: serviceType },
    $rootGetters: getters
  } = service;
  const errors = [];
  // clusterIP is the IP address of the service and is usually assigned randomly by the master. If an address is specified manually and is not in use by others, it will be allocated to the service; otherwise, creation of the service will fail. This field can not be changed through updates. Valid values are \"None\", empty string (\"\"), or a valid IP address. \"None\" can be specified for headless services when proxying is not required. Only applies to types ClusterIP, NodePort, and LoadBalancer. Ignored if type is ExternalName. More info: https://kubernetes.io/docs/concepts/services-networking/service/#virtual-ips-and-service-proxies

  if (serviceType) {
    switch (serviceType) {
    case 'ExternalName':
      break;
    case 'Headless':
      if (clusterIp !== 'None') {
        errors.push('Headless service requires clusterIP to be set to "None"');
      }
      break;
    default:
      if (!isEmpty(clusterIp)) {
        if (clusterIp !== '' && clusterIp !== 'None' && !isIp(clusterIp)) {
          errors.push(getters['i18n/t']('validation.ipAddress', { key: 'Cluster IP' }));
        }
      } else {
        errors.push(getters['i18n/t']('validation.required', { key: 'Cluster IP' }));
      }

      break;
    }
  } else {
    errors.push(getters['i18n/t']('validation.service.type'));
  }

  return errors;
}
