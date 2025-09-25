import { supabase } from './supabase'

export async function sendBankTransferEmail(order) {
  // 購入者向けメール
  const customerEmailData = {
    to: order.email,
    subject: '【SUS Plants EC Shop】ご注文ありがとうございます',
    html_body: `
      <h2>ご注文ありがとうございます</h2>
      <p>${order.customer_name} 様</p>
      
      <h3>ご注文内容</h3>
      <p>注文番号: ${order.order_number}</p>
      <p>商品名: ${order.product_name}</p>
      <div style="margin: 1rem 0; padding: 1rem; background-color: #f8f9fa; border-radius: 4px;">
        <p>商品代金: ¥${(order.item_price || order.price).toLocaleString()}</p>
        <p>送料 (${order.shipping_region || '配送地域'}): ¥${(order.shipping_fee || 1000).toLocaleString()}</p>
        <p style="font-weight: bold; font-size: 1.1em; color: #007bff; border-top: 1px solid #dee2e6; padding-top: 0.5rem; margin-top: 0.5rem;">合計金額: ¥${order.price.toLocaleString()}</p>
      </div>
      
      <div style="background-color: #fff3cd; padding: 1rem; margin: 1rem 0; border-radius: 4px; border: 1px solid #ffeeba;">
        <p style="color: #856404; margin: 0;">
          <strong>お支払い期限: ${new Date(order.payment_due_date).toLocaleString('ja-JP')}</strong><br>
          ※期限を過ぎますと、ご注文は自動的にキャンセルとなります。
        </p>
      </div>
      
      <h3>お振込先情報</h3>
      <p>以下の口座へお振込をお願いいたします。</p>
      <div style="background-color: #f8f9fa; padding: 1rem; margin: 1rem 0; border-radius: 4px;">
        <p>銀行名: 西日本シティ銀行</p>
        <p>支店名: 糸島支店</p>
        <p>口座種類: 普通</p>
        <p>口座番号: 1756034</p>
        <p>口座名義: 納富亮典（ノウドミリョウスケ）</p>
      </div>
      
      <p>お振込確認後、商品を発送させていただきます。</p>
      <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
      
      <hr>
      <p>SUS Plants EC Shop</p>
      <p>Instagram: <a href="https://www.instagram.com/ryo_suke_071210/">@ryo_suke_071210</a></p>
    `
  }

  // 管理者向けメール
  const adminEmailData = {
    to: 'k3.ns.208_b50@icloud.com', // 管理者のメールアドレス
    subject: `【新規注文】${order.product_name}が購入されました`,
    html_body: `
      <h2>新規注文がありました</h2>
      
      <h3>注文情報</h3>
      <div style="background-color: #e8f5e9; padding: 1rem; margin: 1rem 0; border-radius: 4px; border: 1px solid #c8e6c9;">
        <p>注文番号: ${order.order_number}</p>
        <p>支払い期限: ${new Date(order.payment_due_date).toLocaleString('ja-JP')}</p>
      </div>
      
      <h3>商品情報</h3>
      <div style="margin-bottom: 2rem;">
        <p>商品ID: ${order.product_id}</p>
        <p>商品名: ${order.product_name}</p>
        <div style="margin: 1rem 0; padding: 1rem; background-color: #f8f9fa; border-radius: 4px;">
          <p>商品代金: ¥${(order.item_price || order.price).toLocaleString()}</p>
          <p>送料 (${order.shipping_region || '配送地域'}): ¥${(order.shipping_fee || 1000).toLocaleString()}</p>
          <p style="font-weight: bold; font-size: 1.1em; color: #007bff;">合計金額: ¥${order.price.toLocaleString()}</p>
        </div>
        <div style="margin: 1rem 0;">
          <img src="${order.product_image}" alt="${order.product_name}" style="max-width: 300px; height: auto;">
        </div>
      </div>

      <h3>購入者情報</h3>
      <div style="background-color: #f8f9fa; padding: 1rem; margin: 1rem 0; border-radius: 4px;">
        <p>お名前: ${order.customer_name}</p>
        <p>メール: ${order.email}</p>
        <p>電話番号: ${order.phone}</p>
        <p>郵便番号: ${order.zip_code || '未入力'}</p>
        <p>住所: ${order.address}</p>
      </div>

      <p style="margin-top: 2rem; color: #666;">
        このメールは自動送信されています。<br>
        銀行振込の入金を確認次第、商品の発送をお願いしやす。
      </p>
    `
  }

  let customerEmailResult = null
  let adminEmailResult = null
  
  try {
    // 購入者向けメール送信
    try {
      const { data, error: customerError } = await supabase.functions.invoke('send-email', {
        body: customerEmailData
      })

      if (customerError) {
        // 購入者向けメール送信は失敗しても処理を続行
      } else {
        customerEmailResult = data
      }
    } catch (customerEmailError) {
      // 購入者向けメール送信は失敗しても処理を続行
    }

    // 管理者向けメール送信
    const { data, error: adminError } = await supabase.functions.invoke('send-email', {
      body: adminEmailData
    })

    if (adminError) {
      throw new Error(adminError.message || '管理者向けメール送信に失敗しました')
    }

    adminEmailResult = data

    return {
      customerEmail: customerEmailResult,
      adminEmail: adminEmailResult
    }
  } catch (error) {
    throw new Error(error.message || 'メール送信に失敗しました')
  }
}

