import JSZip from 'jszip';

const drawingReferencePattern = /<(?:[\w.-]+:)?drawing\b[^>]*\/>|<(?:[\w.-]+:)?drawing\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?drawing\s*>/gi;
const drawingPartPattern = /^xl\/drawings\/(?:_rels\/)?drawing[^/]*\.xml(?:\.rels)?$/i;
const worksheetPattern = /^xl\/worksheets\/sheet\d+\.xml$/i;

export async function stripSpreadsheetDrawings(buffer) {
  const archive = await JSZip.loadAsync(buffer);
  let changed = false;

  for (const [path, entry] of Object.entries(archive.files)) {
    if (entry.dir) continue;
    if (drawingPartPattern.test(path)) {
      archive.remove(path);
      changed = true;
      continue;
    }
    if (!worksheetPattern.test(path)) continue;

    const worksheetXml = await entry.async('string');
    const withoutDrawings = worksheetXml.replace(drawingReferencePattern, '');
    if (withoutDrawings !== worksheetXml) {
      archive.file(path, withoutDrawings);
      changed = true;
    }
  }

  return changed ? archive.generateAsync({ type: 'nodebuffer' }) : buffer;
}
