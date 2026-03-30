import { fork } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, net, protocol } from 'electron'
import started from 'electron-squirrel-startup'
import pkg from '../backend/package.json' with { type: 'json' }

if (started) app.quit()

let serverProcess: ReturnType<typeof fork> | null = null

function getResourcePath() {
  const root = app.isPackaged
    ? path.join(app.getAppPath(), 'resources')
    : app.getAppPath()
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
  const mg: { r: boolean; s: number | string; e: number | string } = {
    r: false,
    s: 0,
    e: 0,
  }
  const dataPath = path.resolve(app.getPath('userData'), './.data'),
    dbPath = path.resolve(dataPath, './db/prisma.db'),
    dbMigrationLockPath = path.resolve(dataPath, './db/prisma.migration-lock')
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
    fs.writeFileSync(dbPath, '')
    fs.writeFileSync(dbMigrationLockPath, pkg.version)
    mg.r = true
    mg.s = 0
  } else if (fs.existsSync(dbMigrationLockPath)) {
    const dbMigrationLock = fs.readFileSync(dbMigrationLockPath, 'utf-8')
    if (dbMigrationLock < pkg.version) {
      mg.r = true
      mg.s = dbMigrationLock
    }
  }
  // process.env.NITRO_PORT = '45600'
  // process.env.NITRO_HOST = 'localhost'
  // await import('../backend/.output/server/index.mjs')
  serverProcess = fork(
    path.resolve(getResourcePath(), '../backend/.output/server/index.mjs'),
    {
      env: {
        ...process.env,
        NITRO_PORT: '45600',
        // NITRO_HOST: '127.0.0.1',
        // DATABASE_URL: 'file:.data/db/prisma.db',
        DATABASE_URL: `file:${dbPath}`, // 可选，会基于下方USER_DATA_PATH自动生成
        USER_DATA_PATH: app.getPath('userData'),
      },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    },
  )
  console.log(dbPath, app.getPath('userData'))
  serverProcess.stdout?.on('data', (data) => {
    console.log(`[子进程 stdout]: ${data}`)
  })
  serverProcess.stderr?.on('data', (data) => {
    console.error(`[子进程 stderr]: ${data}`)
  })
  if (mg.r) {
    await new Promise<void>((resolve, reject) => {
      let i: NodeJS.Timeout | null = null
      let retryCount = 0
      const maxRetries = 10
      const c = async () => {
        retryCount += 1
        try {
          const res = await fetch('http://localhost:45600/api/db/migrate', {
            method: 'POST',
            body: JSON.stringify(mg),
          })
          const data = await res.json()
          if (data.success) {
            if (i) {
              clearInterval(i)
              fs.writeFileSync(dbMigrationLockPath, pkg.version)
              resolve()
            }
          }
        } catch {}
        if (retryCount >= maxRetries) {
          if (i) clearInterval(i)
          reject(new Error('数据库迁移失败：重试 10 次后仍未成功'))
        }
      }
      i = setInterval(() => {
        void c()
      }, 1000)
    })
  }
}

app
  .whenReady()
  .then(async () => {
    await startServer()
    protocol.handle('app', (req) => {
      const { host, pathname } = new URL(req.url)
      if (host === 'bundle') {
        const pathToServe = pathname.startsWith('/assets')
          ? pathname
          : '/index.html'
        if (pathToServe.includes('..')) {
          return new Response('bad', {
            status: 400,
            headers: { 'content-type': 'text/html' },
          })
        }
        return net.fetch(
          pathToFileURL(
            path.resolve(getResourcePath(), '../build/client') + pathToServe,
          ).toString(),
        )
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
    serverProcess?.kill('SIGKILL') // nitro的问题，通过node执行的启动在优雅退出后仍持续运行，只能 kill -9 了
    app.quit()
  }
})
