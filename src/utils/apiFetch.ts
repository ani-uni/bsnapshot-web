import ky from 'ky'

/**
 * 创建 API 客户端
 * @param baseUrl - API 基础 URL
 * @returns ky 实例
 */
export function createApiClient(baseUrl: string) {
  return ky.create({
    prefix: baseUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
