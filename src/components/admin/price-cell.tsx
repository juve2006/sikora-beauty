'use client';

import { DefaultCell } from '@payloadcms/ui';
import type { DefaultCellComponentProps, NumberFieldClient } from 'payload';
import { formatHryvnias } from '@/lib/utils';

// The products list shows hryvnias too: its column is labelled «Ціна, грн». Payload's own cell
// keeps the rest — the link to the product when the column comes first, «<No …>» when empty.
const PriceCell = (props: DefaultCellComponentProps<NumberFieldClient>) => (
  <DefaultCell
    {...props}
    cellData={
      typeof props.cellData === 'number'
        ? formatHryvnias(props.cellData)
        : props.cellData
    }
  />
);

export default PriceCell;
