<template>
  <div>
    </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { navigateTo } from '#app'; // navigateTo được auto-import trong Nuxt 3

// Không cần definePageMeta cho layout ở đây nếu bạn muốn trang này không có layout
// hoặc nếu bạn muốn nó dùng layout mặc định và sau đó chuyển hướng.
// Nếu bạn muốn nó hoàn toàn trống trước khi chuyển hướng:
definePageMeta({
  layout: false, // Hoặc tên một layout trống nếu bạn có
});

onMounted(async () => {
  // console.log('Trang index.vue được mounted, đang chuyển hướng đến /login');
  // Chuyển hướng đến trang /login
  // replace: true để trang / không được lưu vào lịch sử trình duyệt,
  // người dùng nhấn back sẽ không quay lại trang này.
  await navigateTo('/login', { replace: true });
});
</script>
<style scoped>
/* Bạn có thể thêm CSS nếu muốn cho thông báo tải (nếu có) */
/* div {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 1.2em;
  color: #777;
} */
</style>