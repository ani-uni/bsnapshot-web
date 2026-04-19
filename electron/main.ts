import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { app, BrowserWindow, net, protocol, utilityProcess } from 'electron'
import started from 'electron-squirrel-startup'

import fpkg from '../package.json' with { type: 'json' }

if (started) app.quit()

let serverProcess: ReturnType<typeof utilityProcess.fork> | null = null

function getResourcePath() {
  const root = app.isPackaged
    ? app.getAppPath()
    : path.join(app.getAppPath(), '../')
  return root
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
])

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
  })
  win.loadURL('app:bundle')
}
const startServer = async () => {
  const dataPath = path.resolve(app.getPath('userData'), './.data'),
    dbPath = path.resolve(dataPath, './db/prisma.db')
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
    fs.writeFileSync(dbPath, '')
  }
  serverProcess = utilityProcess.fork(
    path.resolve(getResourcePath(), './build/server/index.mjs'),
    undefined,
    {
      env: {
        ...process.env,
        NITRO_PORT: '45600',
        NITRO_HOST: 'localhost',
        DATABASE_URL: `file:${dbPath}`, // 可选，会基于下方USER_DATA_PATH自动生成
        USER_DATA_PATH: app.getPath('userData'),
      },
      stdio: 'pipe',
    },
  )
  const COLOR = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
    gray: '\x1b[90m',
  }
  serverProcess.stdout?.on('data', (data) => {
    console.info(`${COLOR.cyan}[子进程 stdout] begin${COLOR.reset}`)
    console.info(`${COLOR.gray}${data.toString()}${COLOR.reset}`)
    console.info(`${COLOR.cyan}[子进程 stdout] end${COLOR.reset}`)
  })
  serverProcess.stderr?.on('data', (data) => {
    console.error(`${COLOR.red}[子进程 stderr] begin${COLOR.reset}`)
    console.error(`${COLOR.red}${data.toString()}${COLOR.reset}`)
    console.error(`${COLOR.red}[子进程 stderr] end${COLOR.reset}`)
  })
}

app
  .whenReady()
  .then(async () => {
    await startServer()
    protocol.handle('app', (req) => {
      const { host, pathname } = new URL(req.url)
      const pathToServe = pathname.startsWith('/assets')
        ? pathname
        : '/index.html'
      if (pathToServe.includes('..')) {
        return new Response('bad', {
          status: 400,
          headers: { 'content-type': 'text/html' },
        })
      }
      if (host === 'bundle') {
        return net.fetch(
          pathToFileURL(
            path.resolve(getResourcePath(), './build/client') + pathToServe,
          ).toString(),
        )
      } else if (host === 'v0') {
        const url = new URL(fpkg.homepage)
        url.pathname = pathToServe
        return net.fetch(url.toString())
      } else
        return new Response('not found', {
          status: 404,
          headers: { 'content-type': 'text/html' },
        })
    })

    createWindow()

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })
  .catch((err) => {
    console.error('[启动失败]', err)
    app.exit(1)
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    serverProcess?.kill()
    app.quit()
  }
})