// 入金確認通知メール送信
export async function sendPaymentConfirmationEmail(order) {
  // 購入者向け確認メール
  const customerEmailData = {
    to: order.email,
    subject: '【SUS Plants EC Shop】ご入金確認のお知らせ',
    html_body: `
      <h2>ご入金を確認いたしました</h2>
      <p>${order.customer_name} 様</p>
      
      <h3>ご注文内容</h3>
      <p>注文番号: ${order.order_number}</p>
      <p>商品名: ${order.product_name}</p>
      <div style="margin: 1rem 0; padding: 1rem; background-color: #f8f9fa; border-radius: 4px;">
        <p>商品代金: ¥${(order.item_price || order.price).toLocaleString()}</p>
        <p>送料 (${order.shipping_region || '配送地域'}): ¥${(order.shipping_fee || 1000).toLocaleString()}</p>
        <p style="font-weight: bold; font-size: 1.1em; color: #007bff; border-top: 1px solid #dee2e6; padding-top: 0.5rem; margin-top: 0.5rem;">合計金額: ¥${order.price.toLocaleString()}</p>
      </div>
      
      <div style="background-color: #e8f5e9; padding: 1rem; margin: 1rem 0; border-radius: 4px; border: 1px solid #c8e6c9;">
        <p style="color: #2e7d32; margin: 0;">
          <strong>ご入金の確認が完了いたしました。</strong><br>
          商品の発送準備を進めさせていただきます。
        </p>
      </div>
      
      <p>発送完了時に、追跡番号をメールでお知らせいたします。</p>
      <p>商品到着までしばらくお待ちください。</p>
      
      <hr>
      <p>SUS Plants EC Shop</p>
      <p>Instagram: <a href="https://www.instagram.com/ryo_suke_071210/">@ryo_suke_071210</a></p>
    `
  }

  // 管理者向け通知メール
  const adminEmailData = {
    to: 'k3.ns.208_b50@icloud.com',
    subject: `【入金確認】${order.product_name}の入金を確認しました`,
    html_body: `
      <h2>入金が確認されました</h2>
      
      <h3>注文情報</h3>
      <div style="background-color: #e8f5e9; padding: 1rem; margin: 1rem 0; border-radius: 4px; border: 1px solid #c8e6c9;">
        <p>注文番号: ${order.order_number}</p>
        <p>入金確認日時: ${new Date().toLocaleString('ja-JP')}</p>
      </div>
      
      <h3>商品情報</h3>
      <div style="margin-bottom: 2rem;">
        <p>商品ID: ${order.product_id}</p>
        <p>商品名: ${order.product_name}</p>
        <div style="margin: 1rem 0; padding: 1rem; background-color: #f8f9fa; border-radius: 4px;">
          <p>商品代金: ¥${(order.item_price || order.price).toLocaleString()}</p>
          <p>送料 (${order.shipping_region || '配送地域'}): ¥${(order.shipping_fee || 1000).toLocaleString()}</p>
          <p style="font-weight: bold; font-size: 1.1em; color: #007bff;">合計金額: ¥${order.price.toLocaleString()}</p>
        </div>
        <div style="margin: 1rem 0;">
          <img src="${order.product_image}" alt="${order.product_name}" style="max-width: 300px; height: auto;">
        </div>
      </div>

      <h3>購入者情報</h3>
      <div style="background-color: #f8f9fa; padding: 1rem; margin: 1rem 0; border-radius: 4px;">
        <p>お名前: ${order.customer_name}</p>
        <p>メール: ${order.email}</p>
        <p>電話番号: ${order.phone}</p>
        <p>郵便番号: ${order.zip_code || '未入力'}</p>
        <p>住所: ${order.address}</p>
      </div>

      <p style="margin-top: 2rem;">
        商品の発送準備をお願いいたします。
      </p>
    `
  }

  try {
    // 購入者向けメール送信
    const { data: customerEmailResult, error: customerError } = await supabase.functions.invoke('send-email', {
      body: customerEmailData
    })

    if (customerError) throw new Error(customerError.message)

    // 管理者向けメール送信
    const { data: adminEmailResult, error: adminError } = await supabase.functions.invoke('send-email', {
      body: adminEmailData
    })

    if (adminError) throw new Error(adminError.message)

    return { customerEmailResult, adminEmailResult }
  } catch (error) {
    throw error
  }
}

