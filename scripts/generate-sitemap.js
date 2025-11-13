// サイトマップ自動生成スクリプト
// 商品データを元に sitemap.xml を自動生成します

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 環境変数を読み込み
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// サイトのベースURL
const BASE_URL = 'https://sus-ec-shop.vercel.app'

// 現在の日付を取得（YYYY-MM-DD形式）
const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0]
}

// XMLエスケープ
const escapeXml = (str) => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// サイトマップを生成
async function generateSitemap() {
  try {
    console.log('🔍 商品データを取得中...')
    
    // Supabaseから全商品を取得
    const { data: products, error } = await supabase
      .from('succulents')
      .select('id, name, updated_at')
      .order('id', { ascending: true })

    if (error) {
      throw new Error(`商品データの取得に失敗: ${error.message}`)
    }

    console.log(`✅ ${products.length}件の商品データを取得しました`)

    // サイトマップXMLを生成
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

  <!-- トップページ（最重要） -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${getCurrentDate()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- 商品一覧ページ -->
  <url>
    <loc>${BASE_URL}/products</loc>
    <lastmod>${getCurrentDate()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- カートページ -->
  <url>
    <loc>${BASE_URL}/cart</loc>
    <lastmod>${getCurrentDate()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- 注文ページ -->
  <url>
    <loc>${BASE_URL}/order</loc>
    <lastmod>${getCurrentDate()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`

    // 各商品ページを追加
    if (products && products.length > 0) {
      sitemap += '\n  <!-- 商品ページ -->\n'
      
      products.forEach(product => {
        const lastmod = product.updated_at 
          ? new Date(product.updated_at).toISOString().split('T')[0]
          : getCurrentDate()
        
        sitemap += `  <url>
    <loc>${BASE_URL}/product/${product.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`
      })
    }

    sitemap += '\n</urlset>'

    // ファイルに保存
    const sitemapPath = path.join(__dirname, '../public/sitemap.xml')
    fs.writeFileSync(sitemapPath, sitemap, 'utf8')

    console.log('✅ サイトマップを生成しました:', sitemapPath)
    console.log(`📊 総URL数: ${products.length + 4}件`)
    console.log(`🌐 サイトマップURL: ${BASE_URL}/sitemap.xml`)
    
    return true

  } catch (error) {
    console.error('❌ サイトマップ生成エラー:', error.message)
    return false
  }
}

// スクリプト実行
console.log('🚀 サイトマップ生成を開始します...\n')
generateSitemap().then(success => {
  if (success) {
    console.log('\n✅ サイトマップ生成が完了しました')
    console.log('\n次のステップ:')
    console.log('1. git add public/sitemap.xml')
    console.log('2. git commit -m "サイトマップを更新"')
    console.log('3. git push origin main')
    console.log('4. Google Search ConsoleとBing Webmaster Toolsで再送信')
    process.exit(0)
  } else {
    console.error('\n❌ サイトマップ生成に失敗しました')
    process.exit(1)
  }
})
