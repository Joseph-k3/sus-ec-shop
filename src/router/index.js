import { createRouter, createWebHistory } from 'vue-router'
import ProductList from '../components/ProductList.vue'
import PurchasePage from '../components/PurchasePage.vue'
import MyOrders from '../components/MyOrders.vue'
import AdminLayout from '../components/admin/AdminLayout.vue'
import AdminProductEdit from '../components/AdminProductEdit.vue'
import OrderManagement from '../components/admin/OrderManagement.vue'
import BankTransferForm from '../components/BankTransferForm.vue'
import SquarePaymentForm from '../components/SquarePaymentForm.vue'
import SimpleLogin from '../components/SimpleLogin.vue'
import ShoppingCart from '../components/ShoppingCart.vue'
import CartCheckout from '../components/CartCheckout.vue'
import { useAuth } from '../composables/useAuth'

// サイト認証ガード
const siteAuthGuard = (to, from, next) => {
  // 認証状態を直接チェック
  const authFlag = localStorage.getItem('site-authenticated')
  const authTime = localStorage.getItem('site-auth-time')
  
  let isAuth = false
  if (authFlag === 'true' && authTime) {
    const loginTime = parseInt(authTime)
    const now = Date.now()
    const hoursPassed = (now - loginTime) / (1000 * 60 * 60)
    isAuth = hoursPassed < 24 // 24時間以内
  }
  
  if (isAuth) {
    next()
  } else {
    next('/login')
  }
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
    path: '/login',
    name: 'login',
    component: SimpleLogin
  },
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
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// グローバルナビゲーションガード
router.beforeEach((to, from, next) => {
  // ログインページへのアクセスは常に許可
  if (to.path === '/login') {
    next()
    return
  }
  
  // その他のルートは個別のガードで処理
  next()
})

export default router
