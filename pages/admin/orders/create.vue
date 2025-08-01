<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Tạo Đơn hàng Mới</div>

    <div class="row q-col-gutter-lg">
      <div class="col-12 col-md-7">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">Chọn Sản phẩm</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <q-input
                v-model="productSearchTerm"
                label="Tìm kiếm sản phẩm (theo tên)"
                outlined
                dense
                clearable
                class="q-mb-md"
            >
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
            </q-input>

            <q-list bordered separator v-if="!productLoading && availableProducts.length > 0">
              <q-item
                  v-for="product in filteredProducts"
                  :key="product.id"
                  clickable
                  v-ripple
                  @click="addProductToOrder(product)"
                  :disable="!product.is_active"
              >
                <q-item-section>
                  <q-item-label>{{ product.name }}</q-item-label>
                  <q-item-label caption>
                    {{ product.price.toLocaleString('vi-VN') }} VNĐ
                    <span v-if="!product.is_active" class="text-red text-caption"> (Ngừng bán)</span>
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                      icon="add_shopping_cart"
                      color="primary"
                      flat
                      round
                      dense
                      @click.stop="addProductToOrder(product)"
                      :disable="!product.is_active"
                  />
                </q-item-section>
              </q-item>
            </q-list>
            <div v-else-if="productLoading" class="text-center q-pa-md">
              <q-spinner color="primary" size="2em" />
              <div>Đang tải sản phẩm...</div>
            </div>
            <div v-else class="text-center q-pa-md text-grey">
              Không tìm thấy sản phẩm nào.
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-5">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">Thông tin Đơn hàng</div>
          </q-card-section>
          <q-separator />

          <q-list bordered separator v-if="currentOrderItems.length > 0" class="q-ma-md">
            <q-item-label header class="text-subtitle1">Các món đã chọn:</q-item-label>
            <q-item
                v-for="(item, index) in currentOrderItems"
                :key="item.product_id"
            >
              <q-item-section>
                <q-item-label>{{ item.name_at_purchase }}</q-item-label>
                <q-item-label caption>
                  {{ item.price_at_purchase.toLocaleString('vi-VN') }} VNĐ x {{ item.quantity }}
                </q-item-label>
              </q-item-section>
              <q-item-section side top>
                <div class="row items-center q-gutter-xs">
                  <q-input
                      v-model.number="item.quantity"
                      type="number"
                      dense
                      style="width: 60px;"
                      @update:model-value="(val) => updateQuantity(item.product_id, Number(val))"
                      :min="1"
                  />
                  <q-btn
                      icon="delete"
                      color="negative"
                      flat
                      round
                      dense
                      size="sm"
                      @click="removeItemFromOrder(item.product_id)"
                  />
                </div>
              </q-item-section>
            </q-item>
          </q-list>
          <div v-else class="text-center q-pa-md text-grey q-ma-md">
            Chưa có sản phẩm nào được chọn.
          </div>

          <q-separator class="q-mt-md q-mb-sm"/>

          <q-card-section class="row justify-end items-center">
            <div class="text-subtitle1 text-weight-bold">Tổng cộng:</div>
            <div class="text-h6 text-weight-bolder q-ml-md text-primary">
              {{ totalOrderAmount.toLocaleString('vi-VN') }} VNĐ
            </div>
          </q-card-section>

          <q-separator class="q-mb-md"/>

          <q-card-section>
            <div class="text-subtitle1 q-mb-sm">Thông tin Khách hàng (Nếu có)</div>
            <q-input v-model="orderDetails.customer_name" label="Tên khách hàng" outlined dense class="q-mb-sm" />
            <q-input v-model="orderDetails.customer_phone" label="Số điện thoại" outlined dense class="q-mb-sm" type="tel"/>
            <q-select
                v-model="orderDetails.payment_method"
                :options="paymentMethodOptions"
                label="Phương thức thanh toán"
                outlined
                dense
                emit-value
                map-options
                class="q-mb-sm"
            />
            <q-input v-model="orderDetails.notes" label="Ghi chú đơn hàng" type="textarea" outlined dense autogrow/>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn label="Hủy đơn" color="grey" flat @click="cancelOrder" :disable="formSubmitting" />
            <q-btn
                label="Xác nhận Đặt hàng"
                color="primary"
                icon="check_circle"
                @click="placeOrder"
                :loading="formSubmitting"
                :disable="currentOrderItems.length === 0"
            />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
