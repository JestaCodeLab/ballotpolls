// Credits one text uses: per 160 characters (153 once it is longer than one), or per 70 (67) when it has characters
// outside the plain set. Matches the server, so the screen can tell the sender the cost before sending.
export const smsCredits = (text: string): number => {
  if (!text) return 0
  const unicode = /[^\x20-\x7E\n\r]/.test(text)
  const [single, multi] = unicode ? [70, 67] : [160, 153]
  return text.length <= single ? 1 : Math.ceil(text.length / multi)
}
