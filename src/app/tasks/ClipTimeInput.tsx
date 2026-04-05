import { Input, Label, TextField } from '@heroui/react'
import { useEffect, useState } from 'react'

import { hmsToSeconds, secondsToHms } from './utils'

export function ClipTimeInput({
  value,
  onChange,
  isDisabled,
}: {
  value: number
  onChange: (v: number) => void
  isDisabled?: boolean
}) {
  const [text, setText] = useState(secondsToHms(value))

  useEffect(() => {
    setText(secondsToHms(value))
  }, [value])

  return (
    <TextField
      value={text}
      onChange={setText}
      className="w-32"
      variant="secondary"
      isDisabled={isDisabled}
    >
      <Label className="sr-only">时间</Label>
      <Input
        placeholder="hh:mm:ss"
        onBlur={() => {
          const parsed = hmsToSeconds(text)
          if (parsed !== null) {
            onChange(parsed)
          } else {
            setText(secondsToHms(value))
          }
        }}
      />
    </TextField>
  )
}
