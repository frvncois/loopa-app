import { useEditorStore } from '@/stores/editorStore'
import { useUiStore } from '@/stores/uiStore'
import { importSvg } from '@/lib/import/SvgImporter'

export function useImport() {
  const editor = useEditorStore()
  const ui = useUiStore()

  function importSvgString(svg: string): void {
    const result = importSvg(svg)
    for (const el of result.elements) {
      editor.addElement(el)
    }
    if (result.elements.length > 0) {
      ui.selectAll(result.elements.map(e => e.id))
    }
  }

  async function importSvgFile(file: File): Promise<void> {
    const svg = await file.text()
    importSvgString(svg)
  }

  return { importSvgFile, importSvgString }
}
