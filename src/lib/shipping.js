// 送料計算ユーティリティ

/**
 * 郵便番号を元に送料を計算する
 * @param {string} zipCode - 郵便番号（例: "810-0001"）
 * @returns {number} 送料（円）
 */
export function calculateShippingFee(zipCode) {
  // 🚨 一時的に送料を無料化（テスト用）
  return 0
  
  /* 通常の送料計算ロジック（テスト後に戻す場合はコメント解除）
  if (!zipCode || typeof zipCode !== 'string') {
    return 1000 // デフォルト送料
  }

  // ハイフンを削除して数値部分のみ取得
  const numericZip = zipCode.replace(/[-\s]/g, '')
  
  if (numericZip.length < 3) {
    return 1000 // デフォルト送料
  }

  // 先頭3桁で地域判定
  const prefixCode = parseInt(numericZip.substring(0, 3))

  // 沖縄: 900-907
  if (prefixCode >= 900 && prefixCode <= 907) {
    return 1800
  }

  // 北海道: 001-099（ただし100番台は東京都なので除外）
  if (prefixCode >= 1 && prefixCode <= 99) {
    return 1800
  }

  // 離島は通常送料とする（1000円）
  // 離島判定コードを削除

  // その他の地域は通常送料
  return 1000
  */
}

/**
 * 地域名を取得する
 * @param {string} zipCode - 郵便番号
 * @returns {string} 地域名
 */
export function getShippingRegion(zipCode) {
  const fee = calculateShippingFee(zipCode)
  
  if (fee === 1800) {
    const numericZip = zipCode.replace(/[-\s]/g, '')
    const prefixCode = parseInt(numericZip.substring(0, 3))
    
    if (prefixCode >= 900 && prefixCode <= 907) {
      return '沖縄'
    } else if (prefixCode >= 1 && prefixCode <= 99) {
      return '北海道'
    }
  }
  
  // 離島も本州・四国・九州と同じ扱い
  return '本州・四国・九州'
}

/**
 * 送料込みの合計金額を計算する
 * @param {number} itemTotal - 商品代金合計
 * @param {string} zipCode - 郵便番号
 * @returns {object} { itemTotal, shippingFee, totalAmount, region }
 */
export function calculateTotalWithShipping(itemTotal, zipCode) {
  const shippingFee = calculateShippingFee(zipCode)
  const region = getShippingRegion(zipCode)
  
  return {
    itemTotal,
    shippingFee,
    totalAmount: itemTotal + shippingFee,
    region
  }
}

/**
 * 住所文字列から送料情報を抽出する
 * @param {string} address - 住所文字列（例: "東京都... [送料:1800円(北海道)]"）
 * @returns {object} { shippingFee, region, itemPrice }
 */
export function extractShippingInfoFromAddress(address, totalPrice) {
  if (!address || typeof address !== 'string') {
    return { shippingFee: 1000, region: '本州・四国・九州', itemPrice: totalPrice - 1000 }
  }

  // 送料情報の正規表現パターン: [送料:1800円(北海道)]
  const shippingMatch = address.match(/\[送料:(\d+)円\(([^)]+)\)\]/)
  
  if (shippingMatch) {
    const shippingFee = parseInt(shippingMatch[1])
    const region = shippingMatch[2]
    const itemPrice = totalPrice - shippingFee
    
    return {
      shippingFee,
      region,
      itemPrice: Math.max(0, itemPrice) // 負の値にならないように
    }
  }

  // パターンが見つからない場合はデフォルト値
  return { shippingFee: 1000, region: '本州・四国・九州', itemPrice: totalPrice - 1000 }
}
