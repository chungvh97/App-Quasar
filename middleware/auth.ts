// middleware/auth.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type H3Event } from 'h3' // Để type-check cho event
import { getCookie, setCookie, deleteCookie } from 'h3' // Tiện ích cookie của H3/Nitro

export default defineNuxtRouteMiddleware(async (to, from) => {
    const { user, fetchUser: clientFetchUser } = useAuthUser() // clientFetchUser để phân biệt

    if (process.server) {
        console.log(`[AUTH MIDDLEWARE SSR] Đang xử lý route: ${to.path} ở server.`);
        const event = useRequestEvent() as H3Event // Lấy H3 event

        if (!event) {
            console.error('[AUTH MIDDLEWARE SSR] Không lấy được H3 event trên server.');
            // Xử lý lỗi, có thể chuyển hướng hoặc throw error
            return navigateTo('/login') // Ví dụ: chuyển về login nếu không có event
        }

        const runtimeConfig = useRuntimeConfig()
        const supabaseUrl = runtimeConfig.public.supabase.url
        const supabaseKey = runtimeConfig.public.supabase.key

        if (!supabaseUrl || !supabaseKey) {
            console.error('[AUTH MIDDLEWARE SSR] Supabase URL/Key bị thiếu cho server client.');
            return navigateTo('/login')
        }

        // Tạo server client đặc biệt cho request này
        const supabaseServerClient = createServerClient(
            supabaseUrl,
            supabaseKey,
            {
                cookies: {
                    get(name: string) {
                        return getCookie(event, name)
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        setCookie(event, name, value, options as any) // Cần ép kiểu options nếu h3 không khớp hoàn toàn
                    },
                    remove(name: string, options: CookieOptions) {
                        deleteCookie(event, name, options as any)
                    },
                },
                // auth: {
                //   flowType: 'pkce', // Quan trọng cho SSR
                // }
            }
        )

        try {
            const { data: { user: serverUser }, error } = await supabaseServerClient.auth.getUser()
            console.log('[AUTH MIDDLEWARE SSR] User từ server client:', JSON.stringify(serverUser));
            if (error) throw error

            // Cập nhật user ref toàn cục (của useAuthUser) với thông tin từ server
            // Điều này giúp client-side hydration có đúng trạng thái user ban đầu
            user.value = serverUser
        } catch (error) {
            console.error('[AUTH MIDDLEWARE SSR] Lỗi khi lấy user từ server client:', error)
            user.value = null
        }
    }
    // Ở client-side, onAuthStateChange trong plugin sẽ tự động cập nhật user.value.
    // Hoặc clientFetchUser có thể được gọi nếu cần.
    // if (process.client && !user.value) {
    //    await clientFetchUser(); // Có thể gọi clientFetchUser ở đây nếu user vẫn null ở client
    // }


    // ---- Logic kiểm tra đăng nhập và chuyển hướng (giữ nguyên hoặc điều chỉnh nếu cần) ----
    const isLoggedIn = !!user.value;
    console.log(`[AUTH MIDDLEWARE] (Run on ${process.server ? 'server' : 'client'}) isLoggedIn: ${isLoggedIn}, User: ${user.value?.email}`);

    if (to.path.startsWith('/admin')) {
        if (!isLoggedIn) {
            console.warn(`[AUTH MIDDLEWARE] (Run on ${process.server ? 'server' : 'client'}) User CHƯA đăng nhập. Chuyển về /login.`);
            return navigateTo({ path: '/login' });
        }
    }

    if (to.path === '/login' && isLoggedIn) {
        console.warn(`[AUTH MIDDLEWARE] (Run on ${process.server ? 'server' : 'client'}) User ĐÃ đăng nhập. Chuyển từ /login về /admin/products.`);
        return navigateTo('/admin/products');
    }
});
