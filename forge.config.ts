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
      if (file === '/package.json') return false
      else if (file === '/LICENSE') return false
      else if (file.startsWith('/electron')) return false
      else if (file.startsWith('/build')) return false
      else return true
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
