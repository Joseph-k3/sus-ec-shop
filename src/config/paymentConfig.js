// 決済方法の設定
export const paymentConfig = {
  // クレジットカード決済の有効/無効
  creditCardEnabled: true, // 一時的に無効化

  // 将来的に他の決済方法を追加する場合
  bankTransferEnabled: true,
  cashOnDeliveryEnabled: true,
  
  // 無効化時に表示するメッセージ
  disabledMessage: {
    creditCard: 'クレジットカード決済は現在メンテナンス中です。ご迷惑をおかけして申し訳ございません。'
  }
}

// 設定を簡単に変更できるヘルパー関数
export const toggleCreditCard = (enabled) => {
  paymentConfig.creditCardEnabled = enabled
}

// 設定値を取得するヘルパー関数
export const isCreditCardEnabled = () => paymentConfig.creditCardEnabled
export const getCreditCardDisabledMessage = () => paymentConfig.disabledMessage.creditCard
