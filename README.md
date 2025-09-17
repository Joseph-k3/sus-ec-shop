# 多肉植物ECサイト

Vue 3 + Vite + Supabaseを使用した多肉植物のECサイトです。

## 決済方法の設定

クレジットカード決済の有効/無効は `src/config/paymentConfig.js` で管理できます。

### クレジットカード決済を無効にする場合

```javascript
// src/config/paymentConfig.js
export const paymentConfig = {
  creditCardEnabled: false, // ← falseに設定
  // ...
}
```

### クレジットカード決済を有効にする場合

```javascript
// src/config/paymentConfig.js
export const paymentConfig = {
  creditCardEnabled: true, // ← trueに設定
  // ...
}
```

無効化されている間は、決済画面でクレジットカードボタンが無効化され、メンテナンス中のメッセージが表示されます。
