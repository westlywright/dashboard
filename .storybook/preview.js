import { addParameters } from '@storybook/vue';

import '@/assets/storybook-styles/storybook.scss';
import '@/assets/styles/app.scss';


addParameters({
  layout: 'centered',
  docs: {
    inlineStories: true,
  },
  themes: [
    { name: 'Light Theme', class: [ 'theme-light', 'overflow-hidden', 'dashboard-body', 'rancher-storybook' ], color: '#FFFFFF', default: true },
    { name: 'Dark Theme', class: [ 'theme-dark', 'overflow-hidden', 'dashboard-body', 'rancher-storybook' ], color: '#1B1C21' },
  ],
});
