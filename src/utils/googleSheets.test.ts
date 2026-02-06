import { describe, it, expect } from 'vitest'
import { convertGoogleSheetsUrl, isGoogleSheetsUrl } from './googleSheets'

describe('isGoogleSheetsUrl', () => {
  it('正しいURLを検出する', () => {
    expect(isGoogleSheetsUrl('https://docs.google.com/spreadsheets/d/1AbCdEfG/edit')).toBe(true)
  })

  it('gid付きURLを検出する', () => {
    expect(isGoogleSheetsUrl('https://docs.google.com/spreadsheets/d/1AbCdEfG/edit#gid=0')).toBe(true)
  })

  it('無関係なURLをfalseにする', () => {
    expect(isGoogleSheetsUrl('https://example.com')).toBe(false)
    expect(isGoogleSheetsUrl('https://docs.google.com/document/d/123/edit')).toBe(false)
  })

  it('空文字をfalseにする', () => {
    expect(isGoogleSheetsUrl('')).toBe(false)
  })
})

describe('convertGoogleSheetsUrl', () => {
  it('基本的なedit URLを変換する', () => {
    const url = 'https://docs.google.com/spreadsheets/d/1AbCdEfG/edit'
    expect(convertGoogleSheetsUrl(url)).toBe(
      'https://docs.google.com/spreadsheets/d/1AbCdEfG/export?format=tsv'
    )
  })

  it('ハッシュのgidを含める', () => {
    const url = 'https://docs.google.com/spreadsheets/d/1AbCdEfG/edit#gid=123'
    expect(convertGoogleSheetsUrl(url)).toBe(
      'https://docs.google.com/spreadsheets/d/1AbCdEfG/export?format=tsv&gid=123'
    )
  })

  it('gid=0を含める', () => {
    const url = 'https://docs.google.com/spreadsheets/d/1AbCdEfG/edit#gid=0'
    expect(convertGoogleSheetsUrl(url)).toBe(
      'https://docs.google.com/spreadsheets/d/1AbCdEfG/export?format=tsv&gid=0'
    )
  })

  it('クエリパラメータのgidを含める', () => {
    const url = 'https://docs.google.com/spreadsheets/d/1AbCdEfG/edit?gid=456'
    expect(convertGoogleSheetsUrl(url)).toBe(
      'https://docs.google.com/spreadsheets/d/1AbCdEfG/export?format=tsv&gid=456'
    )
  })

  it('ハイフン・アンダースコアを含むIDを処理する', () => {
    const url = 'https://docs.google.com/spreadsheets/d/1Ab-Cd_EfG/edit'
    expect(convertGoogleSheetsUrl(url)).toBe(
      'https://docs.google.com/spreadsheets/d/1Ab-Cd_EfG/export?format=tsv'
    )
  })

  it('gidなしのURLではgidパラメータを付加しない', () => {
    const url = 'https://docs.google.com/spreadsheets/d/1AbCdEfG/edit'
    const result = convertGoogleSheetsUrl(url)
    expect(result).not.toContain('gid=')
  })

  it('無効なURLでエラーをthrowする', () => {
    expect(() => convertGoogleSheetsUrl('https://example.com')).toThrow('無効なGoogle スプレッドシートURLです')
    expect(() => convertGoogleSheetsUrl('')).toThrow('無効なGoogle スプレッドシートURLです')
  })
})
