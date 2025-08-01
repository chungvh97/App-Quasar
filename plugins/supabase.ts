// plugins/supabase.ts
import { createBrowserClient } from '@supabase/ssr' // Thay đổi import
import type { SupabaseClient } from '@supabase/supabase-js' // Import kiểu SupabaseClient

export default defineNuxtPlugin(nuxtApp => {
    const runtimeConfig = useRuntimeConfig()

    const supabaseUrl = runtimeConfig.public.supabase.url
    const supabaseKey = runtimeConfig.public.supabase.key

    if (!supabaseUrl || !supabaseKey) {
        console.error('LỖI NGHIÊM TRỌNG: Supabase URL hoặc Key bị thiếu. Client sẽ không được khởi tạo.')
        // Cung cấp một giá trị null hoặc một đối tượng giả để tránh lỗi ở những chỗ khác nếu cần.
        // Tốt nhất là ứng dụng nên dừng lại hoặc báo lỗi rõ ràng nếu thiếu config.
        nuxtApp.provide('supabase', null) // Hoặc throw error
        return
    }

    // Chỉ tạo browser client ở phía client
    // Đối với server-side, chúng ta sẽ tạo client theo từng request trong middleware/server routes
    let supabaseInstance: SupabaseClient | null = null

    if (process.client) { // Chỉ chạy khi ở client
        supabaseInstance = createBrowserClient(supabaseUrl, supabaseKey)

        // Theo dõi sự thay đổi trạng thái xác thực ở client để cập nhật user trong useAuthUser
        // (Phần này có thể tích hợp chặt chẽ hơn với useAuthUser)
        supabaseInstance.auth.onAuthStateChange((event, session) => {
            const { user: authUserRef } = useAuthUser() // Lấy trực tiếp ref từ composable
            if (session) {
                authUserRef.value = session.user
            } else {
                authUserRef.value = null
            }
            // console.log('[Supabase Plugin Client] Auth state changed:', event, authUserRef.value);
        })
    }

    // Cung cấp instance này (có thể là null ở server ban đầu nếu không có logic server khác ở đây)
    // Hoặc chỉ provide khi là client:
    if (process.client && supabaseInstance) {
        nuxtApp.provide('supabase', supabaseInstance)
    } else {
        // Ở server, $supabase sẽ là undefined nếu chỉ dùng cách này.
        // Chúng ta sẽ xử lý client cho server một cách riêng biệt.
        // Hoặc, bạn có thể cung cấp một client cơ bản không có context cookie ở đây cho server,
        // nhưng nó sẽ không hoạt động cho việc lấy user session.
        // Tạm thời để $supabase có thể undefined ở server nếu plugin này chỉ lo client
    }
})