// カート注文用のメール送信関数
export async function sendCartOrderEmail(orderData) {

  // 購入者向けメール
  const customerEmailData = {
    to: orderData.email,
    subject: '【SUS Plants EC Shop】ご注文ありがとうございます',
    html_body: `
      <h2>ご注文ありがとうございます</h2>
      <p>${orderData.customerName} 様</p>
      
      <h3>ご注文内容</h3>
      ${orderData.items.map(item => `
        <div style="border-bottom: 1px solid #eee; padding: 1rem 0;">
          <p>商品名: ${item.name}</p>
          <p>数量: ${item.quantity}個</p>
          <p>単価: ¥${item.price.toLocaleString()}</p>
          <p>小計: ¥${(item.price * item.quantity).toLocaleString()}</p>
        </div>
      `).join('')}
      
      <div style="margin-top: 1rem; padding: 1rem; background-color: #f8f9fa; border-radius: 4px;">
        <p>商品小計: ¥${(orderData.itemTotal || orderData.totalAmount).toLocaleString()}</p>
        <p>送料 (${orderData.shippingRegion || '配送地域'}): ¥${(orderData.shippingFee || 1000).toLocaleString()}</p>
        <p style="font-size: 1.2rem; font-weight: bold; margin: 0; border-top: 1px solid #dee2e6; padding-top: 0.5rem; margin-top: 0.5rem; color: #007bff;">
          合計金額: ¥${orderData.totalAmount.toLocaleString()}
        </p>
      </div>
      
      <div style="background-color: #fff3cd; padding: 1rem; margin: 1rem 0; border-radius: 4px; border: 1px solid #ffeeba;">
        <p style="color: #856404; margin: 0;">
          <strong>お支払い期限: 注文から48時間以内</strong><br>
          ※期限を過ぎますと、ご注文は自動的にキャンセルとなります。
        </p>
      </div>
      
      <h3>お振込先情報</h3>
      <p>以下の口座へお振込をお願いいたします。</p>
      <div style="background-color: #f8f9fa; padding: 1rem; margin: 1rem 0; border-radius: 4px;">
        <p>銀行名: 西日本シティ銀行</p>
        <p>支店名: 糸島支店</p>
        <p>口座種類: 普通</p>
        <p>口座番号: 1756034</p>
        <p>口座名義: 納富亮典（ノウドミリョウスケ）</p>
      </div>
      
      <h3>お客様情報</h3>
      <p>お名前: ${orderData.customerName}</p>
      <p>電話番号: ${orderData.phone}</p>
      <p>郵便番号: ${orderData.postal}</p>
      <p>住所: ${orderData.address}</p>
      ${orderData.notes ? `<p>備考: ${orderData.notes}</p>` : ''}
      
      <p>お振込確認後、商品を発送させていただきます。</p>
      <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
      
      <hr>
      <p>SUS Plants EC Shop</p>
      <p>Instagram: <a href="https://www.instagram.com/ryo_suke_071210/">@ryo_suke_071210</a></p>
    `
  }

  // 管理者向けメール
  const adminEmailData = {
    to: 'k3.ns.208_b50@icloud.com', // 管理者のメールアドレス
    subject: `【カート注文】新規注文が${orderData.items.length}件ありました`,
    html_body: `
      <h2>カート注文がありました</h2>
      
      <h3>お客様情報</h3>
      <div style="background-color: #f8f9fa; padding: 1rem; margin: 1rem 0; border-radius: 4px;">
        <p>お名前: ${orderData.customerName}</p>
        <p>メール: ${orderData.email}</p>
        <p>電話番号: ${orderData.phone}</p>
        <p>郵便番号: ${orderData.postal}</p>
        <p>住所: ${orderData.address}</p>
        ${orderData.notes ? `<p>備考: ${orderData.notes}</p>` : ''}
      </div>
      
      <h3>注文内容</h3>
      ${orderData.items.map(item => `
        <div style="border: 1px solid #dee2e6; border-radius: 4px; padding: 1rem; margin: 1rem 0;">
          <p><strong>商品名:</strong> ${item.name}</p>
          <p><strong>数量:</strong> ${item.quantity}個</p>
          <p><strong>単価:</strong> ¥${item.price.toLocaleString()}</p>
          <p><strong>小計:</strong> ¥${(item.price * item.quantity).toLocaleString()}</p>
        </div>
      `).join('')}
      
      <div style="background-color: #d4edda; padding: 1rem; margin: 1rem 0; border-radius: 4px; border: 1px solid #c3e6cb;">
        <p style="color: #155724;">商品小計: ¥${(orderData.itemTotal || orderData.totalAmount).toLocaleString()}</p>
        <p style="color: #155724;">送料 (${orderData.shippingRegion || '配送地域'}): ¥${(orderData.shippingFee || 1000).toLocaleString()}</p>
        <p style="color: #155724; font-size: 1.2rem; font-weight: bold; margin: 0; border-top: 1px solid #c3e6cb; padding-top: 0.5rem; margin-top: 0.5rem;">
          <strong>合計金額: ¥${orderData.totalAmount.toLocaleString()}</strong>
        </p>
      </div>

      <p style="margin-top: 2rem;">
        商品の発送準備をお願いいたします。
      </p>
    `
  }

  let customerEmailResult = null
  let adminEmailResult = null
  
  try {
    // 購入者向けメール送信
    try {
      const { data, error: customerError } = await supabase.functions.invoke('send-email', {
        body: customerEmailData
      })

      if (customerError) {
        // 購入者向けメール送信は失敗しても処理を続行
      } else {
        customerEmailResult = data
      }
    } catch (customerEmailError) {
      // 購入者向けメール送信は失敗しても処理を続行
    }

    // 管理者向けメール送信
    const { data, error: adminError } = await supabase.functions.invoke('send-email', {
      body: adminEmailData
    })

    if (adminError) {
      throw new Error(adminError.message || 'カート注文管理者向けメール送信に失敗しました')
    }

    adminEmailResult = data

    return { customerEmailResult, adminEmailResult }
  } catch (error) {
    throw error
  }
}

