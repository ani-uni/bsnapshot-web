import { atom } from 'jotai'
import { unwrap } from 'jotai/utils'

import { createApiClient } from '@/utils/apiFetch'

import { apiBaseUrlAtom, serverInfoBaseRefreshAtom } from './api'

/**
 * User 数据类型（不包含敏感信息）
 */
export interface User {
  mid: string
  uname: string
  vip: boolean
}

const USERS_CACHE_TTL_MS = 60 * 60 * 1000

let usersCache: User[] | null = null
let usersCacheUpdatedAt = 0
let usersCacheApiBaseUrl: string | null = null
let usersPendingRequest: Promise<User[] | null> | null = null
let usersLastRefreshToken = 0

/**
 * Users 刷新触发器
 */
export const usersRefreshAtom = atom(0)

/**
 * Users 自动刷新触发器（每小时触发一次）
 */
export const usersAutoRefreshAtom = atom(0)
usersAutoRefreshAtom.onMount = (set) => {
  const intervalId = setInterval(() => {
    set((prev) => prev + 1)
  }, USERS_CACHE_TTL_MS)

  return () => {
    clearInterval(intervalId)
  }
}

/**
 * 获取用户列表的 atom（基础异步 atom）
 */
const usersBaseAtom = atom(async (get) => {
  const refreshToken = get(usersRefreshAtom)
  get(usersAutoRefreshAtom)

  const url = get(apiBaseUrlAtom)
  const now = Date.now()
  const isManualRefresh = refreshToken !== usersLastRefreshToken
  usersLastRefreshToken = refreshToken

  const isFreshCache =
    usersCache !== null &&
    usersCacheApiBaseUrl === url &&
    now - usersCacheUpdatedAt < USERS_CACHE_TTL_MS

  if (!isManualRefresh && isFreshCache) {
    return usersCache
  }

  if (usersPendingRequest) {
    return usersPendingRequest
  }

  usersPendingRequest = (async () => {
    try {
      const client = createApiClient(url)
      const response = await client('api/auth/users')
      if (!response.ok) return usersCache

      const users = (await response.json()) as User[]
      usersCache = users
      usersCacheUpdatedAt = Date.now()
      usersCacheApiBaseUrl = url

      return usersCache
    } catch {
      return usersCache
    } finally {
      usersPendingRequest = null
    }
  })()

  try {
    return await usersPendingRequest
  } catch {
    return usersCache
  }
})

/**
 * Users atom（使用 unwrap 处理异步）
 */
export const usersAtom = unwrap(usersBaseAtom, (prev) => prev ?? null)

/**
 * 登录状态 atom
 */
export const loginStatusAtom = atom<{
  status: 'idle' | 'loading' | 'success' | 'error'
  message?: string
}>({
  status: 'idle',
})

/**
 * 通过 Cookies 登录的 atom
 */
export const loginWithCookiesAtom = atom(
  null,
  async (get, set, cookies: string) => {
    set(loginStatusAtom, { status: 'loading' })

    try {
      const url = get(apiBaseUrlAtom)
      const client = createApiClient(url)
      const response = await client('api/auth/users/login/cookies', {
        method: 'POST',
        json: {
          bauth_cookies: cookies,
        },
      })

      if (!response.ok) {
        throw new Error(`登录失败: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      set(loginStatusAtom, {
        status: 'success',
        message: '登录成功',
      })

      // 刷新用户列表
      set(usersRefreshAtom, get(usersRefreshAtom) + 1)

      // 更新全局用户存在状态
      set(serverInfoBaseRefreshAtom, get(serverInfoBaseRefreshAtom) + 1)

      return result
    } catch (error) {
      set(loginStatusAtom, {
        status: 'error',
        message: `登录失败: ${error instanceof Error ? error.message : '未知错误'}`,
      })
      throw error
    }
  },
)
