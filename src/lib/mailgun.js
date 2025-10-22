import { supabase } from './supabase'

/**
 * Mailgunを使用してメールを送信
 * Supabase Edge Functionを経由してMailgun APIを呼び出す
 */
async function sendMailgunEmail(emailData) {
  try {
    const { data, error } = await supabase.functions.invoke('send-email-mailgun', {
      body: emailData
    })

    if (error) {
      throw new Error(error.message || 'メール送信に失敗しました')
    }

    return data
  } catch (error) {
    console.error('Mailgun email error:', error)
    throw error
  }
}

/**
 * 銀行振込注文の確認メールを送信
 * @param {Object} order - 注文情報
 */
export async function sendBankTransferEmail(order) {
  // 購入者向けメール
  const customerEmailData = {
    to: order.email,
    subject: '【SUS Plants EC Shop】ご注文ありがとうございます',
    html: `
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
    to: 'ryosk8er1026@yahoo.co.jp',
    subject: `【新規注文】${order.product_name}が購入されました`,
    html: `
      <h2>新規注文がありました</h2>
      
      <h3>注文情報</h3>
      <p>注文番号: ${order.order_number}</p>
      <p>注文日時: ${new Date(order.created_at).toLocaleString('ja-JP')}</p>
      <p>支払い期限: ${new Date(order.payment_due_date).toLocaleString('ja-JP')}</p>
      
      <h3>商品情報</h3>
      <p>商品名: ${order.product_name}</p>
      <div style="margin: 1rem 0; padding: 1rem; background-color: #f8f9fa; border-radius: 4px;">
        <p>商品代金: ¥${(order.item_price || order.price).toLocaleString()}</p>
        <p>送料 (${order.shipping_region || '配送地域'}): ¥${(order.shipping_fee || 1000).toLocaleString()}</p>
        <p style="font-weight: bold; font-size: 1.1em; color: #007bff; border-top: 1px solid #dee2e6; padding-top: 0.5rem; margin-top: 0.5rem;">合計金額: ¥${order.price.toLocaleString()}</p>
      </div>
      
      <h3>お客様情報</h3>
      <p>お名前: ${order.customer_name}</p>
      <p>メールアドレス: ${order.email}</p>
      <p>郵便番号: ${order.postal_code}</p>
      <p>住所: ${order.address}</p>
      <p>電話番号: ${order.phone}</p>
      
      <hr>
      <p>管理画面でステータスを確認してください。</p>
    `
  }

  let customerEmailResult = null
  let adminEmailResult = null

  try {
    // 購入者向けメール送信（失敗しても続行）
    try {
      customerEmailResult = await sendMailgunEmail(customerEmailData)
    } catch (customerEmailError) {
      console.error('Customer email failed:', customerEmailError)
      // 購入者向けメール送信は失敗しても処理を続行
    }

    // 管理者向けメール送信
    adminEmailResult = await sendMailgunEmail(adminEmailData)

    return {
      customerEmail: customerEmailResult,
      adminEmail: adminEmailResult
    }
  } catch (error) {
    throw new Error(error.message || 'メール送信に失敗しました')
  }
}

/**
 * 入金確認通知メールを送信
 * @param {Object} order - 注文情報
 */
export async function sendPaymentConfirmationEmail(order) {
  const customerEmailData = {
    to: order.email,
    subject: '【SUS Plants EC Shop】ご入金確認のお知らせ',
    html: `
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
          商品の準備が整い次第、発送させていただきます。
        </p>
      </div>
      
      <p>発送準備が完了しましたら、改めてご連絡させていただきます。</p>
      <p>今しばらくお待ちくださいませ。</p>
      
      <hr>
      <p>SUS Plants EC Shop</p>
      <p>Instagram: <a href="https://www.instagram.com/ryo_suke_071210/">@ryo_suke_071210</a></p>
    `
  }

  const adminEmailData = {
    to: 'ryosk8er1026@yahoo.co.jp',
    subject: `【入金確認】${order.order_number} - ${order.product_name}`,
    html: `
      <h2>入金確認通知</h2>
      
      <h3>注文情報</h3>
      <p>注文番号: ${order.order_number}</p>
      <p>商品名: ${order.product_name}</p>
      <p>合計金額: ¥${order.price.toLocaleString()}</p>
      
      <h3>お客様情報</h3>
      <p>お名前: ${order.customer_name}</p>
      <p>メールアドレス: ${order.email}</p>
      <p>住所: ${order.address}</p>
      
      <div style="background-color: #e8f5e9; padding: 1rem; margin: 1rem 0; border-radius: 4px;">
        <p style="color: #2e7d32; margin: 0;">
          <strong>入金確認済み</strong><br>
          発送準備を開始してください。
        </p>
      </div>
      
      <hr>
      <p>管理画面: <a href="${window.location.origin}/admin/orders">注文管理</a></p>
    `
  }

  let customerEmailResult = null
  let adminEmailResult = null

  try {
    // 購入者向けメール送信
    try {
      customerEmailResult = await sendMailgunEmail(customerEmailData)
    } catch (customerEmailError) {
      console.error('Customer email failed:', customerEmailError)
    }

    // 管理者向けメール送信
    adminEmailResult = await sendMailgunEmail(adminEmailData)

    return {
      customerEmail: customerEmailResult,
      adminEmail: adminEmailResult
    }
  } catch (error) {
    throw new Error(error.message || 'メール送信に失敗しました')
  }
}

/**
 * 発送完了通知メールを送信
 * @param {Object} order - 注文情報
 */
export async function sendShippingNotificationEmail(order) {
  const customerEmailData = {
    to: order.email,
    subject: '【SUS Plants EC Shop】商品を発送いたしました',
    html: `
      <h2>商品を発送いたしました</h2>
      <p>${order.customer_name} 様</p>
      
      <h3>ご注文内容</h3>
      <p>注文番号: ${order.order_number}</p>
      <p>商品名: ${order.product_name}</p>
      
      <div style="background-color: #e3f2fd; padding: 1rem; margin: 1rem 0; border-radius: 4px; border: 1px solid #bbdefb;">
        <p style="color: #1976d2; margin: 0;">
          <strong>商品を発送いたしました。</strong><br>
          お届けまでしばらくお待ちください。
        </p>
      </div>
      
      ${order.tracking_number ? `
      <h3>配送情報</h3>
      <p>お問い合わせ番号: ${order.tracking_number}</p>
      ` : ''}
      
      <p>商品到着後、ご不明な点やお気づきの点がございましたら、お気軽にお問い合わせください。</p>
      
      <hr>
      <p>SUS Plants EC Shop</p>
      <p>Instagram: <a href="https://www.instagram.com/ryo_suke_071210/">@ryo_suke_071210</a></p>
    `
  }

  try {
    return await sendMailgunEmail(customerEmailData)
  } catch (error) {
    throw new Error(error.message || 'メール送信に失敗しました')
  }
}

/**
 * お問い合わせ受付メールを送信
 * @param {Object} contactData - お問い合わせ情報
 */
export async function sendContactEmail(contactData) {
  // お問い合わせ者向け自動返信メール
  const customerEmailData = {
    to: contactData.email,
    subject: '【SUS Plants EC Shop】お問い合わせを受け付けました',
    html: `
      <h2>お問い合わせありがとうございます</h2>
      <p>${contactData.name} 様</p>
      
      <p>以下の内容でお問い合わせを受け付けました。</p>
      
      <div style="background-color: #f8f9fa; padding: 1rem; margin: 1rem 0; border-radius: 4px;">
        <p><strong>お問い合わせ内容:</strong></p>
        <p>${contactData.message.replace(/\n/g, '<br>')}</p>
      </div>
      
      <p>内容を確認の上、折り返しご連絡させていただきます。</p>
      <p>今しばらくお待ちくださいませ。</p>
      
      <hr>
      <p>SUS Plants EC Shop</p>
      <p>Instagram: <a href="https://www.instagram.com/ryo_suke_071210/">@ryo_suke_071210</a></p>
    `
  }

  // 管理者向け通知メール
  const adminEmailData = {
    to: 'ryosk8er1026@yahoo.co.jp',
    subject: `【お問い合わせ】${contactData.name}様より`,
    html: `
      <h2>新しいお問い合わせがあります</h2>
      
      <h3>お客様情報</h3>
      <p>お名前: ${contactData.name}</p>
      <p>メールアドレス: ${contactData.email}</p>
      ${contactData.phone ? `<p>電話番号: ${contactData.phone}</p>` : ''}
      
      <h3>お問い合わせ内容</h3>
      <div style="background-color: #f8f9fa; padding: 1rem; margin: 1rem 0; border-radius: 4px;">
        <p>${contactData.message.replace(/\n/g, '<br>')}</p>
      </div>
      
      <hr>
      <p>お客様へ返信してください。</p>
    `
  }

  let customerEmailResult = null
  let adminEmailResult = null

  try {
    // お問い合わせ者向けメール送信
    try {
      customerEmailResult = await sendMailgunEmail(customerEmailData)
    } catch (customerEmailError) {
      console.error('Customer email failed:', customerEmailError)
    }

    // 管理者向けメール送信
    adminEmailResult = await sendMailgunEmail(adminEmailData)

    return {
      customerEmail: customerEmailResult,
      adminEmail: adminEmailResult
    }
  } catch (error) {
    throw new Error(error.message || 'メール送信に失敗しました')
  }
}

/**
 * カート注文の確認メールを送信
 * @param {Object} orderData - カート注文情報
 */
export async function sendCartOrderEmail(orderData) {
  // 購入者向けメール
  const customerEmailData = {
    to: orderData.email,
    subject: '【SUS Plants EC Shop】ご注文ありがとうございます',
    html: `
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
    to: 'ryosk8er1026@yahoo.co.jp',
    subject: `【カート注文】新規注文が${orderData.items.length}件ありました`,
    html: `
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
      customerEmailResult = await sendMailgunEmail(customerEmailData)
    } catch (customerEmailError) {
      console.error('Customer email failed:', customerEmailError)
    }

    // 管理者向けメール送信
    adminEmailResult = await sendMailgunEmail(adminEmailData)

    return {
      customerEmail: customerEmailResult,
      adminEmail: adminEmailResult
    }
  } catch (error) {
    throw new Error(error.message || 'メール送信に失敗しました')
  }
}
