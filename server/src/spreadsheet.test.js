import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { stripSpreadsheetDrawings } from './spreadsheet.js';

test('removes drawing parts that cause ExcelJS anchor parsing errors without losing cells', async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Data').getCell('A1').value = 'Retain this value';
  const archive = await JSZip.loadAsync(await workbook.xlsx.writeBuffer());
  const worksheetPath = 'xl/worksheets/sheet1.xml';
  const worksheetXml = await archive.file(worksheetPath).async('string');
  archive.file(worksheetPath, worksheetXml.replace(
    '</worksheet>',
    '<drawing r:id="rId2"/></worksheet>'
  ));
  archive.file('xl/worksheets/_rels/sheet1.xml.rels', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>',
    '</Relationships>'
  ].join(''));
  archive.file('xl/drawings/drawing1.xml', '<xdr:invalidDrawing/>');
  archive.file('xl/drawings/_rels/drawing1.xml.rels', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>'
  ].join(''));

  const malformedBuffer = await archive.generateAsync({ type: 'nodebuffer' });
  await assert.rejects(new ExcelJS.Workbook().xlsx.load(malformedBuffer), /anchors/);

  const sanitizedBuffer = await stripSpreadsheetDrawings(malformedBuffer);
  const sanitizedWorkbook = await new ExcelJS.Workbook().xlsx.load(sanitizedBuffer);
  assert.equal(sanitizedWorkbook.getWorksheet('Data').getCell('A1').value, 'Retain this value');
});
