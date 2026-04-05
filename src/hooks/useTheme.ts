import { useAtom } from 'jotai'
import { useEffect } from 'react'

import {
  applyThemeAtom,
  isDarkAtom,
  resolvedThemeAtom,
  type ThemeMode,
  themeAtom,
} from '@/atoms/theme'

/**
 * 主题管理 Hook
 * 使用 jotai 的 atomWithStorage 管理主题状态
 * 支持三种模式：light、dark、system
 * 自动处理：
 * - localStorage 持久化
 * - 系统主题偏好检测
 * - 主题变更自动同步
 */
export function useTheme() {
  const [themeMode, setThemeMode] = useAtom(themeAtom)
  const [isDark] = useAtom(isDarkAtom)
  const [resolvedTheme] = useAtom(resolvedThemeAtom)
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

  const setTheme = (mode: ThemeMode) => {
    setThemeMode(mode)
  }

  return {
    themeMode, // 用户设置的模式：'light' | 'dark' | 'system'
    resolvedTheme, // 实际应用的主题：'light' | 'dark'
    isDark, // 是否为深色模式
    setTheme, // 设置主题模式
  }
}
