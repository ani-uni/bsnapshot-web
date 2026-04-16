/**
 * 将模板字符串转换为实际文件名
 * 支持的模板字符：
 * - {epid}: 剧集 ID
 * - {sn}: 剧集集数（ep_number）
 * - {ssid}: 季度 ID
 * - {ep_title}: 剧集标题
 * - {ss_title}: 季度标题
 * - {fmt}: 导出格式后缀
 */

import { formatSnForTemplate } from './sn'

type EpisodeData = {
  id: string
  sn: number | null
  title: string | null
}

type SeasonData = {
  id: string
  title: string | null
}

export function renderFilenameTemplate(
  template: string,
  episode: EpisodeData,
  season: SeasonData,
  fmt: string,
): string {
  return template
    .replaceAll('{epid}', episode.id)
    .replaceAll('{sn}', formatSnForTemplate(episode.sn))
    .replaceAll('{ssid}', season.id)
    .replaceAll('{ep_title}', episode.title ?? '未命名')
    .replaceAll('{ss_title}', season.title ?? '未命名')
    .replaceAll('{fmt}', fmt)
}
