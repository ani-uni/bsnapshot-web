import { atomWithStorage, unwrap } from 'jotai/utils'
import { atom } from 'jotai'

/**
 * API Base URL atom，自动持久化到 localStorage
 * 默认值：http://localhost:3000
 */
export const apiBaseUrlAtom = atomWithStorage<string>(
  'apiBaseUrl',
  'http://localhost:3000',
)

/**
 * API 连接状态 atom
 */
export const apiConnectionStatusAtom = atom<{
  status: 'idle' | 'testing' | 'success' | 'error'
  message?: string
}>({
  status: 'idle',
})

/**
 * Server 连接状态 atom（每次加载时自动检测）
 */
const isServerConnectedBaseAtom = atom(async (get) => {
  const url = get(apiBaseUrlAtom)

  try {
    // 使用 new URL 格式化和验证 URL
    const urlObj = new URL(url)
    const normalizedUrl = urlObj.origin + urlObj.pathname.replace(/\/$/, '')

    const response = await fetch(`${normalizedUrl}/api/config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    return response.ok
  } catch {
    return false
  }
})

/**
 * Server 连接状态 atom，使用 unwrap 处理异步加载
 * 加载中或出错时返回 false（默认未连接）
 */
export const isServerConnectedAtom = unwrap(
  isServerConnectedBaseAtom,
  (prev) => prev ?? false,
)

/**
 * 测试 API 连接的 atom
 */
export const testApiConnectionAtom = atom(
  null,
  async (_get, set, url: string) => {
    set(apiConnectionStatusAtom, { status: 'testing' })

    try {
      // 使用 new URL 格式化和验证 URL
      let normalizedUrl: string
      try {
        const urlObj = new URL(url)
        // 去除末尾的斜杠
        normalizedUrl = urlObj.origin + urlObj.pathname.replace(/\/$/, '')
      } catch (urlError) {
        set(apiConnectionStatusAtom, {
          status: 'error',
          message: `URL 格式错误: ${urlError instanceof Error ? urlError.message : '无效的 URL'}`,
        })
        return false
      }

      const response = await fetch(`${normalizedUrl}/api/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        set(apiConnectionStatusAtom, {
          status: 'success',
          message: '连接成功',
        })
        // 更新 URL（保存成功后的 URL）
        set(apiBaseUrlAtom, normalizedUrl)
        // 重置临时 URL，使其与 apiBaseUrlAtom 同步
        set(tempUrlAtom, null)
        return normalizedUrl
      } else {
        set(apiConnectionStatusAtom, {
          status: 'error',
          message: `连接失败: ${response.status} ${response.statusText}`,
        })
        return false
      }
    } catch (error) {
      set(apiConnectionStatusAtom, {
        status: 'error',
        message: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
      })
      return false
    }
  },
)

/**
 * Config 数据类型
 */
export interface Config {
  id: number
  reqIntervalSec: number
  reqBatch: number
  rtIntervalSec: number
  rtBatch: number
  hisIntervalSec: number
  hisBatch: number
  spIntervalSec: number
  spBatch: number
  upIntervalSec: number
  upBatch: number
  upPool: number
}

/**
 * Config 刷新触发器
 */
export const configRefreshAtom = atom(0)

/**
 * 获取 Config 的 atom（基础异步 atom）
 */
const configBaseAtom = atom(async (get) => {
  get(configRefreshAtom)
  const url = get(apiBaseUrlAtom)
  try {
    const response = await fetch(`${url}/api/config`)
    if (!response.ok) return null
    const data = await response.json()
    return data.conf as Config
  } catch {
    return null
  }
})

/**
 * Config atom（使用 unwrap 处理异步）
 */
export const configAtom = unwrap(configBaseAtom, (prev) => prev ?? null)

/**
 * Config 修改项 atom（只保存用户修改的字段）
 * 默认空对象
 */
export const configPatchAtom = atom<Partial<Omit<Config, 'id'>>>({})

/**
 * Config 表单 atom（显示用，合并初始值 + 修改项）
 */
export const configFormAtom = atom((get) => {
  const config = get(configAtom)
  if (!config) return null
  const { id, ...rest } = config
  const patch = get(configPatchAtom)
  return { ...rest, ...patch }
})

/**
 * Config 保存状态 atom
 */
export const configSaveStatusAtom = atom<{
  status: 'idle' | 'saving' | 'success' | 'error'
  message?: string
}>({
  status: 'idle',
})

