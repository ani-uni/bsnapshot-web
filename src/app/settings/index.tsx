import {
  Button,
  Description,
  FieldError,
  Fieldset,
  Input,
  Label,
  Separator,
  Table,
  TextField,
  toast,
} from '@heroui/react'
import { useAtom, useAtomValue } from 'jotai'
import { RESET } from 'jotai/utils'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  apiBaseUrlAtom,
  apiConnectionStatusAtom,
  type Config,
  configFormAtom,
  configPatchAtom,
  configSaveStatusAtom,
  isSavingUrlAtom,
  isServerConnectedAtom,
  saveConfigAtom,
  saveTmdbConfigAtom,
  tempUrlAtom,
  testApiConnectionAtom,
  tmdbFormAtom,
  tmdbPatchAtom,
  tmdbSaveStatusAtom,
} from '@/atoms/api'
import {
  DEFAULT_DANMAKU_BATCH_EXPORT_TEMPLATE,
  DEFAULT_DANMAKU_EXPORT_FILE_NAME_TEMPLATE,
  danmakuBatchExportTemplateAtom,
  danmakuExportFileNameTemplateAtom,
} from '@/atoms/groups/export'

const validateDanmakuExportTemplate = (values: {
  defaultFileNameTemplate: string
  batchExportTemplate: string
}) => {
  const errors: {
    defaultFileNameTemplate?: string
    batchExportTemplate?: string
  } = {}

  if (!values.defaultFileNameTemplate.trim().endsWith('{fmt}')) {
    errors.defaultFileNameTemplate = '模板必须以 {fmt} 结尾'
  }

  if (!values.batchExportTemplate.trim().endsWith('{fmt}')) {
    errors.batchExportTemplate = '模板必须以 {fmt} 结尾'
  }

  return errors
}

