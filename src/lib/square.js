// Square SDK関連の型定義
let payments = null

// Square SDKを読み込む関数
async function loadSquareSDK() {
  if (window.Square) {
    return
  }
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://sandbox.web.squarecdn.com/v1/square.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Square SDK'))
    document.head.appendChild(script)
  })
}

// Square決済システムを初期化
export async function initializeSquare() {
  try {
    if (!payments) {
      await loadSquareSDK()
      
      // 環境変数をチェック
      let applicationId = import.meta.env.VITE_SQUARE_APPLICATION_ID
      
      // Application IDが設定されていない場合やフォーマットが正しくない場合は、テスト用のIDを使用
      if (!applicationId || !applicationId.startsWith('sandbox-sq0idb-')) {
        applicationId = 'sandbox-sq0idb-uF6_Dtbww6cjmxmDlprGNQ' // 郵便番号バリデーション問題に対応したテスト用ID
      }
      
      payments = await window.Square.payments(applicationId)
    }
    return payments
  } catch (error) {
    throw error
  }
}

// カード決済フォームを作成
export async function createCardPaymentForm(payments, zipCode = '') {
  try {
    const card = await payments.card({
      style: {
        input: {
          color: '#333',
          fontSize: '16px',
          fontFamily: 'Arial, sans-serif'
        },
        'input::placeholder': {
          color: '#999'
        },
        '.message-text': {
          color: '#dc3545'
        }
      }
      // postalCodeオプションを削除（無効な設定のため）
    })
    
    // カードフォームを #card-container にアタッチ
    await card.attach('#card-container')
    
    // フォームアタッチ後、郵便番号フィールドを完全に無効化する
    setTimeout(() => {
      disablePostalCodeFields(zipCode)
    }, 100)
    
    // 少し遅らせてもう一度確認・無効化
    setTimeout(() => {
      disablePostalCodeFields(zipCode)
      logFormInputs() // デバッグ用
    }, 500)
    
    // さらに遅らせて最終確認
    setTimeout(() => {
      disablePostalCodeFields(zipCode)
    }, 1000)
    
    // MutationObserverで動的に追加される要素を監視
    if (zipCode) {
      setupDynamicPostalCodeHandler(zipCode)
    }
    
    // フォームアタッチ後、郵便番号フィールドを完全に無効化する
    setTimeout(() => {
      disablePostalCodeFields(zipCode)
    }, 100)
    
    // 少し遅らせてもう一度確認・無効化
    setTimeout(() => {
      disablePostalCodeFields(zipCode)
      logFormInputs() // デバッグ用
    }, 500)
    
    // さらに遅らせて最終確認
    setTimeout(() => {
      disablePostalCodeFields(zipCode)
    }, 1000)
    
    return card
  } catch (error) {
    throw error
  }
}

// 郵便番号フィールドを無効化する専用関数
function disablePostalCodeFields(zipCode = '') {
  
  // より包括的な郵便番号フィールドの検索セレクタ
  const postalCodeSelectors = [
    // プレースホルダーベース
    '[placeholder*="postal" i]',
    '[placeholder*="zip" i]',
    '[placeholder*="郵便" i]',
    
    // name属性ベース
    'input[name*="postal" i]',
    'input[name*="zip" i]',
    'input[name*="郵便" i]',
    
    // id属性ベース
    'input[id*="postal" i]',
    'input[id*="zip" i]',
    'input[id*="郵便" i]',
    
    // class属性ベース
    '.sq-postal-code input',
    '.postal-code input',
    '.zip-code input',
    
    // data属性ベース
    '[data-testid="postal-code"] input',
    '[data-testid="zip-code"] input',
    
    // Square固有のセレクタ
    '.sq-form .sq-input-postal',
    '.sq-form input[type="text"]:last-child', // 最後のテキストフィールド（多くの場合郵便番号）
    
    // より一般的なセレクタ（Square特有のパターン）
    '#card-container input[type="text"]',
    '#card-container .sq-input'
  ]
  
  let foundFields = 0
  let allTextInputs = []
  
  // まず全てのテキスト入力フィールドを取得
  const cardContainer = document.getElementById('card-container')
  if (cardContainer) {
    allTextInputs = Array.from(cardContainer.querySelectorAll('input[type="text"]'))

  }
  
  // 特定のセレクタで郵便番号フィールドを検索
  postalCodeSelectors.forEach(selector => {
    try {
      const inputs = document.querySelectorAll(selector)
      inputs.forEach(input => {
        if (input && input.type !== 'hidden' && !input.disabled) {
          foundFields++
          // 郵便番号を設定してから無効化
          if (zipCode) {
            input.value = zipCode
          }
          
          // 完全無効化の処理
          input.disabled = true
          input.readOnly = true
          
          // フォーム送信から除外
          input.removeAttribute('name')
          input.removeAttribute('required')
          
          // 完全に非表示にする
          input.style.display = 'none !important'
          input.style.visibility = 'hidden !important'
          input.style.height = '0px !important'
          input.style.width = '0px !important'
          input.style.position = 'absolute !important'
          input.style.left = '-9999px !important'
          input.style.top = '-9999px !important'
          input.style.overflow = 'hidden !important'
          
          // 親要素も非表示にする
          if (input.parentElement) {
            const parent = input.parentElement
            
            // 親要素に他の入力フィールドがない場合のみ非表示
            const otherInputs = parent.querySelectorAll('input:not([disabled])')
            if (otherInputs.length <= 1) {
              parent.style.display = 'none !important'
            }
          }
        }
      })
    } catch (e) {
    }
  })
  
  // フォールバック戦略：最後のテキスト入力フィールドを郵便番号として処理
  if (foundFields === 0 && allTextInputs.length > 0) {
    
    const lastInput = allTextInputs[allTextInputs.length - 1]
    if (lastInput) {
      
      // 郵便番号を設定
      if (zipCode) {
        lastInput.value = zipCode
        
        // 値が正しく設定されたか確認
        setTimeout(() => {
        }, 100)
      }
      
      lastInput.disabled = true
      lastInput.style.display = 'none !important'
      foundFields++
    }
  }
  
  // さらなるフォールバック：全てのテキストフィールドの最後の2つを確認
  if (foundFields === 0 && allTextInputs.length >= 2) {
    
    // 最後から2番目と最後のフィールドを確認
    const candidates = allTextInputs.slice(-2)
    candidates.forEach((input, index) => {
      
      // maxLengthが5-10の範囲、またはpatternが郵便番号っぽい場合
      if ((input.maxLength >= 5 && input.maxLength <= 10) || 
          (input.pattern && input.pattern.includes('zip')) ||
          (input.placeholder && input.placeholder.toLowerCase().includes('zip'))) {
        
        if (zipCode) {
          input.value = zipCode
        }
        
        input.disabled = true
        input.style.display = 'none !important'
        foundFields++
      }
    })
  }
  
  return foundFields
}



