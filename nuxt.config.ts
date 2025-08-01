// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: ['nuxt-quasar-ui'],
  quasar: {
    plugins: [
      'Notify', // Ví dụ: thêm plugin Notify của Quasar
      'Dialog', // Ví dụ: thêm plugin Dialog
      // Thêm các plugin Quasar khác bạn muốn sử dụng tại đây
    ],
    extras: {
      // animations: 'all', // Bật tất cả animation
      // iconSet: 'material-icons', // Chọn bộ icon, ví dụ material-icons
    },
    // Cấu hình thêm cho Quasar nếu cần
    // sassVariables: 'assets/quasar-variables.sass', // Nếu bạn muốn tùy biến biến SASS của Quasar
  },
  runtimeConfig: {
    // Các biến này chỉ có sẵn ở phía server (nếu cần)
    // supabaseKey: process.env.SUPABASE_KEY, // Ví dụ nếu key này là private

    // Các biến này sẽ được public và có sẵn cả ở client và server
    public: {
      supabase: {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_KEY
      }
    }
  },
})