// Giả sử bạn có định nghĩa Product từ file types hoặc định nghĩa lại ở đây
interface Product {
  id: string | number;
  created_at: string;
  name: string;
  price: number;
  description?: string | null;
  image_url?: string | null;
  category?: string | null;
  is_active: boolean;
}

interface CurrentOrderItem {
  product_id: string | number;
  name_at_purchase: string;
  price_at_purchase: number;
  quantity: number;
}

interface OrderDetails {
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
  payment_method: string | null;
  status: string; // Mặc định 'pending'
  total_amount: number;
  // staff_id sẽ được lấy từ user đang đăng nhập nếu cần
}

definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const supabase = useSupabase()
const $q = useQuasar()
const { user: loggedInUser } = useAuthUser() // Lấy thông tin nhân viên đăng nhập

const availableProducts = ref<Product[]>([])
const productLoading = ref(false)
const productSearchTerm = ref('')

const currentOrderItems = ref<CurrentOrderItem[]>([])
const orderDetails = ref<Partial<OrderDetails>>({ // Sử dụng Partial để khởi tạo
  customer_name: null,
  customer_phone: null,
  notes: null,
  payment_method: 'cash', // Mặc định
  status: 'pending',
})
const formSubmitting = ref(false)

const paymentMethodOptions = [
  { label: 'Tiền mặt', value: 'cash' },
  { label: 'Chuyển khoản', value: 'bank_transfer' },
  { label: 'MoMo', value: 'momo' },
  { label: 'Thẻ', value: 'card' },
]

// Lấy danh sách sản phẩm
const fetchAvailableProducts = async () => {
  productLoading.value = true
  try {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        // .eq('is_active', true) // Chỉ lấy sản phẩm đang bán nếu muốn
        .order('name', { ascending: true })
    if (error) throw error
    availableProducts.value = data || []
  } catch (error: any) {
    $q.notify({ color: 'negative', message: `Lỗi tải sản phẩm: ${error.message}` })
  } finally {
    productLoading.value = false
  }
}

const filteredProducts = computed(() => {
  if (!productSearchTerm.value) {
    return availableProducts.value
  }
  return availableProducts.value.filter(product =>
      product.name.toLowerCase().includes(productSearchTerm.value.toLowerCase())
  )
})

// Thêm sản phẩm vào đơn hàng hiện tại
const addProductToOrder = (product: Product) => {
  if (!product.is_active) {
    $q.notify({color: 'warning', message: `Sản phẩm "${product.name}" đã ngừng bán.`})
    return;
  }
  const existingItem = currentOrderItems.value.find(item => item.product_id === product.id)
  if (existingItem) {
    existingItem.quantity += 1
  } else {
    currentOrderItems.value.push({
      product_id: product.id,
      name_at_purchase: product.name,
      price_at_purchase: product.price,
      quantity: 1
    })
  }
  $q.notify({
    color: 'positive',
    message: `Đã thêm "${product.name}" vào đơn hàng.`,
    icon: 'add_shopping_cart',
    position: 'top',
    timeout: 1000
  })
}

// Cập nhật số lượng
const updateQuantity = (productId: string | number, newQuantity: number) => {
  const item = currentOrderItems.value.find(i => i.product_id === productId)
  if (item) {
    if (newQuantity >= 1) {
      item.quantity = newQuantity
    } else {
      // Nếu số lượng < 1, xóa item hoặc đặt lại là 1 (tùy logic)
      // Ở đây, nếu người dùng cố tình giảm xuống 0 hoặc âm, ta có thể xóa item
      removeItemFromOrder(productId)
    }
  }
}

// Xóa sản phẩm khỏi đơn hàng
const removeItemFromOrder = (productId: string | number) => {
  currentOrderItems.value = currentOrderItems.value.filter(item => item.product_id !== productId)
  $q.notify({
    color: 'info',
    message: 'Đã xóa món khỏi đơn hàng.',
    position: 'top',
    timeout: 1000
  })
}

