// Reads a spreadsheet file into the CSV text the candidate import already understands. Apple Numbers (.numbers), Excel
// (.xlsx, .xls) and plain CSV all end up as the same rows, so the import checks them in one place. The spreadsheet reader
// is large, so it is only fetched when someone actually chooses one of those files.

export const SPREADSHEET_EXT = /\.(numbers|xlsx|xls|ods)$/i
export const TEXT_EXT = /\.(csv|txt)$/i

export const isSupportedSheet = (file: File) => SPREADSHEET_EXT.test(file.name) || TEXT_EXT.test(file.name) || file.type.includes('csv') || file.type.startsWith('text/')

export async function readSheetFile(file: File): Promise<string> {
  if (!SPREADSHEET_EXT.test(file.name)) return file.text()
  const XLSX = await import('xlsx')
  const book = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  // The first sheet is the one with the candidates.
  const sheet = book.Sheets[book.SheetNames[0]]
  if (!sheet) throw new Error('That file has no sheets in it.')
  return XLSX.utils.sheet_to_csv(sheet, { blankrows: false })
}
