'use client'

import { Button, Card, Input, Label, TextField } from '@heroui/react'
import { useAtom, useAtomValue } from 'jotai'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
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

export function SettingsPage() {
  const [apiBaseUrl, setApiBaseUrl] = useAtom(apiBaseUrlAtom)
  const [tempUrl, setTempUrl] = useAtom(tempUrlAtom)
  const [connectionStatus] = useAtom(apiConnectionStatusAtom)
  const [, testConnection] = useAtom(testApiConnectionAtom)
  const [isSaving, setIsSaving] = useAtom(isSavingUrlAtom)
  const [isServerConnected] = useAtom(isServerConnectedAtom)

  // 使用 atom 管理的 config 表单
  const configForm = useAtomValue(configFormAtom)
  const [configPatch, setConfigPatch] = useAtom(configPatchAtom)
  const [, saveConfig] = useAtom(saveConfigAtom)
  const configSaveStatus = useAtomValue(configSaveStatusAtom)
  const tmdbForm = useAtomValue(tmdbFormAtom)
  const [tmdbPatch, setTmdbPatch] = useAtom(tmdbPatchAtom)
  const [, saveTmdbConfig] = useAtom(saveTmdbConfigAtom)
  const tmdbSaveStatus = useAtomValue(tmdbSaveStatusAtom)

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
    const result = await testConnection(tempUrl)
    // 如果测试成功，更新临时 URL 为格式化后的值
    if (result) {
      setTempUrl(result)
    }
  }

  const getStatusIcon = () => {
    switch (connectionStatus.status) {
      case 'testing':
        return <Loader2 className="size-5 animate-spin text-muted" />
      case 'success':
        return <CheckCircle className="size-5 text-success" />
      case 'error':
        return <AlertCircle className="size-5 text-danger" />
      default:
        return null
    }
  }

  const getStatusMessage = () => {
    if (connectionStatus.message) {
      return connectionStatus.message
    }
    switch (connectionStatus.status) {
      case 'testing':
        return '正在测试连接...'
      case 'success':
        return '连接成功'
      case 'error':
        return '连接失败'
      default:
        return null
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-4xl font-bold">设置</h1>

      {/* API 设置部分 */}
      <Card className="mb-6">
        <Card.Header>
          <Card.Title>API 设置</Card.Title>
          <Card.Description>配置应用连接的后端服务器地址</Card.Description>
        </Card.Header>
        <Card.Content className="space-y-4">
          <TextField>
            <Label>API Base URL</Label>
            <Input
              type="url"
              placeholder="http://localhost:3000"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              className="font-mono"
            />
            <p className="mt-1 text-xs text-muted">
              后端服务器的基础 URL 地址（不包含 /api 路径）
            </p>
          </TextField>

          {/* 当前保存的 URL */}
          {apiBaseUrl !== tempUrl && (
            <div className="rounded-md bg-surface-secondary p-3">
              <p className="text-xs text-muted">
                当前使用: <span className="font-mono">{apiBaseUrl}</span>
              </p>
            </div>
          )}

          {/* 连接状态提示 */}
          {connectionStatus.status !== 'idle' && (
            <div
              className={`flex items-center gap-2 rounded-md p-3 ${
                connectionStatus.status === 'success'
                  ? 'bg-success/10 text-success'
                  : connectionStatus.status === 'error'
                    ? 'bg-danger/10 text-danger'
                    : 'bg-surface-secondary'
              }`}
            >
              {getStatusIcon()}
              <span className="text-sm">{getStatusMessage()}</span>
            </div>
          )}
        </Card.Content>
        <Card.Footer className="flex gap-3">
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
        </Card.Footer>
      </Card>

      {/* 其他设置部分（仅在连接后显示） */}
      {isServerConnected && (
        <>
          <Card className="mb-6">
            <Card.Header>
              <Card.Title>基础设置</Card.Title>
              <Card.Description>后端服务的基本配置选项</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-6">
              {/* 保存状态提示 */}
              {configSaveStatus.status !== 'idle' &&
                configSaveStatus.status !== 'saving' && (
                  <div
                    className={`flex items-center gap-2 rounded-md p-3 ${
                      configSaveStatus.status === 'success'
                        ? 'bg-success/10 text-success'
                        : 'bg-danger/10 text-danger'
                    }`}
                  >
                    {configSaveStatus.status === 'success' ? (
                      <CheckCircle className="size-5" />
                    ) : (
                      <AlertCircle className="size-5" />
                    )}
                    <span className="text-sm">{configSaveStatus.message}</span>
                  </div>
                )}

              {configForm ? (
                <>
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
                </>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-muted" />
                  <span className="ml-2 text-sm text-muted">加载配置中...</span>
                </div>
              )}
            </Card.Content>
            {configForm && (
              <Card.Footer>
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
              </Card.Footer>
            )}
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>TMDB 设置</Card.Title>
              <Card.Description>The Movie Database API 配置</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-6">
              {tmdbSaveStatus.status !== 'idle' &&
                tmdbSaveStatus.status !== 'saving' && (
                  <div
                    className={`flex items-center gap-2 rounded-md p-3 ${
                      tmdbSaveStatus.status === 'success'
                        ? 'bg-success/10 text-success'
                        : 'bg-danger/10 text-danger'
                    }`}
                  >
                    {tmdbSaveStatus.status === 'success' ? (
                      <CheckCircle className="size-5" />
                    ) : (
                      <AlertCircle className="size-5" />
                    )}
                    <span className="text-sm">{tmdbSaveStatus.message}</span>
                  </div>
                )}

              {tmdbForm ? (
                <div className="grid grid-cols-1 gap-4">
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
                    <p className="mt-1 text-xs text-muted">
                      若您使用已有 API Key 鉴权的 TMDB API 代理，请在 API Key
                      填写“proxy”。
                    </p>
                  </TextField>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-muted" />
                  <span className="ml-2 text-sm text-muted">加载配置中...</span>
                </div>
              )}
            </Card.Content>
            {tmdbForm && (
              <Card.Footer>
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
              </Card.Footer>
            )}
          </Card>
        </>
      )}

      {/* 未连接提示 */}
      {!isServerConnected && (
        <Card className="border-dashed border-2 border-border">
          <Card.Content className="py-8 text-center">
            <p className="text-sm text-muted">
              请先配置并连接到后端服务器以解锁更多设置选项
            </p>
          </Card.Content>
        </Card>
      )}
    </div>
  )
}
