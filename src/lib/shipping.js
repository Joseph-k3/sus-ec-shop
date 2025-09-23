// 送料計算ユーティリティ

/**
 * 郵便番号を元に送料を計算する
 * @param {string} zipCode - 郵便番号（例: "810-0001"）
 * @returns {number} 送料（円）
 */
export function calculateShippingFee(zipCode) {
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

  // 離島判定（主要な離島の郵便番号範囲）
  const islandCodes = [
    // 伊豆諸島
    [100, 102],
    // 小笠原諸島
    [100, 104],
    // 佐渡島
    [952, 952],
    // 隠岐諸島
    [684, 685],
    // 対馬
    [817, 817],
    // 壱岐
    [811, 811],
    // 五島列島
    [853, 857],
    // 奄美諸島
    [891, 894],
    // その他の離島
    [898, 899]
  ]

  for (const [start, end] of islandCodes) {
    if (prefixCode >= start && prefixCode <= end) {
      return 1800
    }
  }

  // その他の地域は通常送料
  return 1000
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
    } else {
      return '離島'
    }
  }
  
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
