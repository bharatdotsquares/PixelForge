import type { CollageLayout } from '../core/models';
import { uid } from '../core/utils';

export class CollageEngine {
  createLayout(cellCount: number): CollageLayout {
    const columns = Math.ceil(Math.sqrt(cellCount));
    return {
      columns,
      spacing: 10,
      cornerRadius: 12,
      cells: Array.from({ length: cellCount }, () => ({ id: uid('cell'), fitMode: 'cover' as const }))
    };
  }

  updateCellImage(layout: CollageLayout, cellId: string, imageSrc: string): CollageLayout {
    return {
      ...layout,
      cells: layout.cells.map((cell) => (cell.id === cellId ? { ...cell, imageSrc } : cell))
    };
  }
}
