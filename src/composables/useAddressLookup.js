// composables/useAddressLookup.js
// 郵便番号から住所を取得するコンポサブル

import { ref } from 'vue'

export function useAddressLookup() {
  const isLoading = ref(false)
  const error = ref(null)
  let debounceTimer = null

  // 郵便番号のフォーマット関数
  const formatZipCode = (value) => {
    // 数字以外を削除
    let cleanValue = value.replace(/[^0-9]/g, '')
    
    // 7桁を超える場合は切り捨て
    if (cleanValue.length > 7) {
      cleanValue = cleanValue.slice(0, 7)
    }
    
    // 3桁目の後にハイフンを挿入
    if (cleanValue.length >= 4) {
      return cleanValue.slice(0, 3) + '-' + cleanValue.slice(3)
    }
    
    return cleanValue
  }

  // 郵便番号の検証
  const isValidZipCode = (zipCode) => {
    // ハイフンありなしどちらでも受け入れる
    return /^\d{3}-?\d{4}$/.test(zipCode) || /^\d{7}$/.test(zipCode)
  }

  // zipcloud.ibsnet.co.jpの無料APIを使用
  const fetchAddressByZipCode = async (zipCode, immediate = false) => {
    if (!zipCode || !isValidZipCode(zipCode)) {
      return null
    }

    // デバウンス処理（即座に実行する場合は除く）
    if (!immediate) {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      
      return new Promise((resolve) => {
        debounceTimer = setTimeout(async () => {
          const result = await performAddressLookup(zipCode)
          resolve(result)
        }, 500) // 500ms後に実行
      })
    }

    return performAddressLookup(zipCode)
  }

  const performAddressLookup = async (zipCode) => {
    // ハイフンを除去
    const cleanZipCode = zipCode.replace('-', '')
    
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanZipCode}`)
      
      if (!response.ok) {
        throw new Error('住所の取得に失敗しました')
      }

      const data = await response.json()
      
      if (data.status !== 200) {
        throw new Error(data.message || '住所の取得に失敗しました')
      }

      if (!data.results || data.results.length === 0) {
        return null // 住所が見つからない場合
      }

      // 全ての結果を返す（複数の候補がある場合）
      const results = data.results.map(result => ({
        prefecture: result.address1,
        city: result.address2,
        town: result.address3,
        fullAddress: `${result.address1}${result.address2}${result.address3}`,
        zipcode: result.zipcode,
        prefcode: result.prefcode,
        citycode: result.citycode
      }))
      
      return {
        results: results,
        count: results.length,
        primary: results[0] // 最初の結果をプライマリとして設定
      }
    } catch (err) {
      error.value = err.message || '住所の取得中にエラーが発生しました'
      console.error('Address lookup error:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // デバウンスタイマーをクリア
  const clearDebounce = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  return {
    fetchAddressByZipCode,
    formatZipCode,
    isValidZipCode,
    clearDebounce,
    isLoading,
    error
  }
}
