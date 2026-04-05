import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives'
import { FusesPlugin } from '@electron-forge/plugin-fuses'
import { PublisherGithub } from '@electron-forge/publisher-github'
import type { ForgeConfig } from '@electron-forge/shared-types'
import { FuseV1Options, FuseVersion } from '@electron/fuses'
import { MakerAppImage } from '@reforged/maker-appimage'

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    ignore: (file) => {
      if (!file) return false
      if (file === '/package.json') return false
      else if (file === '/LICENSE') return false
      else if (file.startsWith('/electron')) return false
      else if (
        file === '/node_modules' ||
        file.startsWith('/node_modules/electron-squirrel-startup')
      )
        return false
      else if (file.startsWith('/build')) return false
      else if (file === '/backend' || file === '/backend/package.json')
        return false
      else return true
    },
    appBundleId: 'in.rinne.bsnapshot',
    appCategoryType: 'public.app-category.productivity',
    icon: 'assets/icon',
  },
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
    }),
  ],
  makers: [
    new MakerSquirrel({}, ['win32']),
    new MakerZIP({}, ['darwin']),
    new MakerDeb({}, ['linux']),
    new MakerAppImage({}, ['linux']),
  ],
  publishers: [
    new PublisherGithub({
      repository: {
        owner: 'ani-uni',
        name: 'BSnapshot',
      },
      draft: true,
      prerelease: false,
      generateReleaseNotes: true,
    }),
  ],
}

export default config
