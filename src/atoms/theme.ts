import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

/**
 * 初始系统深色模式偏好
 * 如果没有保存过主题设置，就使用系统偏好
 */
const getInitialTheme = (): 'dark' | 'light' => {
  if (typeof window === 'undefined') return 'light'

  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || saved === 'light') {
    return saved
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/**
 * 主题状态 atom，自动持久化到 localStorage
 * 存储 'dark' 或 'light'
 */
export const themeAtom = atomWithStorage<'dark' | 'light'>(
  'theme',
  getInitialTheme(),
)

/**
 * 当前是否为深色模式的派生 atom
 */
export const isDarkAtom = atom((get) => get(themeAtom) === 'dark')

/**
 * 应用主题到 DOM 的 atom effect
 * 监听系统主题变化，如果没有手动设置，则跟随系统
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
    // 如果用户没有手动设置主题，则跟随系统
    if (localStorage.getItem('theme') === null) {
      const newIsDark = e.matches
      set(themeAtom, newIsDark ? 'dark' : 'light')
      applyThemeToDom(newIsDark)
    }
  }

  mediaQuery.addEventListener('change', handleChange)

  // 立即应用主题
  const currentTheme = get(themeAtom)
  applyThemeToDom(currentTheme === 'dark')

  return () => {
    mediaQuery.removeEventListener('change', handleChange)
  }
})
