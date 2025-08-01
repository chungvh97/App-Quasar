<template>
  <q-layout view="hHh LpR fFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn dense flat round icon="menu" @click="toggleLeftDrawer" />
        <q-toolbar-title>
          Trang Quản Trị
        </q-toolbar-title>
        <q-space />
        <div v-if="user" class="q-mr-md">
          Chào, {{ user.email }}
        </div>
        <q-btn flat label="Đăng xuất" @click="handleLogout" />
      </q-toolbar>
    </q-header>

    <q-drawer show-if-above v-model="leftDrawerOpen" side="left" bordered>
      <q-list>
        <q-item-label header>Menu Quản Trị</q-item-label>
        <q-item clickable v-ripple :to="'/admin/products'">
          <q-item-section avatar>
            <q-icon name="inventory_2" />
          </q-item-section>
          <q-item-section>
            Quản lý Sản phẩm
          </q-item-section>
        </q-item>
        <q-item clickable v-ripple :to="'/admin/orders'">
          <q-item-section avatar>
            <q-icon name="receipt_long" />
          </q-item-section>
          <q-item-section>
            Quản lý Đơn hàng
          </q-item-section>
        </q-item>
        <q-item clickable v-ripple :to="'/admin/reports/sales'">
          <q-item-section avatar>
            <q-icon name="bar_chart" />
          </q-item-section>
          <q-item-section>
            Báo cáo Doanh thu
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <q-page padding>
        <router-view />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router' // Hoặc import { navigateTo } from '#app'
import { QSpinnerFacebook, useQuasar } from 'quasar'

const supabase = useSupabase()
const { user } = useAuthUser() // Lấy user từ composable
const router = useRouter()
const $q = useQuasar()

const leftDrawerOpen = ref(false)

const toggleLeftDrawer = () => {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

const handleLogout = async () => {
  $q.loading.show({ // Hiển thị loading của Quasar
    message: 'Đang đăng xuất...'
  })
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    // user.value sẽ tự động cập nhật thành null nhờ onAuthStateChange trong useAuthUser
    $q.notify({
      color: 'positive',
      message: 'Đăng xuất thành công!',
      icon: 'check_circle'
    })
    await navigateTo('/login') // Chuyển hướng về trang đăng nhập
  } catch (error: any) {
    console.error('Logout error:', error.message)
    $q.notify({
      color: 'negative',
      message: error.message || 'Lỗi đăng xuất. Vui lòng thử lại.',
      icon: 'report_problem'
    })
  } finally {
    $q.loading.hide() // Ẩn loading
  }
}

// Nếu muốn theo dõi user để làm gì đó khi nó thay đổi trong layout này
// watch(user, (currentUser) => {
//   if (!currentUser) {
//     // Có thể người dùng bị đăng xuất từ một tab khác, hoặc session hết hạn
//     // navigateTo('/login') // Cân nhắc kỹ việc tự động điều hướng từ layout
//   }
// }, { immediate: true })
</script>

<style scoped>
/* CSS cho admin layout nếu cần */
</style>
