<template>
  <q-page padding>
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
      <div>Đang tải chi tiết đơn hàng...</div>
    </div>
    <div v-else-if="errorLoading" class="text-center q-pa-xl">
      <q-icon name="error_outline" color="negative" size="3em" />
      <div class="text-h6 text-negative">Không thể tải chi tiết đơn hàng.</div>
      <p>{{ errorLoading }}</p>
      <q-btn label="Quay lại Danh sách" color="primary" outline @click="goBack" />
    </div>
    <div v-else-if="order">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h5">Chi tiết Đơn hàng #{{ order.id }}</div>
        <q-btn label="Quay lại Danh sách" icon="arrow_back" color="grey-7" outline @click="goBack" />
      </div>

      <q-card flat bordered class="q-mb-lg">
        <q-card-section>
          <div class="text-h6 q-mb-sm">Thông tin chung</div>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <q-field label="ID Đơn hàng" stack-label borderless dense>
                <template v-slot:control>{{ order.id }}</template>
              </q-field>
              <q-field label="Tên Khách hàng" stack-label borderless dense>
                <template v-slot:control>{{ order.customer_name || 'N/A' }}</template>
              </q-field>
              <q-field label="Số điện thoại" stack-label borderless dense>
                <template v-slot:control>{{ order.customer_phone || 'N/A' }}</template>
              </q-field>
            </div>
            <div class="col-12 col-sm-6">
              <q-field label="Ngày tạo" stack-label borderless dense>
                <template v-slot:control>{{ formatDate(order.created_at) }}</template>
              </q-field>
              <q-field label="Phương thức thanh toán" stack-label borderless dense>
                <template v-slot:control>{{ order.payment_method || 'N/A' }}</template>
              </q-field>
              <q-field label="Trạng thái" stack-label borderless dense>
                <template v-slot:control>
                  <q-chip :color="getStatusColor(order.status)" text-color="white" dense square size="sm" class="text-weight-bold">
                    {{ formatStatus(order.status) }}
                  </q-chip>
                </template>
              </q-field>
            </div>
            <div class="col-12" v-if="order.notes">
              <q-field label="Ghi chú" stack-label borderless dense autogrow>
                <template v-slot:control><div style="white-space: pre-wrap;">{{ order.notes }}</div></template>
              </q-field>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6 q-mb-sm">Chi tiết các món</div>
        </q-card-section>
        <q-separator />
        <q-list separator v-if="orderItems.length > 0">
          <q-item-label header class="bg-grey-2">
            <div class="row">
              <div class="col-6 text-subtitle2">Tên sản phẩm</div>
              <div class="col-2 text-subtitle2 text-right">Đơn giá</div>
              <div class="col-2 text-subtitle2 text-center">Số lượng</div>
              <div class="col-2 text-subtitle2 text-right">Thành tiền</div>
            </div>
          </q-item-label>
          <q-item v-for="item in orderItems" :key="item.id">
            <div class="row full-width items-center">
              <div class="col-6">{{ item.name_at_purchase }}</div>
              <div class="col-2 text-right">{{ item.price_at_purchase.toLocaleString('vi-VN') }}</div>
              <div class="col-2 text-center">{{ item.quantity }}</div>
              <div class="col-2 text-right text-weight-medium">{{ (item.price_at_purchase * item.quantity).toLocaleString('vi-VN') }}</div>
            </div>
          </q-item>
        </q-list>
        <q-card-section v-else class="text-center text-grey">
          Không có sản phẩm nào trong đơn hàng này.
        </q-card-section>
        <q-separator />
        <q-card-section class="row justify-end items-center bg-grey-1 q-py-md">
          <div class="text-subtitle1 text-weight-bold">Tổng cộng đơn hàng:</div>
          <div class="text-h5 text-weight-bolder q-ml-md text-primary">
            {{ order.total_amount.toLocaleString('vi-VN') }} VNĐ
          </div>
        </q-card-section>
      </q-card>

      <div class="q-mt-lg row justify-end q-gutter-sm">
        <q-btn label="In Bill (HTML)" icon="print" color="secondary" @click="printBill" />
        <q-btn
            label="Cập nhật Trạng thái"
            icon="edit_note"
            color="amber"
            text-color="black"
            @click="openUpdateStatusDialog"
            :disable="!order || updatingStatus"
            :loading="updatingStatus"
        />
      </div>

      <q-dialog v-model="showUpdateStatusDialog" persistent>
        <q-card style="min-width: 350px; width: 400px">
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">Cập nhật Trạng thái</div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>
          <q-card-section class="q-pt-none">
            <div class="q-mb-sm">Đơn hàng #{{ order?.id }}</div>
            <q-select
                v-model="newStatus"
                :options="statusOptions"
                label="Chọn trạng thái mới"
                filled
                emit-value
                map-options
                dense
                :rules="[val => !!val || 'Vui lòng chọn trạng thái']"
            />
          </q-card-section>

          <q-card-actions align="right" class="text-primary q-pa-md">
            <q-btn flat label="Hủy" v-close-popup :disable="updatingStatus"/>
            <q-btn label="Lưu thay đổi" @click="handleUpdateStatus" :loading="updatingStatus" color="primary" unelevated />
          </q-card-actions>
        </q-card>
      </q-dialog>

    </div>
    <div v-else class="text-center q-pa-xl">
      <q-icon name="search_off" color="grey" size="3em" />
      <div class="text-h6 text-grey">Không tìm thấy đơn hàng.</div>
      <q-btn label="Quay lại Danh sách" color="primary" outline @click="goBack" class="q-mt-md" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