export default function SettingsPage() {
  const [apiBaseUrl, setApiBaseUrl] = useAtom(apiBaseUrlAtom)
  const [tempUrl, setTempUrl] = useAtom(tempUrlAtom)
  const [connectionStatus] = useAtom(apiConnectionStatusAtom)
  const [, testConnection] = useAtom(testApiConnectionAtom)
  const [isSaving, setIsSaving] = useAtom(isSavingUrlAtom)
  const [isServerConnected] = useAtom(isServerConnectedAtom)
  const [danmakuExportFileNameTemplate, setDanmakuExportFileNameTemplate] =
    useAtom(danmakuExportFileNameTemplateAtom)
  const [danmakuBatchExportTemplate, setDanmakuBatchExportTemplate] = useAtom(
    danmakuBatchExportTemplateAtom,
  )
  const [danmakuExportErrors, setDanmakuExportErrors] = useState<{
    defaultFileNameTemplate?: string
    batchExportTemplate?: string
  }>({})
  const [defaultTemplate, setDefaultTemplate] = useState(
    danmakuExportFileNameTemplate,
  )
  const [batchTemplate, setBatchTemplate] = useState(danmakuBatchExportTemplate)

  // 使用 atom 管理的 config 表单
  const configForm = useAtomValue(configFormAtom)
  const [configPatch, setConfigPatch] = useAtom(configPatchAtom)
  const [, saveConfig] = useAtom(saveConfigAtom)
  const configSaveStatus = useAtomValue(configSaveStatusAtom)
  const tmdbForm = useAtomValue(tmdbFormAtom)
  const [tmdbPatch, setTmdbPatch] = useAtom(tmdbPatchAtom)
  const [, saveTmdbConfig] = useAtom(saveTmdbConfigAtom)
  const tmdbSaveStatus = useAtomValue(tmdbSaveStatusAtom)

  const [isManualTest, setIsManualTest] = useState(false)

  // 只在用户手动点击测试时显示连接相关的 toast
  useEffect(() => {
    if (!isManualTest) return

    if (connectionStatus.status === 'success') {
      toast.success('连接成功')
      setIsManualTest(false)
    } else if (connectionStatus.status === 'error') {
      toast.danger(connectionStatus.message || '连接失败')
      setIsManualTest(false)
    }
  }, [connectionStatus.status, connectionStatus.message, isManualTest])

  // 监听配置保存状态并显示 toast
  useEffect(() => {
    if (configSaveStatus.status === 'success') {
      toast.success('保存成功')
    } else if (configSaveStatus.status === 'error') {
      toast.danger(configSaveStatus.message || '保存失败')
    }
  }, [configSaveStatus.status, configSaveStatus.message])

  // 监听 TMDB 保存状态并显示 toast
  useEffect(() => {
    if (tmdbSaveStatus.status === 'success') {
      toast.success('保存成功')
    } else if (tmdbSaveStatus.status === 'error') {
      toast.danger(tmdbSaveStatus.message || '保存失败')
    }
  }, [tmdbSaveStatus.status, tmdbSaveStatus.message])

  const handleSaveConfig = async () => {
    if (!configForm) return

    try {
      await saveConfig()
    } catch (error) {
      // 错误已在 atom 中处理
      console.error('Failed to save config:', error)
    }
  }

  const handleConfigChange = (
    field: keyof Omit<Config, 'id'>,
    value: string,
  ) => {
    if (!configForm) return
    const numValue = parseInt(value, 10)
    if (!Number.isNaN(numValue)) {
      setConfigPatch({ ...configPatch, [field]: numValue })
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setIsManualTest(true)

    // 测试连接，返回格式化后的 URL 或 false
    const result = await testConnection(tempUrl)

    if (result) {
      // 连接成功，保存格式化后的 URL
      setApiBaseUrl(result)
      setTempUrl(result)
    }

    setIsSaving(false)
  }

  const handleTmdbChange = (field: 'api_url' | 'api_key', value: string) => {
    setTmdbPatch({ ...tmdbPatch, [field]: value })
  }

  const handleSaveTmdb = async () => {
    if (!tmdbForm) return
    try {
      await saveTmdbConfig()
    } catch (error) {
      console.error('Failed to save TMDB config:', error)
    }
  }

  const handleTest = async () => {
    setIsManualTest(true)
    const result = await testConnection(tempUrl)
    // 如果测试成功，更新临时 URL 为格式化后的值
    if (result) {
      setTempUrl(result)
    }
  }

  // 在 useEffect 中同步 atom 变化
  useEffect(() => {
    setDefaultTemplate(danmakuExportFileNameTemplate)
    setBatchTemplate(danmakuBatchExportTemplate)
  }, [danmakuExportFileNameTemplate, danmakuBatchExportTemplate])

  const handleSaveDanmakuExportSettings = () => {
    const nextValues = {
      defaultFileNameTemplate: defaultTemplate,
      batchExportTemplate: batchTemplate,
    }

    const errors = validateDanmakuExportTemplate(nextValues)
    setDanmakuExportErrors(errors)

    if (Object.keys(errors).length > 0) {
      toast.danger('保存失败：模板必须以 {fmt} 结尾')
      return
    }

    const hasChanges =
      nextValues.defaultFileNameTemplate !== danmakuExportFileNameTemplate ||
      nextValues.batchExportTemplate !== danmakuBatchExportTemplate

    if (!hasChanges) {
      toast.success('无变更，无需保存')
      return
    }

    if (nextValues.defaultFileNameTemplate !== danmakuExportFileNameTemplate) {
      setDanmakuExportFileNameTemplate(nextValues.defaultFileNameTemplate)
    }
    if (nextValues.batchExportTemplate !== danmakuBatchExportTemplate) {
      setDanmakuBatchExportTemplate(nextValues.batchExportTemplate)
    }
    toast.success('弹幕导出设置已保存')
  }

  const handleResetDefaultTemplate = () => {
    setDanmakuExportFileNameTemplate(RESET)
    setDefaultTemplate(DEFAULT_DANMAKU_EXPORT_FILE_NAME_TEMPLATE)
    setDanmakuExportErrors((prev) => ({
      ...prev,
      defaultFileNameTemplate: undefined,
    }))
    toast.success('已重置默认文件名模板')
  }

  const handleResetBatchTemplate = () => {
    setDanmakuBatchExportTemplate(RESET)
    setBatchTemplate(DEFAULT_DANMAKU_BATCH_EXPORT_TEMPLATE)
    setDanmakuExportErrors((prev) => ({
      ...prev,
      batchExportTemplate: undefined,
    }))
    toast.success('已重置批量导出模板')
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-4xl font-bold">设置</h1>

      {/* API 设置部分 */}
      <Fieldset className="mb-6">
        <Fieldset.Legend>API 设置</Fieldset.Legend>
        <Description>配置应用连接的后端服务器地址</Description>
        <Fieldset.Group className="space-y-4">
          <TextField>
            <Label>API Base URL</Label>
            <Input
              type="url"
              placeholder="http://localhost:3000"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              className="font-mono"
            />
            <Description className="mt-1 text-xs">
              后端服务器的基础 URL 地址（不包含 /api 路径）
            </Description>
          </TextField>

          {/* 当前保存的 URL */}
          {apiBaseUrl !== tempUrl && (
            <div className="rounded-md bg-surface-secondary p-3">
              <p className="text-xs text-muted">
                当前使用: <span className="font-mono">{apiBaseUrl}</span>
              </p>
            </div>
          )}
        </Fieldset.Group>
        <Fieldset.Actions className="flex gap-3">
          <Button
            variant="secondary"
            onPress={handleTest}
            isDisabled={!tempUrl || connectionStatus.status === 'testing'}
          >
            {connectionStatus.status === 'testing' ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                测试中...
              </>
            ) : (
              '测试连接'
            )}
          </Button>
          <Button
            variant="primary"
            onPress={handleSave}
            isDisabled={
              !tempUrl || isSaving || connectionStatus.status === 'testing'
            }
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                保存中...
              </>
            ) : (
              '保存设置'
            )}
          </Button>
        </Fieldset.Actions>
      </Fieldset>

      {/* 弹幕导出设置 */}
      <Fieldset className="mb-6">
        <Fieldset.Legend>弹幕导出</Fieldset.Legend>
        <Description>自定义弹幕导出的默认文件名与批量导出模板</Description>
        <Table variant="secondary">
          <Table.Content aria-label="模板字符说明表">
            <Table.Header>
              <Table.Column isRowHeader>模板字符</Table.Column>
              <Table.Column>说明</Table.Column>
            </Table.Header>
            <Table.Body>
              <Table.Row id="ssid">
                <Table.Cell className="font-mono">{'{ssid}'}</Table.Cell>
                <Table.Cell>季度 ID</Table.Cell>
              </Table.Row>
              <Table.Row id="ss-title">
                <Table.Cell className="font-mono">{'{ss_title}'}</Table.Cell>
                <Table.Cell>季度标题</Table.Cell>
              </Table.Row>
              <Table.Row id="epid">
                <Table.Cell className="font-mono">{'{epid}'}</Table.Cell>
                <Table.Cell>剧集 ID</Table.Cell>
              </Table.Row>
              <Table.Row id="sn">
                <Table.Cell className="font-mono">{'{sn}'}</Table.Cell>
                <Table.Cell>剧集集数</Table.Cell>
              </Table.Row>
              <Table.Row id="ep-title">
                <Table.Cell className="font-mono">{'{ep_title}'}</Table.Cell>
                <Table.Cell>剧集标题</Table.Cell>
              </Table.Row>
              <Table.Row id="fmt">
                <Table.Cell className="font-mono">{'{fmt}'}</Table.Cell>
                <Table.Cell>导出格式后缀</Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table.Content>
        </Table>
        <Fieldset.Group className="space-y-4">
          <TextField
            isInvalid={Boolean(danmakuExportErrors.defaultFileNameTemplate)}
          >
            <Label>默认文件名</Label>
            <Input
              type="text"
              value={defaultTemplate}
              onChange={(e) => setDefaultTemplate(e.target.value)}
              placeholder="{epid}_{fmt}"
              className="font-mono"
            />
            <FieldError>
              {danmakuExportErrors.defaultFileNameTemplate ?? ''}
            </FieldError>
            <Description className="mt-1 text-xs">
              示例: {'{ss_title}_{sn}-{ep_title}_{fmt}'}
            </Description>
            <Button
              variant="secondary"
              size="sm"
              onPress={handleResetDefaultTemplate}
            >
              重置
            </Button>
          </TextField>

          <TextField
            isInvalid={Boolean(danmakuExportErrors.batchExportTemplate)}
          >
            <Label>多季度批量导出路径模板</Label>
            <Input
              type="text"
              value={batchTemplate}
              onChange={(e) => setBatchTemplate(e.target.value)}
              placeholder="{ssid}/{epid}_{fmt}"
              className="font-mono"
            />
            <FieldError>
              {danmakuExportErrors.batchExportTemplate ?? ''}
            </FieldError>
            <Description className="mt-1 text-xs">
              示例: {'{ssid} - {ss_title}/{sn} - {epid} - {ep_title}_{fmt}'}
            </Description>
            <Button
              variant="secondary"
              size="sm"
              onPress={handleResetBatchTemplate}
            >
              重置
            </Button>
          </TextField>
        </Fieldset.Group>
        <Fieldset.Actions className="flex gap-3">
          <Button variant="primary" onPress={handleSaveDanmakuExportSettings}>
            保存弹幕导出设置
          </Button>
        </Fieldset.Actions>
      </Fieldset>

      {/* 其他设置部分（仅在连接后显示） */}
      {isServerConnected && (
        <>
          <Separator className="my-6" />

          <Fieldset className="mb-6">
            <Fieldset.Legend>基础设置</Fieldset.Legend>
            <Description>后端服务的基本配置选项</Description>
            {configForm ? (
              <Fieldset.Group className="space-y-6">
                {/* 请求配置 */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold">请求配置</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField>
                      <Label>请求间隔 (秒)</Label>
                      <Input
                        type="number"
                        value={configForm.reqIntervalSec}
                        onChange={(e) =>
                          handleConfigChange('reqIntervalSec', e.target.value)
                        }
                        min={1}
                      />
                    </TextField>
                    <TextField>
                      <Label>请求批次</Label>
                      <Input
                        type="number"
                        value={configForm.reqBatch}
                        onChange={(e) =>
                          handleConfigChange('reqBatch', e.target.value)
                        }
                        min={1}
                      />
                    </TextField>
                  </div>
                </div>

                <Separator />

                {/* RT 实时弹幕 */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold">RT 实时弹幕</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField>
                      <Label>调度间隔 (秒)</Label>
                      <Input
                        type="number"
                        value={configForm.rtIntervalSec}
                        onChange={(e) =>
                          handleConfigChange('rtIntervalSec', e.target.value)
                        }
                        min={1}
                      />
                    </TextField>
                    <TextField>
                      <Label>单次拉取任务数</Label>
                      <Input
                        type="number"
                        value={configForm.rtBatch}
                        onChange={(e) =>
                          handleConfigChange('rtBatch', e.target.value)
                        }
                        min={1}
                      />
                    </TextField>
                  </div>
                </div>

                <Separator />

                {/* HIS 历史弹幕 */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold">HIS 历史弹幕</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField>
                      <Label>调度间隔 (秒)</Label>
                      <Input
                        type="number"
                        value={configForm.hisIntervalSec}
                        onChange={(e) =>
                          handleConfigChange('hisIntervalSec', e.target.value)
                        }
                        min={1}
                      />
                    </TextField>
                    <TextField>
                      <Label>单次拉取任务数</Label>
                      <Input
                        type="number"
                        value={configForm.hisBatch}
                        onChange={(e) =>
                          handleConfigChange('hisBatch', e.target.value)
                        }
                        min={1}
                      />
                    </TextField>
                  </div>
                </div>

                <Separator />

                {/* SP 特殊弹幕 */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold">SP 特殊弹幕</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField>
                      <Label>调度间隔 (秒)</Label>
                      <Input
                        type="number"
                        value={configForm.spIntervalSec}
                        onChange={(e) =>
                          handleConfigChange('spIntervalSec', e.target.value)
                        }
                        min={1}
                      />
                    </TextField>
                    <TextField>
                      <Label>单次拉取任务数</Label>
                      <Input
                        type="number"
                        value={configForm.spBatch}
                        onChange={(e) =>
                          handleConfigChange('spBatch', e.target.value)
                        }
                        min={1}
                      />
                    </TextField>
                  </div>
                </div>

                <Separator />

                {/* UP 创作中心弹幕 */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold">
                    UP 创作中心弹幕
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField>
                      <Label>调度间隔 (秒)</Label>
                      <Input
                        type="number"
                        value={configForm.upIntervalSec}
                        onChange={(e) =>
                          handleConfigChange('upIntervalSec', e.target.value)
                        }
                        min={1}
                      />
                    </TextField>
                    <TextField>
                      <Label>单次拉取任务数</Label>
                      <Input
                        type="number"
                        value={configForm.upBatch}
                        onChange={(e) =>
                          handleConfigChange('upBatch', e.target.value)
                        }
                        min={1}
                      />
                    </TextField>
                    <TextField className="sm:col-span-2">
                      <Label>弹幕池大小</Label>
                      <Input
                        type="number"
                        value={configForm.upPool}
                        onChange={(e) =>
                          handleConfigChange('upPool', e.target.value)
                        }
                        min={1}
                      />
                    </TextField>
                  </div>
                </div>
              </Fieldset.Group>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted" />
                <span className="ml-2 text-sm text-muted">加载配置中...</span>
              </div>
            )}
            {configForm && (
              <Fieldset.Actions>
                <Button
                  variant="primary"
                  onPress={handleSaveConfig}
                  isDisabled={configSaveStatus.status === 'saving'}
                >
                  {configSaveStatus.status === 'saving' ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    '保存基础设置'
                  )}
                </Button>
              </Fieldset.Actions>
            )}
          </Fieldset>

          <Separator className="my-6" />

          <Fieldset>
            <Fieldset.Legend>TMDB 设置</Fieldset.Legend>
            <Description>The Movie Database API 配置</Description>
            {tmdbForm ? (
              <Fieldset.Group className="space-y-6">
                <TextField>
                  <Label>API URL</Label>
                  <Input
                    type="url"
                    value={tmdbForm.api_url ?? ''}
                    onChange={(e) =>
                      handleTmdbChange('api_url', e.target.value)
                    }
                    placeholder="https://api.themoviedb.org"
                    className="font-mono"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      setTmdbPatch({ ...tmdbPatch, api_url: null })
                      handleSaveTmdb()
                    }}
                  >
                    重置 URL
                  </Button>
                </TextField>
                <TextField>
                  <Label>API Key</Label>
                  <Input
                    type="text"
                    value={tmdbForm.api_key ?? ''}
                    onChange={(e) =>
                      handleTmdbChange('api_key', e.target.value)
                    }
                    placeholder="TMDB API Key"
                    className="font-mono"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      setTmdbPatch({ ...tmdbPatch, api_key: null })
                      handleSaveTmdb()
                    }}
                  >
                    重置 Key
                  </Button>
                  <Description className="mt-1 text-xs">
                    若您使用已有 API Key 鉴权的 TMDB API 代理，请在 API Key
                    填写"proxy"。
                  </Description>
                </TextField>
              </Fieldset.Group>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted" />
                <span className="ml-2 text-sm text-muted">加载配置中...</span>
              </div>
            )}
            {tmdbForm && (
              <Fieldset.Actions>
                <Button
                  variant="primary"
                  onPress={handleSaveTmdb}
                  isDisabled={tmdbSaveStatus.status === 'saving'}
                >
                  {tmdbSaveStatus.status === 'saving' ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    '保存 TMDB 设置'
                  )}
                </Button>
              </Fieldset.Actions>
            )}
          </Fieldset>
        </>
      )}

      {/* 未连接提示 */}
      {!isServerConnected && (
        <Fieldset className="border-dashed border-2 border-border">
          <Fieldset.Group className="py-8 text-center">
            <p className="text-sm text-muted">
              请先配置并连接到后端服务器以解锁更多设置选项
            </p>
          </Fieldset.Group>
        </Fieldset>
      )}
    </div>
  )
}
