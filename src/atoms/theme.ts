import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * 获取系统主题偏好
 */
const getSystemTheme = (): 'dark' | 'light' => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/**
 * 初始主题模式
 * 默认跟随系统
 */
const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'system'

  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || saved === 'light' || saved === 'system') {
    return saved as ThemeMode
  }

  return 'system'
}

/**
 * 主题模式 atom，自动持久化到 localStorage
 * 存储 'dark'、'light' 或 'system'
 */
export const themeAtom = atomWithStorage<ThemeMode>('theme', getInitialTheme())

/**
 * 系统主题偏好 atom
 */
export const systemThemeAtom = atom<'dark' | 'light'>(getSystemTheme())

/**
 * 当前实际应用的主题（解析 system 模式）
 */
export const resolvedThemeAtom = atom((get) => {
  const mode = get(themeAtom)
  if (mode === 'system') {
    return get(systemThemeAtom)
  }
  return mode
})

/**
 * 当前是否为深色模式的派生 atom
 */
export const isDarkAtom = atom((get) => get(resolvedThemeAtom) === 'dark')

/**
 * 应用主题到 DOM 的 atom effect
 * 监听系统主题变化，如果设置为 system，则跟随系统
 */
export const applyThemeAtom = atom(null, (get, set) => {
  if (typeof window === 'undefined') return

  const applyThemeToDom = (dark: boolean) => {
    const html = document.documentElement
    if (dark) {
      html.classList.add('dark')
      html.setAttribute('data-theme', 'dark')
    } else {
      html.classList.remove('dark')
      html.setAttribute('data-theme', 'light')
    }
  }

  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleChange = (e: MediaQueryListEvent) => {
    const newSystemTheme = e.matches ? 'dark' : 'light'
    set(systemThemeAtom, newSystemTheme)

    // 如果当前模式是 system，则应用新的系统主题
    const currentMode = get(themeAtom)
    if (currentMode === 'system') {
      applyThemeToDom(newSystemTheme === 'dark')
    }
  }

  mediaQuery.addEventListener('change', handleChange)

  // 立即应用主题
  const resolvedTheme = get(resolvedThemeAtom)
  applyThemeToDom(resolvedTheme === 'dark')

  return () => {
    mediaQuery.removeEventListener('change', handleChange)
  }
})