/**
 * 临时 URL atom（用于 API 设置测试，初始值与 apiBaseUrlAtom 同步）
 */
const tempUrlBaseAtom = atom<string | null>(null)
export const tempUrlAtom = atom(
  (get) => get(tempUrlBaseAtom) ?? get(apiBaseUrlAtom),
  (_get, set, update: string | null) => set(tempUrlBaseAtom, update),
)

/**
 * API 设置保存中状态 atom
 */
export const isSavingUrlAtom = atom(false)

/**
 * 保存 Config 的 atom
 */
export const saveConfigAtom = atom(
  null,
  async (get, set, formData?: Partial<Omit<Config, 'id'>>) => {
    set(configSaveStatusAtom, { status: 'saving' })

    try {
      const baseConfig = get(configAtom)
      if (!baseConfig) {
        throw new Error('Config not loaded')
      }
      const { id, ...rest } = baseConfig
      const patch = get(configPatchAtom)
      const payload = { ...rest, ...patch, ...(formData ?? {}) }
      const url = get(apiBaseUrlAtom)
      const response = await fetch(`${url}/api/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to update config')
      }

      const updatedConfig = (await response.json()) as Config

      set(configSaveStatusAtom, {
        status: 'success',
        message: '保存成功',
      })

      set(configPatchAtom, {})
      set(configRefreshAtom, get(configRefreshAtom) + 1)

      return updatedConfig
    } catch (error) {
      set(configSaveStatusAtom, {
        status: 'error',
        message: `保存失败: ${error instanceof Error ? error.message : '未知错误'}`,
      })
      throw error
    }
  },
)

/**
 * TMDB 配置数据类型
 */
export interface TMDBConfig {
  api_url: string | null
  api_key: string | null
}

/**
 * TMDB 配置刷新触发器
 */
export const tmdbRefreshAtom = atom(0)

/**
 * 获取 TMDB 配置的 atom（基础异步 atom）
 */
const tmdbBaseAtom = atom(async (get) => {
  get(tmdbRefreshAtom)
  const url = get(apiBaseUrlAtom)
  try {
    const response = await fetch(`${url}/api/config/tmdb`)
    if (!response.ok) {
      return null
    }
    return (await response.json()) as TMDBConfig
  } catch {
    return null
  }
})

/**
 * TMDB 配置 atom（使用 unwrap 处理异步）
 */
export const tmdbAtom = unwrap(tmdbBaseAtom, (prev) => prev ?? null)

/**
 * TMDB 修改项 atom（只保存用户修改的字段）
 */
export const tmdbPatchAtom = atom<Partial<TMDBConfig>>({})

/**
 * TMDB 表单 atom（显示用，合并初始值 + 修改项）
 */
export const tmdbFormAtom = atom((get) => {
  const config = get(tmdbAtom)
  if (!config) return null
  const patch = get(tmdbPatchAtom)
  return { ...config, ...patch }
})

/**
 * TMDB 保存状态 atom
 */
export const tmdbSaveStatusAtom = atom<{
  status: 'idle' | 'saving' | 'success' | 'error'
  message?: string
}>({
  status: 'idle',
})

/**
 * 保存 TMDB 配置的 atom
 */
export const saveTmdbConfigAtom = atom(
  null,
  async (get, set, formData?: Partial<TMDBConfig>) => {
    set(tmdbSaveStatusAtom, { status: 'saving' })

    try {
      const baseConfig = get(tmdbAtom)
      if (!baseConfig) {
        throw new Error('TMDB config not loaded')
      }
      const patch = get(tmdbPatchAtom)
      const rawPayload = { ...baseConfig, ...patch, ...(formData ?? {}) }
      const payload = {
        api_url: rawPayload.api_url === '' ? null : rawPayload.api_url,
        api_key: rawPayload.api_key === '' ? null : rawPayload.api_key,
      }

      const url = get(apiBaseUrlAtom)
      const response = await fetch(`${url}/api/config/tmdb`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to update TMDB config')
      }

      const updatedConfig = (await response.json()) as TMDBConfig

      set(tmdbSaveStatusAtom, {
        status: 'success',
        message: '保存成功',
      })

      set(tmdbPatchAtom, {})
      set(tmdbRefreshAtom, get(tmdbRefreshAtom) + 1)

      return updatedConfig
    } catch (error) {
      set(tmdbSaveStatusAtom, {
        status: 'error',
        message: `保存失败: ${error instanceof Error ? error.message : '未知错误'}`,
      })
      throw error
    }
  },
)