// Định nghĩa Interfaces (nên đặt ở file chung types.ts và import)
interface Order {
  id: string | number;
  created_at: string;
  total_amount: number;
  status: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  notes?: string | null;
  payment_method?: string | null;
  staff_id?: string | null;
}

interface OrderItem {
  id: string | number;
  order_id: string | number;
  product_id: string | number;
  quantity: number;
  price_at_purchase: number;
  name_at_purchase: string;
}

definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const supabase = useSupabase()
const route = useRoute()
const router = useRouter()
const $q = useQuasar()

const order = ref<Order | null>(null)
const orderItems = ref<OrderItem[]>([])
const loading = ref(true)
const errorLoading = ref<string | null>(null)

const orderId = route.params.id as string;

// --- Logic Cập nhật Trạng thái ---
const showUpdateStatusDialog = ref(false);
const newStatus = ref<string | null>(null);
const updatingStatus = ref(false);

const statusOptions = [
  { label: 'Chờ xử lý', value: 'pending' },
  { label: 'Đang xử lý', value: 'processing' },
  { label: 'Đã thanh toán', value: 'paid' },
  { label: 'Hoàn thành', value: 'completed' },
  { label: 'Đã hủy', value: 'cancelled' },
];

const openUpdateStatusDialog = () => {
  if (order.value) {
    newStatus.value = order.value.status;
    showUpdateStatusDialog.value = true;
  }
};

const handleUpdateStatus = async () => {
  if (!order.value || !newStatus.value) {
    $q.notify({ type: 'negative', message: 'Vui lòng chọn trạng thái mới.', position: 'top' });
    return;
  }
  if (order.value.status === newStatus.value) {
    $q.notify({ type: 'info', message: 'Trạng thái đơn hàng không thay đổi.', position: 'top' });
    showUpdateStatusDialog.value = false;
    return;
  }

  updatingStatus.value = true;
  try {
    const { data, error } = await supabase
        .from('orders')
        .update({ status: newStatus.value })
        .eq('id', order.value.id)
        .select()
        .single();

    if (error) throw error;

    if (data) {
      order.value = data; // Cập nhật lại thông tin order trên trang chi tiết
    }
    $q.notify({
      color: 'positive',
      message: `Đã cập nhật trạng thái đơn hàng #${order.value.id} thành "${formatStatus(newStatus.value)}"`,
      icon: 'check_circle',
      position: 'top'
    });
    showUpdateStatusDialog.value = false;

  } catch (error: any) {
    console.error('Lỗi cập nhật trạng thái đơn hàng:', error);
    $q.notify({
      type: 'negative',
      message: error.message || 'Lỗi khi cập nhật trạng thái.',
      position: 'top'
    });
  } finally {
    updatingStatus.value = false;
  }
};
// --- Kết thúc Logic Cập nhật Trạng thái ---

const fetchOrderDetails = async () => {
  if (!orderId) {
    errorLoading.value = 'ID đơn hàng không hợp lệ.';
    loading.value = false;
    return;
  }
  loading.value = true;
  errorLoading.value = null;
  try {
    const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

    if (orderError && orderError.code !== 'PGRST116') { // PGRST116: ' exactamente una fila esperada, pero se encontraron 0 filas' (0 rows found)
      throw orderError;
    }
    if (!orderData) {
      // Không throw error ở đây để hiển thị trang "Không tìm thấy đơn hàng" một cách nhẹ nhàng hơn
      order.value = null;
      console.warn(`Order with ID ${orderId} not found.`);
      // errorLoading.value = 'Không tìm thấy đơn hàng.'; // Có thể set ở đây nếu muốn
      return; // Dừng ở đây nếu không tìm thấy order
    }
    order.value = orderData;

    const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

    if (itemsError) throw itemsError;
    orderItems.value = itemsData || [];

  } catch (error: any) {
    console.error('Lỗi tải chi tiết đơn hàng:', error);
    errorLoading.value = error.message || 'Đã xảy ra lỗi không xác định.';
    order.value = null;
  } finally {
    loading.value = false;
  }
}

const goBack = () => {
  router.push('/admin/orders')
}

