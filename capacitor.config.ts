import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.github.mdtokat.mindmash',
  appName: 'Mindmash',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_notify',
      iconColor: '#C8102E',
    },
  },
}

export default config
