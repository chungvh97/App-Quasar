// composables/useSupabase.ts
import { useNuxtApp } from '#app'

export const useSupabase = () => {
    const nuxtApp = useNuxtApp()
    // Lấy instance đã được provide trong plugin
    return nuxtApp.$supabase
}
