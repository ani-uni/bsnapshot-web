import { Accordion, Card, Separator, Spinner } from '@heroui/react'
import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router'

import type { CaptureItem } from './types'

export function CaptureList({
  captureList,
  isLoading,
}: {
  captureList: CaptureItem[]
  isLoading: boolean
}) {
  const navigate = useNavigate()

  return (
    <Card className="p-6">
      <Card.Header>
        <Card.Title>已有采集</Card.Title>
      </Card.Header>
      <Separator />
      <Card.Content>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner color="current" />
          </div>
        ) : captureList.length === 0 ? (
          <p className="text-muted">暂无采集</p>
        ) : (
          <Accordion>
            {captureList.map((capture) => (
              <Accordion.Item key={capture.cid} id={capture.cid}>
                <Accordion.Heading>
                  <Accordion.Trigger
                    onPress={() => navigate(`/tasks/captures/${capture.cid}`)}
                  >
                    <span className="font-mono">{capture.cid}</span>
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
