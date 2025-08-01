<template>
  <q-layout>
    <q-page-container>
      <q-page class="flex flex-center bg-grey-2">
        <q-card class="q-pa-md shadow-2 my-card" bordered style="width: 400px;">
          <q-card-section class="text-center">
            <div class="text-grey-9 text-h5 text-weight-bold">Đăng nhập</div>
            <div class="text-grey-8">Đăng nhập để vào trang quản trị</div>
          </q-card-section>

          <q-card-section>
            <q-form @submit.prevent="handleLogin" class="q-gutter-md">
              <q-input
                  v-model="email"
                  label="Email"
                  type="email"
                  lazy-rules
                  :rules="[val => (val && val.length > 0) || 'Vui lòng nhập email']"
                  outlined
              />
              <q-input
                  v-model="password"
                  label="Mật khẩu"
                  type="password"
                  lazy-rules
                  :rules="[val => (val && val.length > 0) || 'Vui lòng nhập mật khẩu']"
                  outlined
              />
              <q-btn
                  label="Đăng nhập"
                  type="submit"
                  color="primary"
                  class="full-width"
                  :loading="loading"
              />
            </q-form>
          </q-card-section>

          <q-card-section v-if="errorMessage" class="text-center">
            <q-banner inline-actions class="text-white bg-red" rounded>
              {{ errorMessage }}
            </q-banner>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router' // Hoặc import { navigateTo } from '#app' cho Nuxt 3
import { QSpinnerFacebook, useQuasar } from 'quasar' // Import useQuasar

// Khai báo definePageMeta để sử dụng layout trống (nếu cần) hoặc không dùng layout nào
definePageMeta({
  layout: false, // Không sử dụng layout default (nếu layout default có header/footer)
  // Hoặc bạn có thể tạo một layout 'auth' riêng
})

const supabase = useSupabase()
const router = useRouter() // Hoặc const nuxtApp = useNuxtApp(); const router = nuxtApp.$router;
const $q = useQuasar() // Sử dụng Quasar instance

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref<string | null>(null)

const handleLogin = async () => {
  loading.value = true
  errorMessage.value = null
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })

    if (error) {
      throw error
    }

    // Đăng nhập thành công
    // console.log('User logged in:', data.user)
    $q.notify({
      color: 'green-4',
      textColor: 'white',
      icon: 'cloud_done',
      message: 'Đăng nhập thành công!'
    })
    // Chuyển hướng đến trang quản trị, ví dụ /admin/products
    // Chúng ta sẽ tạo trang này sau
    await navigateTo('/admin/products') // Sử dụng navigateTo của Nuxt 3

  } catch (error: any) {
    console.error('Login error:', error.message)
    errorMessage.value = error.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.'
    $q.notify({
      color: 'red-5',
      textColor: 'white',
      icon: 'warning',
      message: errorMessage.value
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.my-card {
  border-radius: 10px;
}
</style>
