import { join } from 'node:path';
import { defineConfig } from 'wxt';

const ICONS = ['icon-48.png', 'icon-128.png'] as const;

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  hooks: {
    'build:publicAssets': (wxt, files) => {
      for (const icon of ICONS) {
        files.push({
          absoluteSrc: join(wxt.config.root, 'public', icon),
          relativeDest: icon,
        });
      }
    },
  },
  manifest: {
    name: 'ika-ext',
    description: 'Ikariam helper extension',
    icons: {
      48: 'icon-48.png',
      128: 'icon-128.png',
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
