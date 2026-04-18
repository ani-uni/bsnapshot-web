import { useAtomValue } from 'jotai'
import { useMemo } from 'react'

import { apiBaseUrlAtom } from '@/atoms/api'
import { createApiClient } from '@/utils/apiFetch'

/**
 * Hook 用于获取 API 客户端实例
 * 自动从 atom 获取 baseUrl 并创建预配置的 ky 实例
 */
export function useApi() {
  const apiBaseUrl = useAtomValue(apiBaseUrlAtom)

  return useMemo(() => createApiClient(apiBaseUrl), [apiBaseUrl])
}
