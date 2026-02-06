/**
 * Google スプレッドシートURLをTSVエクスポートURLに変換するユーティリティ
 */

const SHEETS_URL_PATTERN = /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/

export function isGoogleSheetsUrl(url: string): boolean {
  return SHEETS_URL_PATTERN.test(url)
}

export function convertGoogleSheetsUrl(url: string): string {
  const match = url.match(SHEETS_URL_PATTERN)
  if (!match) {
    throw new Error('無効なGoogle スプレッドシートURLです')
  }

  const spreadsheetId = match[1]

  // gid をハッシュまたはクエリパラメータから抽出
  let gid: string | null = null

  // #gid=0 形式
  const hashMatch = url.match(/#gid=(\d+)/)
  if (hashMatch) {
    gid = hashMatch[1]
  }

  // ?gid=0 or &gid=0 形式
  if (!gid) {
    const paramMatch = url.match(/[?&]gid=(\d+)/)
    if (paramMatch) {
      gid = paramMatch[1]
    }
  }

  let exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=tsv`
  if (gid) {
    exportUrl += `&gid=${gid}`
  }

  return exportUrl
}
