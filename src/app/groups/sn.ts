/**
 * BGMTV 剧集 SN 规则统一处理
 * - type=0（正常剧集）：sn = sort
 * - type!=0（特典）：sn = -10{type}0{sort} 格式（保留小数）
 *
 * 显示规则：
 * - type=0：显示为 "第 X 集"
 * - type!=0：显示为 "第 X 集 (类型名)"（例如特别篇显示为 "第 13.5 集 (特别篇)"）
 */

/** Type 到中文名称的映射 */
const TYPE_NAMES: Record<number, string> = {
  0: '本篇',
  1: '特别篇',
  2: 'OP',
  3: 'ED',
  4: '预告/宣传/广告',
  5: 'MAD',
  6: '其他',
}

/**
 * 获取type的中文名称
 * @param type BGMTV episode type
 * @returns 对应的中文名称，未知type返回"?"
 */
export function getTypeLabel(type: number): string {
  return TYPE_NAMES[type] ?? '?'
}

export interface BgmtvEpisode {
  id: number
  type: number
  name: string
  name_cn: string
  sort: number
  ep?: number
  airdate: string
  comment: number
  duration: string
  desc: string
  disc: number
  duration_seconds?: number
}

/**
 * 从 BGMTV 剧集对象计算应该使用的 sn
 * @param episode BGMTV 剧集数据
 * @returns 计算后的 sn，若无法计算则返回 null
 */
export function buildSnFromBgmtvEpisode(episode: BgmtvEpisode): number | null {
  if (episode.type === 0) {
    // 正常剧集：使用 sort 字段
    return episode.sort
  } else {
    // 特典（type != 0）：拼接 -10{type}0{sort}
    const encoded = `-10${episode.type}0${episode.sort}`
    const sn = Number(encoded)
    if (!Number.isFinite(sn)) {
      return null
    }
    return sn
  }
}

/**
 * 将 sn 格式化为显示文案
 * 若 sn 已编码为负值且未显式传递 type，会自动反解析 type
 * @param sn 内部 sn 值
 * @param type 可选的 type 信息；若未传且 sn < 0，会自动从 sn 反解析
 * @returns 格式化后的显示文案，若 sn 无效则返回空字符串
 */
export function formatSn(sn: number | null, type?: number): string {
  if (sn === null || !Number.isFinite(sn)) {
    return ''
  }

  // 确定最终要使用的 type 值
  let finalType = type ?? 0
  if (type === undefined && sn < 0) {
    // 当未显式传递 type 且 sn < 0 时，从 sn 反解析 type
    const parsed = parseSpecialSn(sn)
    if (parsed) {
      finalType = parsed.type
    }
  }

  if (finalType === 0) {
    // 正常剧集（本篇）显示为 "第 X 集"
    return `第 ${sn} 集`
  }

  // 特典显示为 "第 X 集 (类型名)"
  const typeLabel = getTypeLabel(finalType)
  if (sn < 0) {
    // 对于已编码的 sn（< 0），需要从中提取 sort 值
    const parsed = parseSpecialSn(sn)
    if (parsed) {
      return `第 ${parsed.sort} 集 (${typeLabel})`
    }
  }
  return `第 ${sn} 集 (${typeLabel})`
}

/**
 * 反解析特典 sn（可选，用于显示时若需要原始 type/sort 信息）
 * 返回 { type, sort } 若为正常剧集则 type=0，若无法解析返回 null
 */
export function parseSpecialSn(
  sn: number,
): { type: number; sort: number } | null {
  if (sn >= 0) {
    // 正常剧集
    return { type: 0, sort: sn }
  }

  // sn < 0，尝试按 -10{type}0{sort} 格式解析
  const str = String(sn)
  if (!str.startsWith('-10')) {
    return null
  }

  const rest = str.slice(3) // 去掉 "-10"
  const typeMatch = rest.match(/^(\d+)0(.+)$/)
  if (!typeMatch) {
    return null
  }

  const type = Number(typeMatch[1])
  const sort = Number(typeMatch[2])

  if (!Number.isFinite(type) || !Number.isFinite(sort)) {
    return null
  }

  return { type, sort }
}

/**
 * 用于模板中渲染 {sn} 占位符，自动从 sn 值判断显示格式
 * @param sn 内部 sn 值
 * @returns 格式化后的显示文案
 */
export function formatSnForTemplate(sn: number | null): string {
  if (sn === null || !Number.isFinite(sn)) {
    return ''
  }

  // 从 sn 值反解析得到 type 和 sort
  const parsed = parseSpecialSn(sn)
  if (!parsed) {
    return ''
  }

  const { type, sort } = parsed

  if (type === 0) {
    return `第 ${sort} 集`
  }

  const typeLabel = getTypeLabel(type)
  return `第 ${sort} 集 (${typeLabel})`
}

/**
 * 用于排序 BGMTV 剧集：返回比较函数供 sort() 使用
 * 规则：先按 type 分组（0 最优先），再按 sort 升序
 */
export function bgmtvEpisodeComparator(
  a: BgmtvEpisode,
  b: BgmtvEpisode,
): number {
  // 首先按 type 排序（0 优先）
  if (a.type !== b.type) {
    if (a.type === 0) return -1
    if (b.type === 0) return 1
    // 其它 type 按大小排序
    return a.type - b.type
  }

  // 同 type，按 sort 升序
  return a.sort - b.sort
}
