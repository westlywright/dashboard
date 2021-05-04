import { NAME as EXPLORER } from '@/config/product/explorer';
import { findBy } from '@/utils/array';
import { SETUP, TIMED_OUT } from '@/config/query-params';
import { NORMAN } from '@/config/types';
import { applyProducts } from '@/store/type-map';
import { ClusterNotFoundError } from '@/utils/error';
import { get } from '@/utils/object';

let beforeEachSetup = false;

function setProduct(store, to) {
  let product = to.params?.product;

  if ( !product ) {
    const match = to.name?.match(/^c-cluster-([^-]+)/);

    if ( match ) {
      product = match[1];
    }
  }

  if ( !product ) {
    product = EXPLORER;
  }

  store.commit('setProduct', product);
}

export default async function({
  route, app, store, redirect, req, isDev
}) {
  if ( route.path && typeof route.path === 'string') {
    // Ignore webpack hot module reload requests
    if ( route.path.startsWith('/__webpack_hmr/') ) {
      return;
    }

    // Ignore the error page
    if ( route.path.startsWith('/fail-whale') ) {
      return;
    }
  }
  // Initial ?setup=admin-password can technically be on any route
  const initialPass = route.query[SETUP];
  const firstLogin = await store.dispatch('rancher/find', {
    type: 'setting',
    id:   'first-login',
    opt:  { url: `/v3/settings/first-login` }
  });

  // TODO show error if firstLogin and default pass doesn't work
  if (firstLogin && firstLogin.value === 'true' ) {
    const ok = await tryInitialSetup(store, initialPass);

    if (ok) {
      if (initialPass) {
        return redirect({ name: 'auth-setup', query: { [SETUP]: initialPass } });
      } else {
        return redirect({ name: 'auth-setup' });
      }
    } else {
      const t = store.getters['i18n/t'];

      return redirect({ name: 'auth-login', query: { err: t('setup.defaultPasswordError') } });
    }
  }

  // Make sure you're actually logged in
  if ( store.getters['auth/enabled'] !== false && !store.getters['auth/loggedIn'] ) {
    try {
      const principals = await store.dispatch('rancher/findAll', {
        type: NORMAN.PRINCIPAL,
        opt:  {
          url:                  '/v3/principals',
          redirectUnauthorized: false,
        }
      });

      const me = findBy(principals, 'me', true);

      store.commit('auth/hasAuth', true);
      store.commit('auth/loggedInAs', me.id);
    } catch (e) {
      const status = e?._status;

      if ( status === 404 ) {
        store.commit('auth/hasAuth', false);
      } else {
        store.commit('auth/hasAuth', true);

        if ( status === 401 ) {
          if ( route.name === 'index' ) {
            return redirect(302, '/auth/login');
          } else {
            return redirect(302, `/auth/login?${ TIMED_OUT }`);
          }
        } else {
          store.commit('setError', e);
          console.log(JSON.stringify(e)); // eslint-disable-line no-console
        }

        return;
      }
    }
  }

  // Load stuff
  await applyProducts(store);

  // Setup a beforeEach hook once to keep track of the current product
  if ( !beforeEachSetup ) {
    beforeEachSetup = true;

    store.app.router.beforeEach((to, from, next) => {
      setProduct(store, to);
      next();
    });

    // Call it for the initial pageload
    setProduct(store, route);
  }

  try {
    let clusterId = get(route, 'params.cluster');

    if ( clusterId ) {
      // Run them in parallel
      await Promise.all([
        await store.dispatch('loadManagement'),
        await store.dispatch('loadCluster', clusterId),
      ]);
    } else {
      await store.dispatch('loadManagement');

      clusterId = store.getters['defaultClusterId']; // This needs the cluster list, so no parallel

      if ( clusterId ) {
        await store.dispatch('loadCluster', clusterId);
      }
    }
  } catch (e) {
    if ( e instanceof ClusterNotFoundError ) {
      return redirect(302, '/clusters');
    } else {
      store.commit('setError', e);

      return redirect(302, '/fail-whale');
    }
  }
}

async function tryInitialSetup(store, password = 'admin') {
  try {
    const res = await store.dispatch('auth/login', {
      provider: 'local',
      body:     {
        username: 'admin',
        password
      },
    });

    return res._status === 200;
  } catch (e) {
    console.error('Error trying initial setup', e); // eslint-disable-line no-console

    return false;
  }
}
