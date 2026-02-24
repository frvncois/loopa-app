export interface Guide {
  id: string
  /** 'horizontal' = line runs left–right at a y position; 'vertical' = line runs top–bottom at an x position */
  axis: 'horizontal' | 'vertical'
  /** Position in SVG/artboard coordinate space (px) */
  position: number
  locked: boolean
}
