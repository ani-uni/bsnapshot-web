import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives'
import type { ForgeConfig } from '@electron-forge/shared-types'

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    ignore: (file) => {
      if (!file) return false
      if (file.includes('package.json') || file.includes('LICENSE'))
        return false
      if (file.includes('/electron') || file.includes('/build')) return false
      return true
    },
  },
  makers: [
    new MakerSquirrel(
      {
        name: 'bsnapshot installer',
        authors: 'Electron contributors',
      },
      ['win32'],
    ),
    new MakerZIP({}, ['darwin']),
    new MakerDeb({}, ['linux']),
  ],
  plugins: [new AutoUnpackNativesPlugin({})],
}

export default config
