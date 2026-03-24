import { atomWithStorage } from 'jotai/utils'

export type DanmakuExportFormat =
  | 'danuni.json'
  | 'danuni.min.json'
  | 'danuni.binpb'
  | 'bili.xml'
  | 'dplayer.json'
  | 'artplayer.json'
  | 'ddplay.json'

export const lastUsedDanmakuExportFormatAtom =
  atomWithStorage<DanmakuExportFormat>(
    'lastUsedDanmakuExportFormat',
    'danuni.json',
  )

export const DEFAULT_DANMAKU_EXPORT_FILE_NAME_TEMPLATE = '{epid}_{fmt}'
export const DEFAULT_DANMAKU_BATCH_EXPORT_TEMPLATE = '{ssid}/{epid}_{fmt}'

/** 单集导出文件名模板 */
export const danmakuExportFileNameTemplateAtom = atomWithStorage<string>(
  'danmakuExportFileNameTemplate',
  DEFAULT_DANMAKU_EXPORT_FILE_NAME_TEMPLATE,
)

/** 批量导出路径模板 */
export const danmakuBatchExportTemplateAtom = atomWithStorage<string>(
  'danmakuBatchExportTemplate',
  DEFAULT_DANMAKU_BATCH_EXPORT_TEMPLATE,
)
