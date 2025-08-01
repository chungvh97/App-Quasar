// composables/useAuthUser.ts
import { ref } from 'vue' // Bỏ onMounted vì onAuthStateChange đã chuyển qua plugin
import type { User, SupabaseClient } from '@supabase/supabase-js' // Thêm SupabaseClient

// user ref này là global cho tất cả các lần sử dụng composable
// Điều này phù hợp cho client-side state, nhưng cần cẩn thận với SSR nếu state này được set ở server
const user = ref<User | null>(null)

export const useAuthUser = () => {
    // supabase client sẽ được lấy thông qua useSupabase()
    // const supabase = useSupabase() // Lấy supabase client từ composable useSupabase

    const fetchUser = async (client?: SupabaseClient) => { // Cho phép truyền client vào
        const supabaseClient = client || useSupabase() // Ưu tiên client được truyền vào
        if (!supabaseClient) {
            // console.warn('[useAuthUser] Supabase client not available in fetchUser.')
            user.value = null
            return
        }
        try {
            const { data, error } = await supabaseClient.auth.getUser()
            if (error) throw error
            user.value = data.user
        } catch (error) {
            // console.error('[useAuthUser] Error fetching user:', error)
            user.value = null
        }
    }

    // Listener onAuthStateChange đã được chuyển vào plugin supabase.ts (client-side)
    // Nó sẽ trực tiếp cập nhật 'user' ref ở trên.

    // Nếu đang ở client và user chưa được fetch, hãy fetch lần đầu.
    // (onAuthStateChange trong plugin sẽ handle các thay đổi sau đó)
    if (process.client && user.value === null) {
        // console.log('[useAuthUser] Initial client-side fetchUser call.');
        // Không cần onMounted nữa, vì onAuthStateChange trong plugin sẽ làm việc này
        // fetchUser() // Gọi fetchUser với client mặc định từ useSupabase()
    }


    return {
        user,
        fetchUser
    }
}
