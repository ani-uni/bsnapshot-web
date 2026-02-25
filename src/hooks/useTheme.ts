'use client'

import { useAtom } from 'jotai'
import { useEffect } from 'react'
import { applyThemeAtom, isDarkAtom, themeAtom } from '@/atoms/theme'

/**
 * 主题管理 Hook
 * 使用 jotai 的 atomWithStorage 管理主题状态
 * 自动处理：
 * - localStorage 持久化
 * - 系统主题偏好检测
 * - 主题变更自动同步
 */
export function useTheme() {
  const [, setTheme] = useAtom(themeAtom)
  const [isDark] = useAtom(isDarkAtom)
  const [, applyTheme] = useAtom(applyThemeAtom)

  // 初始化主题效果
  useEffect(() => {
    applyTheme()
  }, [applyTheme])

  // 应用主题到 DOM
  useEffect(() => {
    const html = document.documentElement
    if (isDark) {
      html.classList.add('dark')
      html.setAttribute('data-theme', 'dark')
    } else {
      html.classList.remove('dark')
      html.setAttribute('data-theme', 'light')
    }
  }, [isDark])

  const toggleTheme = (isDarkMode: boolean) => {
    setTheme(isDarkMode ? 'dark' : 'light')
  }

  return { isDark, toggleTheme }
}