// 動的に追加される郵便番号フィールドを監視・処理する
function setupDynamicPostalCodeHandler(zipCode) {
  
  const cardContainer = document.getElementById('card-container')
  if (!cardContainer) return
  
  // MutationObserverで新しい要素の追加を監視
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // 新しい入力フィールドが追加された場合
            const newInputs = node.querySelectorAll ? node.querySelectorAll('input[type="text"]') : 
                             (node.tagName === 'INPUT' && node.type === 'text') ? [node] : []
            
            newInputs.forEach((input) => {
              
              // 遅延して郵便番号処理を実行
              setTimeout(() => {
                // 全てのテキストフィールドの中で最後のものを確認
                const allTextInputs = Array.from(cardContainer.querySelectorAll('input[type="text"]'))
                const lastInput = allTextInputs[allTextInputs.length - 1]
                
                if (input === lastInput) {
                  input.value = zipCode
                  input.disabled = true
                  input.style.display = 'none'
                }
              }, 50)
            })
          }
        })
      }
    })
  })
  
  // カードコンテナの変更を監視開始
  observer.observe(cardContainer, {
    childList: true,
    subtree: true
  })
  
  // 5秒後に監視を停止（リソース節約）
  setTimeout(() => {
    observer.disconnect()
  }, 5000)
}

// 決済を処理（郵便番号バリデーション回避版）
export async function processPayment(card, amount, zipCode = '') {
  try {
    
    // トークン化前に郵便番号フィールドを再度確認・処理
    const processedFields = disablePostalCodeFields(zipCode)
    
    if (processedFields === 0) {
      
      // 最後の手段：すべてのテキストフィールドの最後を強制的に処理
      const allInputs = document.querySelectorAll('#card-container input[type="text"]')
      if (allInputs.length > 0) {
        const lastInput = allInputs[allInputs.length - 1]
        if (zipCode && lastInput) {
          lastInput.value = zipCode
          lastInput.disabled = true
          lastInput.style.display = 'none'
        }
      }
    }
    
    // 少し待機してからトークン化を実行
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const tokenResult = await card.tokenize()
    
    if (tokenResult.status === 'OK') {
      
      // テスト用の決済処理（常に成功）
      // 実際のサーバーAPIを呼び出す代わりに、成功レスポンスをシミュレート
      await new Promise(resolve => setTimeout(resolve, 1500)) // 1.5秒待機
      
      return {
        status: 'success',
        paymentId: 'test_payment_' + Date.now(),
        transactionId: 'txn_' + Math.random().toString(36).substring(2, 15),
        message: 'テスト決済が完了しました',
        cardLast4: tokenResult.details?.card?.last4 || '****',
        cardBrand: tokenResult.details?.card?.brand || 'TEST'
      }
    } else {
      const errorMessage = tokenResult.errors?.[0]?.message || 'カードトークン化に失敗しました'
      
      // 郵便番号関連のエラーを特別処理
      if (errorMessage.includes('Postal code') || errorMessage.includes('postal')) {
        throw new Error('カード情報を確認してください。（郵便番号は前画面で入力済みです）')
      }
      
      throw new Error(errorMessage)
    }
  } catch (error) {
    throw error
  }
}