// 追跡番号通知メール送信（単品注文用）
export async function sendTrackingNumberEmail(order, trackingNumber, carrier) {
  
  try {
    const carrierNames = {
      'yamato': 'ヤマト運輸',
      'sagawa': '佐川急便',
      'post': '日本郵便',
      'other': 'その他'
    }
    
    const carrierUrls = {
      'yamato': `https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=${trackingNumber}`,
      'sagawa': `https://k2k.sagawa-exp.co.jp/p/sagawa/web/okurijoinput.jsp?okurijoNo=${trackingNumber}`,
      'post': `https://trackings.post.japanpost.jp/services/srv/search/?requestNo1=${trackingNumber}`,
      'other': null
    }
    
    const trackingUrl = carrierUrls[carrier]
    
    const emailData = {
      to: order.email,
      subject: '【SUS Plants EC Shop】商品を発送いたしました',
      html_body: `
        <h2>商品を発送いたしました</h2>
        <p>${order.customer_name} 様</p>
        
        <p>この度はご注文いただきありがとうございました。<br>
        ご注文の商品を発送いたしましたのでお知らせいたします。</p>
        
        <h3>発送内容</h3>
        <div style="background-color: #f8f9fa; padding: 1rem; margin: 1rem 0; border-radius: 4px;">
          <p><strong>注文番号:</strong> ${order.order_number}</p>
          <p><strong>商品名:</strong> ${order.product_name}</p>
          <p><strong>金額:</strong> ¥${order.price.toLocaleString()}</p>
          <p><strong>配送先:</strong> ${order.address}</p>
        </div>
        
        <h3>配送情報</h3>
        <div style="background-color: #e7f3ff; padding: 1rem; margin: 1rem 0; border-radius: 4px; border: 1px solid #bee5eb;">
          <p><strong>配送業者:</strong> ${carrierNames[carrier] || 'その他'}</p>
          <p><strong>追跡番号:</strong> <span style="font-family: monospace; font-size: 1.1em; font-weight: bold; color: #007bff;">${trackingNumber}</span></p>
          ${trackingUrl ? `<p><strong>配送状況の確認:</strong> <a href="${trackingUrl}" target="_blank" style="color: #007bff;">こちらをクリック</a></p>` : ''}
        </div>
        
        <p>商品の到着まで今しばらくお待ちください。<br>
        ご不明な点がございましたら、お気軽にお問い合わせください。</p>
        
        <hr>
        <p>SUS Plants EC Shop</p>
        <p>Instagram: <a href="https://www.instagram.com/ryo_suke_071210/">@ryo_suke_071210</a></p>
      `
    }

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: emailData
    })

    if (error) throw new Error(error.message)
    
    return data
  } catch (error) {
    throw error
  }
}

