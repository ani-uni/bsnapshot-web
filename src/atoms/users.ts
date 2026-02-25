import { atom } from 'jotai'
import { unwrap } from 'jotai/utils'
import { apiBaseUrlAtom } from './api'

/**
 * User 数据类型（不包含敏感信息）
 */
export interface User {
  mid: string
  uname: string
  vip: boolean
}

/**
 * Users 刷新触发器
 */
export const usersRefreshAtom = atom(0)

/**
 * 获取用户列表的 atom（基础异步 atom）
 */
const usersBaseAtom = atom(async (get) => {
  get(usersRefreshAtom)
  const url = get(apiBaseUrlAtom)
  try {
    const response = await fetch(`${url}/api/auth/users`)
    if (!response.ok) return null
    return (await response.json()) as User[]
  } catch {
    return null
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
      const response = await fetch(`${url}/api/auth/users/login/cookies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bauth_cookies: cookies,
        }),
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