const getStatusColor = (status: string | undefined | null) => {
  if (!status) return 'grey';
  switch (status.toLowerCase()) {
    case 'pending': return 'orange';
    case 'paid': return 'green';
    case 'processing': return 'deep-purple';
    case 'completed': return 'blue';
    case 'cancelled': return 'red';
    default: return 'grey-7';
  }
}

const formatStatus = (status: string | undefined | null) => {
  if (!status) return 'N/A';
  const statusMap: { [key: string]: string } = {
    pending: 'Chờ xử lý',
    paid: 'Đã thanh toán',
    processing: 'Đang xử lý',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy'
  };
  return statusMap[status.toLowerCase()] || status.charAt(0).toUpperCase() + status.slice(1);
}

const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const printBill = () => {
  if (!order.value || !orderItems.value) return;

  let billContent = `
    <html>
    <head>
      <title>Hóa đơn #${order.value.id}</title>
      <style>
        body { font-family: 'Arial', sans-serif; margin: 20px; font-size: 12px; color: #333; }
        .container { width: 300px; margin: 0 auto; } /* Typical receipt width */
        h1, h2, h3 { text-align: center; margin: 5px 0; }
        h2 { font-size: 16px; }
        h3 { font-size: 14px; font-weight: normal; }
        p { margin: 3px 0; }
        hr { border: none; border-top: 1px dashed #666; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th, td { padding: 3px 1px; text-align: left; vertical-align: top; }
        .items-header th { border-bottom: 1px solid #666; text-align:center; }
        .item-name { width: 50%; }
        .item-qty { text-align: center; width: 15%; }
        .item-price, .item-subtotal { text-align: right; width: 35%; } /* Adjusted width */
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .total-section td { padding-top: 5px; }
        .footer-message { margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Tiệm Trà Sữa ABC</h2>
        <h3>Địa chỉ: 123 Đường XYZ, Q.1, TP. HCM</h3>
        <h3>ĐT: 0909.123.456</h3>
        <hr/>
        <h1>HÓA ĐƠN</h1>
        <p><strong>Số HĐ:</strong> #${order.value.id}</p>
        <p><strong>Ngày:</strong> ${formatDate(order.value.created_at)}</p>
        <hr/>
        <p><strong>Khách hàng:</strong> ${order.value.customer_name || 'Khách lẻ'}</p>
        ${order.value.customer_phone ? `<p><strong>Điện thoại:</strong> ${order.value.customer_phone}</p>` : ''}
        <table>
          <thead>
            <tr class="items-header">
              <th class="item-name">Tên món</th>
              <th class="item-qty">SL</th>
              <th class="item-price">Đ.Giá</th>
              <th class="item-subtotal">T.Tiền</th>
            </tr>
          </thead>
          <tbody>
  `;
  orderItems.value.forEach(item => {
    billContent += `
            <tr>
              <td class="item-name">${item.name_at_purchase}</td>
              <td class="item-qty">${item.quantity}</td>
              <td class="item-price">${item.price_at_purchase.toLocaleString('vi-VN')}</td>
              <td class="item-subtotal">${(item.price_at_purchase * item.quantity).toLocaleString('vi-VN')}</td>
            </tr>
    `;
  });
  billContent += `
          </tbody>
        </table>
        <hr/>
        <table class="total-section">
          <tr>
            <td colspan="3" class="font-bold text-right">TỔNG CỘNG:</td>
            <td class="font-bold item-subtotal">${order.value.total_amount.toLocaleString('vi-VN')} VNĐ</td>
          </tr>
          <tr>
            <td colspan="3" class="text-right">Phương thức TT:</td>
            <td class="item-subtotal">${formatStatus(order.value.payment_method) || 'N/A'}</td>
          </tr>
        </table>
        ${order.value.notes ? `<hr/><p><strong>Ghi chú:</strong> ${order.value.notes}</p>` : ''}
        <p class="text-center footer-message">Cảm ơn quý khách & hẹn gặp lại!</p>
        <p class="text-center">www.tiemtrasuaabc.com</p>
      </div>
    </body>
    </html>
  `;
  const billWindow = window.open('', '_blank', 'width=380,height=700,scrollbars=yes,resizable=yes'); // Adjusted width for typical receipt
  if (billWindow) {
    billWindow.document.write(billContent);
    billWindow.document.close();
    // Consider adding a small delay before printing if content doesn't render immediately
    // setTimeout(() => { billWindow.print(); }, 500);
  } else {
    $q.notify({ type: 'negative', message: 'Không thể mở cửa sổ in. Vui lòng kiểm tra cài đặt pop-up của trình duyệt.', position: 'top' });
  }
}


onMounted(() => {
  fetchOrderDetails()
})
</script>

<style scoped>
.q-field__label {
  font-weight: 500;
  color: #555;
}
/* .q-field .q-field__control-container .q-field__control {
  font-weight: normal;
} */
.text-subtitle2 {
  font-weight: 500;
}
.q-table th { /* Đảm bảo style này không bị ghi đè hoặc đã có ở global styles */
  font-weight: bold;
}
</style>
