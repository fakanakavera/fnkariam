import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'ika-ext',
    description: 'Ikariam helper extension',
    permissions: ['tabs', 'storage'],
    host_permissions: ['*://*.ikariam.gameforge.com/*'],
    web_accessible_resources: [
      {
        resources: ['inject.js', 'assets/*.png'],
        matches: ['*://*.ikariam.gameforge.com/*'],
      },
    ],
  },
});
