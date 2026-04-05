import { Spinner, toast } from '@heroui/react'
import { useAtomValue } from 'jotai'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'

import { apiBaseUrlAtom } from '@/atoms/api'
import { RequireConnection } from '@/components/RequireConnection'

import { CaptureList } from './CaptureList'
import type { CaptureItem } from './types'

const AddCapture = lazy(() => import('./AddCapture'))

export default function TasksPage() {
  const apiBaseUrl = useAtomValue(apiBaseUrlAtom)

  const [captureList, setCaptureList] = useState<CaptureItem[]>([])
  const [isLoadingCaptures, setIsLoadingCaptures] = useState(false)

  const fetchCaptures = useCallback(async () => {
    setIsLoadingCaptures(true)
    try {
      const res = await fetch(`${apiBaseUrl}/api/tasks/captures`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as CaptureItem[]
      setCaptureList(data)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`加载采集列表失败：${errorMsg}`)
    } finally {
      setIsLoadingCaptures(false)
    }
  }, [apiBaseUrl])

  useEffect(() => {
    void fetchCaptures()
  }, [fetchCaptures])

  return (
    <RequireConnection>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-4xl font-bold">任务</h1>

        <Suspense
          fallback={
            <div className="mb-6 flex justify-center py-8">
              <Spinner color="current" />
            </div>
          }
        >
          <AddCapture
            apiBaseUrl={apiBaseUrl}
            onCaptureCreated={() => void fetchCaptures()}
          />
        </Suspense>

        <CaptureList captureList={captureList} isLoading={isLoadingCaptures} />
      </div>
    </RequireConnection>
  )
}
