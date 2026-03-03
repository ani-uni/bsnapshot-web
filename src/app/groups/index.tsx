import {
  Accordion,
  Button,
  Card,
  Separator,
  Spinner,
  toast,
} from '@heroui/react'
import { useAtom, useAtomValue } from 'jotai'
import { ChevronRight, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { apiBaseUrlAtom } from '@/atoms/api'
import { breadcrumbsAtom } from '@/atoms/groups/breadcrumbs'

type SeriesItem = {
  id: string
  title: string | null
}

function displayTitle(title: string | null | undefined) {
  return title?.trim() || '未命名'
}

export default function GroupsIndexPage() {
  const apiBaseUrl = useAtomValue(apiBaseUrlAtom)
  const navigate = useNavigate()
  const [, setBreadcrumbs] = useAtom(breadcrumbsAtom)
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const fetchSeriesList = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/series`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = (await response.json()) as SeriesItem[]
      setSeriesList(data)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`加载系列列表失败：${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }, [apiBaseUrl])

  const handleCreateSeries = async () => {
    setIsCreating(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/series`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const newSeries = (await response.json()) as SeriesItem
      toast.success('新建系列成功')
      setSeriesList((prev) => [...prev, newSeries])
      navigate(`/groups/series/${newSeries.id}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`新建系列失败：${errorMsg}`)
    } finally {
      setIsCreating(false)
    }
  }

  useEffect(() => {
    setBreadcrumbs([{ label: '合集' }])
  }, [setBreadcrumbs])

  useEffect(() => {
    void fetchSeriesList()
  }, [fetchSeriesList])

  return (
    <Card className="p-6">
      <Card.Header>
        <Card.Title>Series管理</Card.Title>
        <div className="flex justify-end">
          <Button isPending={isCreating} onPress={handleCreateSeries}>
            {({ isPending }) => (
              <>
                {isPending ? <Spinner color="current" size="sm" /> : null}
                <Plus />
                新建
              </>
            )}
          </Button>
        </div>
      </Card.Header>
      <Separator />
      <Card.Content>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner color="current" />
          </div>
        ) : seriesList.length === 0 ? (
          <p className="text-muted">暂无系列</p>
        ) : (
          <Accordion>
            {seriesList.map((series) => (
              <Accordion.Item key={series.id} id={series.id}>
                <Accordion.Heading>
                  <Accordion.Trigger
                    onPress={() => navigate(`/groups/series/${series.id}`)}
                  >
                    {displayTitle(series.title)}
                    <Accordion.Indicator>
                      <ChevronRight />
                    </Accordion.Indicator>
                  </Accordion.Trigger>
                </Accordion.Heading>
              </Accordion.Item>
            ))}
          </Accordion>
        )}
      </Card.Content>
    </Card>
  )
}
