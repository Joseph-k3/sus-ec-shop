/**
 * 署名付きURLアップロードのテストスクリプト
 * 
 * 使い方:
 * node scripts/test-presigned-url.js
 */

import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// テスト設定
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5175'
const TEST_FILE_PATH = path.join(__dirname, '../public/test-video.txt') // テスト用ダミーファイル

async function testPresignedUrlGeneration() {
  console.log('🧪 署名付きURL生成テスト開始')
  console.log('API URL:', `${API_BASE_URL}/api/r2/presigned-url`)

  try {
    // ステップ1: 署名付きURLを取得
    console.log('\n📝 ステップ1: 署名付きURL取得リクエスト')
    const response = await fetch(`${API_BASE_URL}/api/r2/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: 'test-video.mp4',
        contentType: 'video/mp4'
      })
    })

    console.log('レスポンスステータス:', response.status, response.statusText)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ エラーレスポンス:', errorData)
      throw new Error(`署名付きURL取得失敗: ${response.status}`)
    }

    const result = await response.json()
    console.log('✅ 署名付きURL取得成功')
    console.log('結果:', {
      signedUrl: result.signedUrl ? '取得済み（長いため省略）' : 'なし',
      publicUrl: result.publicUrl,
      key: result.key,
      expiresIn: result.expiresIn
    })

    // ステップ2: ダミーファイルを作成
    console.log('\n📝 ステップ2: テストファイル作成')
    const testContent = 'This is a test video file for presigned URL upload.'
    fs.writeFileSync(TEST_FILE_PATH, testContent)
    console.log('✅ テストファイル作成:', TEST_FILE_PATH)

    // ステップ3: 署名付きURLでアップロード
    console.log('\n📝 ステップ3: 署名付きURLでアップロード')
    const fileBuffer = fs.readFileSync(TEST_FILE_PATH)
    
    const uploadResponse = await fetch(result.signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
      },
      body: fileBuffer
    })

    console.log('アップロードレスポンスステータス:', uploadResponse.status, uploadResponse.statusText)

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('❌ アップロードエラー:', errorText)
      throw new Error(`R2アップロード失敗: ${uploadResponse.status}`)
    }

    console.log('✅ R2へのアップロード成功')
    console.log('公開URL:', result.publicUrl)

    // クリーンアップ
    console.log('\n🧹 クリーンアップ: テストファイル削除')
    fs.unlinkSync(TEST_FILE_PATH)
    console.log('✅ テストファイル削除完了')

    console.log('\n🎉 すべてのテストが成功しました！')
    return {
      success: true,
      publicUrl: result.publicUrl,
      key: result.key
    }

  } catch (error) {
    console.error('\n❌ テスト失敗:', error.message)
    console.error('エラー詳細:', error)

    // クリーンアップ（エラー時）
    if (fs.existsSync(TEST_FILE_PATH)) {
      fs.unlinkSync(TEST_FILE_PATH)
      console.log('🧹 テストファイル削除（エラー時クリーンアップ）')
    }

    return {
      success: false,
      error: error.message
    }
  }
}

// メイン実行
testPresignedUrlGeneration()
  .then(result => {
    console.log('\n最終結果:', result)
    process.exit(result.success ? 0 : 1)
  })
  .catch(error => {
    console.error('予期しないエラー:', error)
    process.exit(1)
  })
