import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])
  const isLoading = ref(false)

  // ローカルストレージからカートデータを読み込み
  const loadCartFromStorage = () => {
    try {
      const stored = localStorage.getItem('shopping-cart')
      if (stored) {
        items.value = JSON.parse(stored)
      }
    } catch (error) {
      console.error('カートデータの読み込みに失敗しました:', error)
      items.value = []
    }
  }

  // ローカルストレージにカートデータを保存
  const saveCartToStorage = () => {
    try {
      localStorage.setItem('shopping-cart', JSON.stringify(items.value))
    } catch (error) {
      console.error('カートデータの保存に失敗しました:', error)
    }
  }

  // カートアイテム数の計算
  const itemCount = computed(() => {
    return items.value.reduce((total, item) => total + item.quantity, 0)
  })

  // カート合計金額の計算
  const totalAmount = computed(() => {
    return items.value.reduce((total, item) => total + (item.price * item.quantity), 0)
  })

  // カートにアイテムを追加
  const addToCart = async (product, quantity = 1) => {
    isLoading.value = true
    try {
      console.log('🛒 カート追加処理開始:', { product_id: product.id, product_name: product.name, quantity })
      
      // 在庫チェック
      const { data: currentProduct, error: fetchError } = await supabase
        .from('succulents')
        .select('quantity, is_reserved')
        .eq('id', product.id)
        .single()

      if (fetchError) {
        console.error('❌ 商品情報取得エラー:', fetchError)
        throw fetchError
      }
      
      console.log('📦 現在の商品情報:', {
        quantity: currentProduct.quantity,
        is_reserved: currentProduct.is_reserved
      })

      if (currentProduct.is_reserved) {
        throw new Error('この商品は取引中のため、カートに追加できません')
      }

      // 既存のカートアイテムをチェック
      const existingItemIndex = items.value.findIndex(item => item.id === product.id)
      
      if (existingItemIndex >= 0) {
        // 既に存在する場合は数量を増加
        const existingItem = items.value[existingItemIndex]
        const newQuantity = existingItem.quantity + quantity
        
        console.log('🔄 カート内に既存アイテムあり:', {
          existing_quantity: existingItem.quantity,
          add_quantity: quantity,
          new_quantity: newQuantity,
          stock: currentProduct.quantity
        })
        
        // カート内の既存数量も含めて在庫チェック
        if (newQuantity > currentProduct.quantity) {
          const availableToAdd = currentProduct.quantity - existingItem.quantity
          if (availableToAdd <= 0) {
            throw new Error(`この商品は既にカートに最大数(${existingItem.quantity}個)が入っています。在庫は${currentProduct.quantity}個です。`)
          } else {
            throw new Error(`カートに追加できるのはあと${availableToAdd}個までです。(現在のカート: ${existingItem.quantity}個、在庫: ${currentProduct.quantity}個)`)
          }
        }
        
        items.value[existingItemIndex].quantity = newQuantity
        items.value[existingItemIndex].maxQuantity = currentProduct.quantity
        console.log('✅ カート数量更新成功')
      } else {
        // 新しいアイテムを追加
        console.log('➕ 新規カート追加:', {
          quantity,
          stock: currentProduct.quantity
        })
        
        if (quantity > currentProduct.quantity) {
          throw new Error(`在庫不足です。最大${currentProduct.quantity}個まで選択できます`)
        }
        
        items.value.push({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: quantity,
          maxQuantity: currentProduct.quantity
        })
        console.log('✅ カート追加成功')
      }

      // カート追加時は在庫を減らさない（注文確定時に在庫チェック・減少を行う）

      saveCartToStorage()
      console.log('💾 カート保存完了')
      return { success: true, message: 'カートに追加しました' }
    } catch (error) {
      console.error('❌ カート追加エラー:', error)
      return { success: false, message: error.message }
    } finally {
      isLoading.value = false
    }
  }

  // カートからアイテムを削除
  const removeFromCart = async (productId) => {
    const itemIndex = items.value.findIndex(item => item.id === productId)
    if (itemIndex >= 0) {
      // カート追加時に在庫を減らしていないので、削除時も在庫を戻さない
      items.value.splice(itemIndex, 1)
      saveCartToStorage()
    }
  }

  // カートアイテムの数量を更新
  const updateQuantity = async (productId, newQuantity) => {
    const itemIndex = items.value.findIndex(item => item.id === productId)
    if (itemIndex >= 0) {
      if (newQuantity <= 0) {
        await removeFromCart(productId)
        return { success: true }
      }

      try {
        // 在庫チェック
        const { data: currentProduct, error: fetchError } = await supabase
          .from('succulents')
          .select('quantity, is_reserved')
          .eq('id', productId)
          .single()

        if (fetchError) throw fetchError

        if (currentProduct.is_reserved) {
          throw new Error('この商品は現在取引中です')
        }

        // 新しい数量が在庫数を超えていないか判定
        if (newQuantity > currentProduct.quantity) {
          throw new Error(`在庫不足です。最大${currentProduct.quantity}個まで選択できます`)
        }

        // カート内の数量変更時は在庫を調整しない（注文確定時に在庫チェックを行う）
        items.value[itemIndex].quantity = newQuantity
        items.value[itemIndex].maxQuantity = currentProduct.quantity
        saveCartToStorage()
        return { success: true }
      } catch (error) {
        console.error('数量更新エラー:', error)
        return { success: false, message: error.message }
      }
    }
    return { success: false, message: '商品が見つかりません' }
  }

  // カートを空にする
  const clearCart = async () => {
    // カート追加時に在庫を減らしていないので、クリア時も在庫を戻さない
    items.value = []
    saveCartToStorage()
  }

  // 初期化時にローカルストレージからデータを読み込み
  loadCartFromStorage()

  return {
    items,
    isLoading,
    itemCount,
    totalAmount,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    loadCartFromStorage,
    saveCartToStorage
  }
})