// Tính tổng tiền đơn hàng
const totalOrderAmount = computed(() => {
  return currentOrderItems.value.reduce((total, item) => {
    return total + (item.price_at_purchase * item.quantity)
  }, 0)
})

// Hủy đơn hàng (reset form)
const cancelOrder = () => {
  $q.dialog({
    title: 'Xác nhận Hủy',
    message: 'Bạn có chắc chắn muốn hủy đơn hàng hiện tại và xóa tất cả các món đã chọn không?',
    cancel: true,
    persistent: true
  }).onOk(() => {
    currentOrderItems.value = []
    orderDetails.value = { customer_name: null, customer_phone: null, notes: null, payment_method: 'cash', status: 'pending' }
    productSearchTerm.value = ''
    $q.notify({ color: 'info', message: 'Đã hủy đơn hàng hiện tại.' })
  })
}

// Đặt hàng
const placeOrder = async () => {
  if (currentOrderItems.value.length === 0) {
    $q.notify({ color: 'negative', message: 'Vui lòng chọn ít nhất một sản phẩm.' })
    return
  }

  formSubmitting.value = true
  try {
    // 1. Insert vào bảng 'orders'
    const orderToInsert = {
      total_amount: totalOrderAmount.value,
      status: orderDetails.value.status || 'pending',
      customer_name: orderDetails.value.customer_name,
      customer_phone: orderDetails.value.customer_phone,
      notes: orderDetails.value.notes,
      payment_method: orderDetails.value.payment_method,
      staff_id: loggedInUser.value?.id // Lấy ID nhân viên đang đăng nhập
    }

    const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert(orderToInsert)
        .select() // Yêu cầu trả về bản ghi đã insert
        .single() // Vì chúng ta chỉ insert 1 order

    if (orderError) throw orderError
    if (!orderData) throw new Error('Không thể tạo đơn hàng.')

    const newOrderId = orderData.id

    // 2. Insert vào bảng 'order_items'
    const itemsToInsert = currentOrderItems.value.map(item => ({
      order_id: newOrderId,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_purchase: item.price_at_purchase,
      name_at_purchase: item.name_at_purchase
    }))

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert)

    if (itemsError) {
      // Nếu lỗi khi thêm order_items, lý tưởng nhất là nên rollback việc thêm order
      // Tuy nhiên, Supabase client không hỗ trợ transaction trực tiếp dễ dàng.
      // Cân nhắc dùng Edge Function cho việc này để đảm bảo tính toàn vẹn.
      // Tạm thời thông báo lỗi và có thể cần xóa order đã tạo thủ công nếu cần.
      console.error('Lỗi khi thêm chi tiết đơn hàng, nhưng order chính đã được tạo với ID:', newOrderId);
      throw itemsError;
    }

    $q.notify({
      color: 'positive',
      message: `Đơn hàng #${newOrderId} đã được tạo thành công!`,
      icon: 'check_circle',
      timeout: 3000
    })

    // Reset form
    currentOrderItems.value = []
    orderDetails.value = { customer_name: null, customer_phone: null, notes: null, payment_method: 'cash', status: 'pending' }
    productSearchTerm.value = ''

    // Tùy chọn: Chuyển hướng đến trang chi tiết đơn hàng hoặc danh sách đơn hàng
    // navigateTo(`/admin/orders/${newOrderId}`)

  } catch (error: any) {
    console.error('Lỗi khi đặt hàng:', error)
    $q.notify({
      color: 'negative',
      message: `Lỗi khi đặt hàng: ${error.message || 'Đã có lỗi không xác định.'}`,
      icon: 'report_problem'
    })
  } finally {
    formSubmitting.value = false
  }
}

onMounted(() => {
  fetchAvailableProducts()
})
</script>

<style scoped>
.q-item__label--header {
  font-weight: bold;
  color: $primary; /* Sử dụng biến màu của Quasar nếu đã định nghĩa SASS variables */
}
/* Thêm style nếu cần */
</style>

