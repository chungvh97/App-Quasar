<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">Quản lý Đơn hàng</div>
      <q-btn
          color="primary"
          icon="add_circle_outline"
          label="Tạo Đơn hàng Mới"
          to="/admin/orders/create"
      />
    </div>

    <q-table
        title="Danh sách Đơn hàng"
        :rows="orders"
        :columns="columns"
        row-key="id"
        :loading="loading"
        flat
        bordered
        separator="cell"
        class="q-mt-md"
        v-model:pagination="pagination"
        @request="handleTableRequest"
    >
      <template v-slot:body-cell-total_amount="props">
        <q-td :props="props">
          {{ props.row.total_amount.toLocaleString('vi-VN') }} VNĐ
        </q-td>
      </template>

      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <q-chip
              :color="getStatusColor(props.value)"
              text-color="white"
              dense
              class="text-weight-bolder"
              square
              size="sm"
          >
            {{ formatStatus(props.value) }}
          </q-chip>
        </q-td>
      </template>

      <template v-slot:body-cell-created_at="props">
        <q-td :props="props">
          {{ formatDate(props.value) }}
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="q-gutter-xs">
          <q-btn
              dense
              round
              flat
              color="primary"
              @click="viewOrderDetails(props.row.id)"
              icon="visibility"
              size="sm"
          >
            <q-tooltip delay-page>Xem Chi tiết</q-tooltip>
          </q-btn>
        </q-td>
      </template>

      <template v-slot:no-data="{ icon, message }">
        <div class="full-width row flex-center text-primary q-gutter-sm q-pa-md">
          <q-icon size="2em" name="sentiment_very_dissatisfied" />
          <span>
            {{ message }}
          </span>
        </div>
      </template>
    </q-table>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Ref } from 'vue';         // Import Ref đúng cách là một type
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';

definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const supabase = useSupabase()
const $q = useQuasar()
const router = useRouter()

// Định nghĩa kiểu dữ liệu Order
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

// Định nghĩa kiểu cho đối tượng pagination của QTable
interface TablePagination {
  sortBy: string | null; // sortBy có thể là null ban đầu từ q-table trước khi ta xử lý
  descending: boolean;
  page: number;
  rowsPerPage: number;
  rowsNumber?: number;
}

// Định nghĩa interface cục bộ cho column của bảng Order
interface OrderTableColumn {
  name: string;
  label: string;
  field: string | ((row: Order) => any);
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  // required?: boolean;
  // style?: string;
  // classes?: string;
  // format?: (val: any, row: Order) => any;
}

const orders = ref<Order[]>([])
const loading = ref(false)
const pagination: Ref<TablePagination> = ref({ // Sử dụng Ref đã import
  sortBy: 'created_at', // Sắp xếp mặc định ban đầu
  descending: true,    // Theo chiều giảm dần
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
})

const columns: OrderTableColumn[] = [
  { name: 'id', label: 'ID Đơn', field: 'id', sortable: true, align: 'left' },
  { name: 'customer_name', label: 'Tên Khách hàng', field: (row: Order) => row.customer_name || 'N/A', align: 'left', sortable: true },
  { name: 'total_amount', label: 'Tổng tiền', field: 'total_amount', sortable: true, align: 'right' },
  { name: 'status', label: 'Trạng thái', field: 'status', sortable: true, align: 'center' },
  { name: 'payment_method', label: 'Thanh toán', field: (row: Order) => row.payment_method || 'N/A', align: 'left', sortable: true },
  { name: 'created_at', label: 'Ngày tạo', field: 'created_at', sortable: true, align: 'left' },
  { name: 'actions', label: 'Hành động', field: 'actions', align: 'center', sortable: false }
];


const handleTableRequest = (props: { pagination: TablePagination }) => {
  const newPaginationRequest = props.pagination;
  // console.log('[handleTableRequest] QTable gửi lên (props.pagination):', JSON.parse(JSON.stringify(newPaginationRequest)));

  let newSortBy = newPaginationRequest.sortBy;
  let newDescending = newPaginationRequest.descending;

  // Nếu q-table cố gắng đặt sortBy thành null (khi người dùng bỏ sort bằng cách nhấp nhiều lần vào header)
  // chúng ta sẽ đặt lại về giá trị sắp xếp mặc định của ứng dụng.
  if (newSortBy === null || newSortBy === undefined || newSortBy === '') {
    // console.log("[handleTableRequest] QTable yêu cầu sortBy là null/rỗng. Đặt lại về mặc định 'created_at' descending.");
    newSortBy = 'created_at'; // Cột sắp xếp mặc định của bạn
    newDescending = true;    // Hướng sắp xếp mặc định
  }

  // Cập nhật pagination ref chính mà q-table đang theo dõi (v-model)
  // với các giá trị đã được "làm sạch" (sortBy không bao giờ null)
  pagination.value.page = newPaginationRequest.page;
  pagination.value.rowsPerPage = newPaginationRequest.rowsPerPage;
  pagination.value.sortBy = newSortBy;
  pagination.value.descending = newDescending;

  // console.log('[handleTableRequest] pagination.value SAU KHI cập nhật:', JSON.parse(JSON.stringify(pagination.value)));

  fetchOrders(); // Gọi fetchOrders, nó sẽ sử dụng pagination.value đã được cập nhật
};

const fetchOrders = async () => {
  loading.value = true;
  // pagination.value.sortBy và pagination.value.descending giờ đây
  // được đảm bảo luôn có giá trị hợp lệ bởi handleTableRequest
  const { page, rowsPerPage, sortBy, descending } = pagination.value;

  try {
    const from = (page - 1) * rowsPerPage;
    const to = from + rowsPerPage - 1;

    // console.log(`[fetchOrders] Đang tải đơn hàng với sortBy: '${sortBy}', descending: ${descending}, page: ${page}, rowsPerPage: ${rowsPerPage}`);

    const { data, error, count } = await supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .order(sortBy, { ascending: !descending }) // sortBy ở đây luôn hợp lệ, !descending để chuyển thành ascending cho Supabase
        .range(from, to);

    if (error) throw error;

    orders.value = data || [];
    pagination.value.rowsNumber = count || 0;

  } catch (error: any) {
    console.error('Lỗi tải danh sách đơn hàng:', error.message, error);
    $q.notify({
      color: 'negative',
      message: `Lỗi tải danh sách đơn hàng: ${error.message}`,
      icon: 'report_problem',
      position: 'top-right'
    });
  } finally {
    loading.value = false;
  }
};

// Các hàm tiện ích (giữ nguyên như bạn đã có)
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

const viewOrderDetails = (orderId: string | number) => {
  router.push(`/admin/orders/${orderId}`);
}

onMounted(() => {
  // Khi component được mount, fetchOrders sẽ sử dụng giá trị pagination mặc định đã khai báo
  // (bao gồm sortBy: 'created_at', descending: true)
  fetchOrders();
});
</script>

<style scoped>
.q-table th {
  font-weight: bold;
}
/* Thêm CSS nếu cần */
</style>
