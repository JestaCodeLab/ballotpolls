// A small CSV reader for the candidate import. It copes with quoted cells, commas inside quotes, doubled quotes,
// Windows line endings, a leading byte-order mark, and files that use semicolons or tabs (common from Excel).

export interface CsvLine {
  // Line number in the file, starting at 1, so problems can point at the right row.
  line: number
  cells: string[]
}

export function parseCsv(text: string): CsvLine[] {
  const input = text.replace(/^﻿/, '')
  const firstLine = input.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0]

  const lines: CsvLine[] = []
  let cells: string[] = []
  let cell = ''
  let quoted = false
  let line = 1
  let startLine = 1

  const endCell = () => {
    cells.push(cell)
    cell = ''
  }
  const endLine = () => {
    endCell()
    if (cells.some((c) => c.trim() !== '')) lines.push({ line: startLine, cells: cells.map((c) => c.trim()) })
    cells = []
    startLine = line + 1
  }

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else {
        if (ch === '\n') line++
        cell += ch
      }
    } else if (ch === '"') quoted = true
    else if (ch === delimiter) endCell()
    else if (ch === '\n') {
      endLine()
      line++
      startLine = line
    } else if (ch !== '\r') cell += ch
  }
  if (cell !== '' || cells.length) endLine()
  return lines
}

/* ---------- The candidate import sheet ---------- */

export interface ImportRow {
  line: number
  category: string
  subCategory: string
  name: string
  bio: string
}

export const MAX_IMPORT_ROWS = 500

const norm = (h: string) => h.toLowerCase().replace(/[^a-z]/g, '')
const ALIASES = {
  category: ['category', 'categories'],
  subCategory: ['subcategory', 'subcategories', 'sub'],
  name: ['candidate', 'candidatename', 'name', 'fullname'],
  bio: ['bio', 'shortbio', 'description'],
}

// Turns the text of an uploaded file into rows, or says what is wrong with it.
export function readImportSheet(text: string): { rows: ImportRow[]; error?: string } {
  const lines = parseCsv(text)
  if (lines.length === 0) return { rows: [], error: 'That file is empty.' }
  const headers = lines[0].cells.map(norm)
  const col = (key: keyof typeof ALIASES) => headers.findIndex((h) => ALIASES[key].includes(h))
  const at = { category: col('category'), subCategory: col('subCategory'), name: col('name'), bio: col('bio') }
  if (at.category < 0 || at.name < 0)
    return { rows: [], error: `We could not find the ${at.name < 0 ? '"Name"' : '"Category"'} column. Download the template to see the format.` }
  const rows = lines.slice(1).map((l) => {
    let category = l.cells[at.category] ?? ''
    let subCategory = at.subCategory >= 0 ? (l.cells[at.subCategory] ?? '') : ''
    // "Music > Artiste of the Year" in the Category column means a sub-category under Music.
    const arrow = category.indexOf('>')
    if (!subCategory && arrow >= 0) {
      subCategory = category.slice(arrow + 1).trim()
      category = category.slice(0, arrow).trim()
    }
    return { line: l.line, category, subCategory, name: l.cells[at.name] ?? '', bio: at.bio >= 0 ? (l.cells[at.bio] ?? '') : '' }
  })
  if (rows.length === 0) return { rows: [], error: 'The file has a header row but no candidates in it.' }
  if (rows.length > MAX_IMPORT_ROWS) return { rows: [], error: `That file has ${rows.length} rows. Import at most ${MAX_IMPORT_ROWS} at a time.` }
  return { rows }
}

// Two columns. A category with sub-categories is written "Parent > Sub-category".
const TEMPLATE = [
  'Name,Category',
  'Ama Boateng,Music > Artiste of the Year',
  'Kwabena Darko,Music > Artiste of the Year',
  'Efua Quaye,Entertainment > Best New Act',
  'Kojo Ankomah,President',
].join('\r\n')

// Saves the example file to the person's computer.
export function downloadImportTemplate() {
  const url = URL.createObjectURL(new Blob(['﻿' + TEMPLATE], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'tally-candidates-template.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
