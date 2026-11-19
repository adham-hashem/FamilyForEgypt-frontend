/**
 * Reads the first sheet of an Excel (.xlsx) file, or a .csv file, into rows of text. Runs in the browser:
 * an .xlsx is a zip of XML parts, opened here with the browser's own decompression.
 */

const decoder = new TextDecoder('utf-8');

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

interface ZipEntry { method: number; compressed: number; offset: number }

/** The entries of a zip file, from its central directory. */
function readDirectory(bytes: Uint8Array): Map<string, ZipEntry> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new Error('الملف ليس بصيغة Excel (xlsx) صحيحة.');
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const entries = new Map<string, ZipEntry>();
  for (let n = 0; n < count; n++) {
    if (view.getUint32(at, true) !== 0x02014b50) break;
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    entries.set(name, { method: view.getUint16(at + 10, true), compressed: view.getUint32(at + 20, true), offset: view.getUint32(at + 42, true) });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function readEntry(bytes: Uint8Array, entry: ZipEntry): Promise<string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const start = entry.offset + 30 + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true);
  const raw = bytes.subarray(start, start + entry.compressed);
  if (entry.method === 0) return decoder.decode(raw);
  if (entry.method === 8) return decoder.decode(await inflate(raw));
  throw new Error('طريقة ضغط غير مدعومة في الملف.');
}

/** A1 → 0, B1 → 1, AA1 → 26. */
const columnIndex = (ref: string) => {
  let n = 0;
  for (const ch of ref.replace(/[0-9]/g, '')) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

const textOf = (node: Element) => Array.from(node.getElementsByTagName('t')).map((t) => t.textContent ?? '').join('');

async function readXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  const bytes = new Uint8Array(buffer);
  const entries = readDirectory(bytes);
  const sheetName = [...entries.keys()].filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0];
  if (!sheetName) throw new Error('لم أجد ورقة بيانات داخل الملف.');

  const shared: string[] = [];
  const sharedEntry = entries.get('xl/sharedStrings.xml');
  if (sharedEntry) {
    const doc = new DOMParser().parseFromString(await readEntry(bytes, sharedEntry), 'application/xml');
    for (const si of Array.from(doc.getElementsByTagName('si'))) shared.push(textOf(si));
  }

  const sheet = new DOMParser().parseFromString(await readEntry(bytes, entries.get(sheetName)!), 'application/xml');
  const rows: string[][] = [];
  for (const row of Array.from(sheet.getElementsByTagName('row'))) {
    const cells: string[] = [];
    for (const cell of Array.from(row.getElementsByTagName('c'))) {
      const at = columnIndex(cell.getAttribute('r') ?? '');
      const type = cell.getAttribute('t');
      const v = cell.getElementsByTagName('v')[0]?.textContent ?? '';
      cells[at >= 0 ? at : cells.length] = type === 's' ? (shared[Number(v)] ?? '')
        : type === 'inlineStr' ? textOf(cell)
        : v;
    }
    rows.push(Array.from(cells, (c) => (c ?? '').trim()));
  }
  return rows;
}

function readCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, '');
  const delimiter = (source.split('\n')[0].match(/;/g)?.length ?? 0) > (source.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(cell.trim()); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i++;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell.trim()); rows.push(row); }
  return rows;
}

/** Rows of text from an .xlsx or .csv file; empty rows are dropped. */
export async function readSpreadsheet(file: File): Promise<string[][]> {
  const rows = /\.csv$/i.test(file.name) ? readCsv(await file.text()) : await readXlsx(await file.arrayBuffer());
  return rows.filter((row) => row.some((cell) => cell !== ''));
}
