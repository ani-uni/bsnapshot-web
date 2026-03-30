import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives'
import type { ForgeConfig } from '@electron-forge/shared-types'
import pkg from './backend/package.json' with { type: 'json' }

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    ignore: (file) => {
      if (!file) return false
      if (file === '/package.json') return false
      else if (file === '/LICENSE') return false
      else if (file.startsWith('/electron')) return false
      else if (file.startsWith('/build')) return false
      else return true
    },
    name: pkg.name,
    appBundleId: 'in.rinne.bsnapshot',
    appCategoryType: 'public.app-category.productivity',
    icon: 'assets/icon',
  },
  makers: [
    new MakerSquirrel({}, ['win32']),
    new MakerZIP({}, ['darwin', 'linux']),
    new MakerDeb({}, ['linux']),
  ],
  plugins: [new AutoUnpackNativesPlugin({})],
}

export default config
