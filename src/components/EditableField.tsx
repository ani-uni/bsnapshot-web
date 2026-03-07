import { Button } from '@heroui/react'
import { useMemo } from 'react'

interface EditableFieldProps {
  value: string
  buttonLabel?: string
  onApply: () => void | Promise<void>
  isDisabled?: boolean
  isPending?: boolean
  children?: React.ReactNode
}

export default function EditableField({
  value,
  buttonLabel = '应用',
  onApply,
  isDisabled = false,
  isPending = false,
  children,
}: EditableFieldProps) {
  const displayContent = useMemo(() => {
    return children || <span className="text-sm">{value}</span>
  }, [value, children])

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">{displayContent}</div>
      <Button
        size="sm"
        isDisabled={isDisabled}
        isPending={isPending}
        onPress={onApply}
      >
        {buttonLabel}
      </Button>
    </div>
  )
}