// 追跡番号通知メール送信（カート注文用）
export async function sendCartTrackingNumberEmail(orders, trackingNumber, carrier) {
  
  try {
    const carrierNames = {
      'yamato': 'ヤマト運輸',
      'sagawa': '佐川急便', 
      'post': '日本郵便',
      'other': 'その他'
    }
    
    const carrierUrls = {
      'yamato': `https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=${trackingNumber}`,
      'sagawa': `https://k2k.sagawa-exp.co.jp/p/sagawa/web/okurijoinput.jsp?okurijoNo=${trackingNumber}`,
      'post': `https://trackings.post.japanpost.jp/services/srv/search/?requestNo1=${trackingNumber}`,
      'other': null
    }
    
    const trackingUrl = carrierUrls[carrier]
    const firstOrder = orders[0]
    const totalAmount = orders.reduce((sum, order) => sum + (order.price * order.quantity), 0)
    
    // 商品リストのHTML生成
    const itemsHtml = orders.map(order => `
      <div style="border-bottom: 1px solid #eee; padding: 0.5rem 0;">
        <span style="font-weight: bold;">${order.product_name}</span><br>
        <span style="color: #666; font-size: 0.9em;">¥${order.price.toLocaleString()} × ${order.quantity}個</span>
      </div>
    `).join('')
    
    const emailData = {
      to: firstOrder.email,
      subject: '【SUS Plants EC Shop】ご注文の商品を発送いたしました',
      html_body: `
        <h2>ご注文の商品を発送いたしました</h2>
        <p>${firstOrder.customer_name} 様</p>
        
        <p>この度はカートからのご注文をいただき、ありがとうございました。<br>
        ご注文の全商品を発送いたしましたのでお知らせいたします。</p>
        
        <h3>発送内容</h3>
        <div style="background-color: #f8f9fa; padding: 1rem; margin: 1rem 0; border-radius: 4px;">
          <p><strong>注文商品:</strong> ${orders.length}商品</p>
          ${itemsHtml}
          <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #007bff;">
            <p style="font-size: 1.1em;"><strong>合計金額:</strong> ¥${totalAmount.toLocaleString()}</p>
          </div>
          <p style="margin-top: 1rem;"><strong>配送先:</strong> ${firstOrder.address}</p>
        </div>
        
        <h3>配送情報</h3>
        <div style="background-color: #e7f3ff; padding: 1rem; margin: 1rem 0; border-radius: 4px; border: 1px solid #bee5eb;">
          <p><strong>配送業者:</strong> ${carrierNames[carrier] || 'その他'}</p>
          <p><strong>追跡番号:</strong> <span style="font-family: monospace; font-size: 1.1em; font-weight: bold; color: #007bff;">${trackingNumber}</span></p>
          ${trackingUrl ? `<p><strong>配送状況の確認:</strong> <a href="${trackingUrl}" target="_blank" style="color: #007bff;">こちらをクリック</a></p>` : ''}
        </div>
        
        <p>商品の到着まで今しばらくお待ちください。<br>
        ご不明な点がございましたら、お気軽にお問い合わせください。</p>
        
        <hr>
        <p>SUS Plants EC Shop</p>
        <p>Instagram: <a href="https://www.instagram.com/ryo_suke_071210/">@ryo_suke_071210</a></p>
      `
    }

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: emailData
    })

    if (error) throw new Error(error.message)
    
    return data
  } catch (error) {
    throw error
  }
}
