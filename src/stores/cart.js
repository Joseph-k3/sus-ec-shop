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
      // 在庫チェック
      const { data: currentProduct, error: fetchError } = await supabase
        .from('succulents')
        .select('quantity, is_reserved')
        .eq('id', product.id)
        .single()

      if (fetchError) throw fetchError

      if (currentProduct.is_reserved || currentProduct.quantity < quantity) {
        throw new Error('この商品は在庫不足または取引中のため、カートに追加できません')
      }

      // 既存のカートアイテムをチェック
      const existingItemIndex = items.value.findIndex(item => item.id === product.id)
      
      if (existingItemIndex >= 0) {
        // 既に存在する場合は数量を増加
        const existingItem = items.value[existingItemIndex]
        const newQuantity = existingItem.quantity + quantity
        
        if (newQuantity > currentProduct.quantity) {
          throw new Error(`在庫不足です。最大${currentProduct.quantity}個まで選択できます`)
        }
        
        items.value[existingItemIndex].quantity = newQuantity
      } else {
        // 新しいアイテムを追加
        items.value.push({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: quantity,
          maxQuantity: currentProduct.quantity
        })
      }

      // 一時的に在庫を減らす（他の人が同時に購入するのを防ぐ）
      await supabase
        .from('succulents')
        .update({ quantity: currentProduct.quantity - quantity })
        .eq('id', product.id)

      saveCartToStorage()
      return { success: true, message: 'カートに追加しました' }
    } catch (error) {
      console.error('カート追加エラー:', error)
      return { success: false, message: error.message }
    } finally {
      isLoading.value = false
    }
  }

  // カートからアイテムを削除
  const removeFromCart = async (productId) => {
    const itemIndex = items.value.findIndex(item => item.id === productId)
    if (itemIndex >= 0) {
      const item = items.value[itemIndex]
      
      try {
        // 在庫を戻す
        const { data: currentProduct, error: fetchError } = await supabase
          .from('succulents')
          .select('quantity')
          .eq('id', productId)
          .single()

        if (!fetchError) {
          await supabase
            .from('succulents')
            .update({ quantity: currentProduct.quantity + item.quantity })
            .eq('id', productId)
        }
      } catch (error) {
        console.error('在庫復元エラー:', error)
      }

      items.value.splice(itemIndex, 1)
      saveCartToStorage()
    }
  }

  // カートアイテムの数量を更新
  const updateQuantity = async (productId, newQuantity) => {
    const itemIndex = items.value.findIndex(item => item.id === productId)
    if (itemIndex >= 0) {
      const item = items.value[itemIndex]
      const oldQuantity = item.quantity
      const quantityDiff = newQuantity - oldQuantity

      if (newQuantity <= 0) {
        await removeFromCart(productId)
        return
      }

      try {
        // 在庫チェック
        const { data: currentProduct, error: fetchError } = await supabase
          .from('succulents')
          .select('quantity')
          .eq('id', productId)
          .single()

        if (fetchError) throw fetchError

        if (quantityDiff > 0 && currentProduct.quantity < quantityDiff) {
          throw new Error('在庫不足です')
        }

        // 在庫を調整
        await supabase
          .from('succulents')
          .update({ quantity: currentProduct.quantity - quantityDiff })
          .eq('id', productId)

        items.value[itemIndex].quantity = newQuantity
        saveCartToStorage()
        return { success: true }
      } catch (error) {
        console.error('数量更新エラー:', error)
        return { success: false, message: error.message }
      }
    }
  }

  // カートを空にする
  const clearCart = async () => {
    // 全ての在庫を戻す
    for (const item of items.value) {
      try {
        const { data: currentProduct, error: fetchError } = await supabase
          .from('succulents')
          .select('quantity')
          .eq('id', item.id)
          .single()

        if (!fetchError) {
          await supabase
            .from('succulents')
            .update({ quantity: currentProduct.quantity + item.quantity })
            .eq('id', item.id)
        }
      } catch (error) {
        console.error('在庫復元エラー:', error)
      }
    }

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
