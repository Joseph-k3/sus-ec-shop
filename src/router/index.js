import { createRouter, createWebHistory } from 'vue-router'
import ProductList from '../components/ProductList.vue'
import PurchasePage from '../components/PurchasePage.vue'
import MyOrders from '../components/MyOrders.vue'
import AdminLayout from '../components/admin/AdminLayout.vue'
import AdminProductEdit from '../components/AdminProductEdit.vue'
import OrderManagement from '../components/admin/OrderManagement.vue'
import BankTransferForm from '../components/BankTransferForm.vue'
import SquarePaymentForm from '../components/SquarePaymentForm.vue'
import PaymentComplete from '../components/PaymentComplete.vue'
import FAQ from '../components/FAQ.vue'
import ComingSoon from '../components/ComingSoon.vue'

import ShoppingCart from '../components/ShoppingCart.vue'
import CartCheckout from '../components/CartCheckout.vue'
import { useAuth } from '../composables/useAuth'

// サイト認証ガード（現在は無効化 - Coming Soon画面で管理）
const siteAuthGuard = (to, from, next) => {
  // 認証処理は App.vue で管理されるため常に通す
  next()
}

// 管理者認証ガード
const adminAuthGuard = async (to, from, next) => {
  // ここに管理者認証のロジックを実装
  // 例: Supabaseのセッション確認やロール確認
  const isAdmin = true // 仮の実装。本番環境では適切な認証を行う
  if (isAdmin) {
    next()
  } else {
    next('/')
  }
}

const routes = [
  {
    path: '/',
    name: 'home',
    component: ProductList,
    beforeEnter: siteAuthGuard
  },
  {
    path: '/purchase/:id',
    name: 'purchase',
    component: PurchasePage,
    props: true, // URLパラメータをpropsとして渡す
    beforeEnter: siteAuthGuard
  },
  {
    path: '/bank-transfer',
    name: 'BankTransferForm',
    component: BankTransferForm,
    props: true,
    beforeEnter: siteAuthGuard
  },
  {
    path: '/square-payment',
    name: 'SquarePaymentForm',
    component: SquarePaymentForm,
    props: true,
    beforeEnter: siteAuthGuard
  },
  {
    path: '/admin',
    component: AdminLayout,
    beforeEnter: adminAuthGuard,
    children: [
      {
        path: '',
        redirect: '/admin/orders'
      },
      {
        path: 'orders',
        name: 'AdminOrders',
        component: OrderManagement
      },
      {
        path: 'products',
        name: 'AdminProductEdit',
        component: AdminProductEdit
      }
    ]
  },
  {
    path: '/my-orders',
    name: 'my-orders',
    component: MyOrders,
    beforeEnter: siteAuthGuard
  },
  {
    path: '/cart',
    name: 'cart',
    component: ShoppingCart,
    beforeEnter: siteAuthGuard
  },
  {
    path: '/cart-checkout',
    name: 'cart-checkout',
    component: CartCheckout,
    beforeEnter: siteAuthGuard
  },
  {
    path: '/payment-complete',
    name: 'payment-complete',
    component: PaymentComplete,
    beforeEnter: siteAuthGuard
  },
  {
    path: '/faq',
    name: 'faq',
    component: FAQ,
    beforeEnter: siteAuthGuard
  },
  {
    path: '/maintenance',
    name: 'maintenance',
    component: ComingSoon,
    props: route => ({
      // siteSettingsやmaintenanceModeはApp.vue等でfetchして渡すのが理想だが、
      // ここではprops:trueでクエリ等からも受け取れるようにしておく
      ...route.params
    })
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// グローバルナビゲーションガード
router.beforeEach((to, from, next) => {
  // 通常のルーティング処理
  next()
})

export default router
