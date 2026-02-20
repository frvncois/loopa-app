import type { ExportPayload } from '@/types/export'

export interface BaseExporter {
  export(payload: ExportPayload): Promise<Blob | string>
}
