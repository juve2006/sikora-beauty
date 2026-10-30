'use client'

import { DefaultCell, TextInput, useField } from '@payloadcms/ui'
import { mergeFieldStyles } from '@payloadcms/ui/shared'
import type { DefaultCellComponentProps, NumberFieldClient, NumberFieldClientComponent } from 'payload'
import { type ChangeEvent, useState } from 'react'

import { formatHryvnias, parseHryvnias } from '@/lib/price'

// The owner types hryvnias; the field stores integer kopiyky. Typing kopiyky by hand invites
// a price off by a factor of 100.
export const PriceField: NumberFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, showError, disabled } = useField<number | null>({ path })
  const shown = typeof value === 'number' ? formatHryvnias(value) : ''
  // The text being typed, kept until the field loses focus; otherwise the field shows the form's
  // value. "Revert to published" resets the form without remounting the field, and its button
  // takes the focus away, so the field then shows what will be saved.
  const [typing, setTyping] = useState<string | null>(null)

  return (
    // TextInput takes no onBlur. The wrapper is the row's item, so it carries the field's styles.
    <div style={mergeFieldStyles(field)} onBlur={() => setTyping(null)}>
      <TextInput
        path={path}
        label={field.label}
        required={field.required}
        placeholder="1245,50"
        readOnly={readOnly || disabled}
        showError={showError}
        value={typing ?? shown}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          setTyping(event.target.value)
          setValue(parseHryvnias(event.target.value))
        }}
      />
    </div>
  )
}

// The products list shows hryvnias too: its column is labelled «Ціна, грн». Payload's own cell
// keeps the rest — the link to the product when the column comes first, «<No …>» when empty.
export const PriceCell = (props: DefaultCellComponentProps<NumberFieldClient>) => (
  <DefaultCell {...props} cellData={typeof props.cellData === 'number' ? formatHryvnias(props.cellData) : props.cellData} />
)
