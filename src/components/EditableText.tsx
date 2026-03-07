import { Button, Input } from '@heroui/react'
import { Check, Edit, X } from 'lucide-react'
import { useCallback, useState } from 'react'

interface EditableTextProps {
  value: string | null
  onSave: (value: string) => Promise<void>
  isDisabled?: boolean
  placeholder?: string
  displayClassName?: string
}

export default function EditableText({
  value,
  onSave,
  isDisabled = false,
  placeholder = '输入内容',
  displayClassName = 'text-lg font-semibold',
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingValue, setEditingValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleEdit = useCallback(() => {
    setEditingValue(value || '')
    setIsEditing(true)
  }, [value])

  const handleCancel = useCallback(() => {
    setIsEditing(false)
    setEditingValue('')
  }, [])

  const handleSave = useCallback(async () => {
    if (!editingValue.trim()) return

    setIsSaving(true)
    try {
      await onSave(editingValue.trim())
      setIsEditing(false)
      setEditingValue('')
    } finally {
      setIsSaving(false)
    }
  }, [editingValue, onSave])

  if (isEditing) {
    return (
      <div className="flex gap-2">
        <Input
          autoFocus
          className="flex-1"
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isSaving) {
              void handleSave()
            } else if (e.key === 'Escape') {
              handleCancel()
            }
          }}
          placeholder={placeholder}
        />
        <div className="flex gap-2">
          <Button isPending={isSaving} onPress={handleSave}>
            {({ isPending }) => (
              <>
                {!isPending && <Check />}
                {isPending ? '保存中...' : '保存'}
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            isDisabled={isSaving}
            onPress={handleCancel}
          >
            <X />
            取消
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <div className={displayClassName}>{value ?? '-'}</div>
      {!isDisabled && (
        <Button size="sm" variant="tertiary" onPress={handleEdit}>
          <Edit />
          编辑
        </Button>
      )}
    </div>
  )
}
