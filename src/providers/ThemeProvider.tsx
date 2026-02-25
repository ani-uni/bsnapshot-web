'use client'

import { Provider } from 'jotai'
import type { ReactNode } from 'react'

/**
 * 主题提供器
 * 提供 jotai atom store，管理全局主题状态
 */
interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return <Provider>{children}</Provider>
}
