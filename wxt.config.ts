import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'ika-ext',
    description: 'Ikariam helper extension',
    icons: {
      48: 'wxt.svg',
      128: 'wxt.svg',
    },
    permissions: ['tabs', 'storage', 'notifications', 'alarms'],
    host_permissions: ['*://*.ikariam.gameforge.com/*'],
    web_accessible_resources: [
      {
        resources: ['inject.js', 'assets/*.png'],
        matches: ['*://*.ikariam.gameforge.com/*'],
      },
    ],
  },
});
