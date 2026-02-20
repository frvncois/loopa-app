/**
 * WebmExporter — thin wrapper around VideoExporter with WebM format
 * and transparent background support.
 */
import type { ExportPayload } from '@/types/export'
import type { BaseExporter } from './BaseExporter'
import { exportVideo } from './VideoExporter'

export const WebmExporter: BaseExporter = {
  async export(payload: ExportPayload): Promise<Blob> {
    return exportVideo(payload, { format: 'webm' })
  }
}

export async function exportWebm(
  payload: ExportPayload,
  transparentBackground: boolean,
  onProgress?: (percent: number, frame: number) => void
): Promise<Blob> {
  return exportVideo(payload, {
    format: 'webm',
    transparentBackground,
    onProgress,
  })
}
