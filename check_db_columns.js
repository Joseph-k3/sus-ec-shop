// const supabaseUrl = 'https://hcqgfdyentwazmyikvtl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcWdmZHllbnR3YXpteWlrdnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODcxNzYsImV4cCI6MjA2ODE2MzE3Nn0.cVlLktBIpOEGRJygkJyMZQGGT2xtryd6vsPO1tKbAlE'タベースのテーブル構造を確認するスクリプト
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hcqgfdyentwazmyikvtl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcWdmZHllbnR3YXptaWlrdnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTI5MTQ1MDIsImV4cCI6MjAyODQ5MDUwMn0.WZtFQS-9s9dgjjMdP3VQu-PgKs_hYqlLd6iKj1SDQ_g'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTableStructure() {
  try {
    console.log('=== ordersテーブルの構造確認 ===')
    
    // 1. ordersテーブルの全カラムを確認
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('テーブル取得エラー:', error)
      return
    }
    
    if (data && data.length > 0) {
      console.log('利用可能なカラム:', Object.keys(data[0]))
    } else {
      console.log('テーブルにデータがありません。空のテーブルから構造を確認...')
      
      // 空のテーブルでもカラム名を取得する別の方法
      try {
        const { error: selectError } = await supabase
          .from('orders')
          .select('zip_code')
          .limit(0)
        
        if (selectError) {
          console.log('zip_codeカラムは存在しません:', selectError.message)
        } else {
          console.log('zip_codeカラムが存在します')
        }
      } catch (e) {
        console.log('zip_code確認エラー:', e.message)
      }
    }
    
    // 2. 実際に簡単な挿入を試してみる（テスト）
    console.log('\n=== テスト挿入の確認 ===')
    const testData = {
      order_number: 'TEST123',
      product_id: 1,
      product_name: 'テスト商品',
      product_image: 'test.jpg',
      price: 1000,
      quantity: 1,
      customer_name: 'テスト太郎',
      email: 'test@example.com',
      phone: '090-1234-5678',
      zip_code: '123-4567',
      address: 'テスト住所',
      payment_method: 'test',
      status: 'test'
    }
    
    const { error: insertError } = await supabase
      .from('orders')
      .insert([testData])
      .select()
    
    if (insertError) {
      console.log('テスト挿入エラー:', insertError)
      console.log('エラーコード:', insertError.code)
      console.log('エラーメッセージ:', insertError.message)
    } else {
      console.log('テスト挿入は成功しました（実際のデータは挿入していません）')
    }
    
  } catch (e) {
    console.error('チェック中にエラー:', e)
  }
}

checkTableStructure()
