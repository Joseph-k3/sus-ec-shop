import { createRouter, createWebHistory } from 'vue-router'
import ProductList from '../components/ProductList.vue'
import PurchasePage from '../components/PurchasePage.vue'
import MyOrders from '../components/MyOrders.vue'
import AdminLayout from '../components/admin/AdminLayout.vue'
import AdminProductEdit from '../components/AdminProductEdit.vue'
import OrderManagement from '../components/admin/OrderManagement.vue'
import BankTransferForm from '../components/BankTransferForm.vue'
import SquarePaymentForm from '../components/SquarePaymentForm.vue'

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
    component: ProductList
  },
  {
    path: '/purchase/:id',
    name: 'purchase',
    component: PurchasePage,
    props: true // URLパラメータをpropsとして渡す
  },
  {
    path: '/bank-transfer',
    name: 'BankTransferForm',
    component: BankTransferForm,
    props: true
  },
  {
    path: '/square-payment',
    name: 'SquarePaymentForm',
    component: SquarePaymentForm,
    props: true
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
    component: MyOrders
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
