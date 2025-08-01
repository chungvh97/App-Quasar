<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Báo cáo Doanh thu & Sản phẩm</div>

    <q-card flat bordered>
      <q-card-section class="q-gutter-md row items-end">
        <q-select
            v-model="selectedPeriod"
            :options="periodOptions"
            label="Xem theo kỳ"
            emit-value
            map-options
            outlined
            dense
            style="min-width: 200px"
            @update:model-value="handlePeriodChange"
        />
        <q-input v-model="dateRange.from" outlined dense label="Từ ngày" type="date" stack-label :disable="selectedPeriod !== 'custom'" style="min-width: 180px;" />
        <q-input v-model="dateRange.to" outlined dense label="Đến ngày" type="date" stack-label :disable="selectedPeriod !== 'custom'" style="min-width: 180px;" />
        <q-btn
            label="Xem Báo cáo"
            color="primary"
            icon="visibility"
            @click="fetchSalesReport"
            :loading="loading || topProductsLoading"
            :disable="selectedPeriod === 'custom' && (!dateRange.from || !dateRange.to)"
        />
      </q-card-section>
      <q-separator />

      <q-card-section>
        <div class="text-h6">Tổng Doanh Thu</div>
        <div class="text-caption text-grey-7" v-if="!initialLoad && displayPeriod">
          Trong khoảng thời gian: {{ displayPeriod }}
        </div>
        <div v-if="loading" class="text-center q-pa-md">
          <q-spinner color="primary" size="2em" />
          <div>Đang tải dữ liệu doanh thu...</div>
        </div>
        <div v-else-if="!initialLoad && salesData !== null" class="text-h4 text-primary text-center q-my-lg">
          {{ (salesData || 0).toLocaleString('vi-VN') }} VNĐ
        </div>
        <div v-else-if="!initialLoad && salesData === null && !loading" class="text-center q-pa-md text-negative">
          Không có dữ liệu doanh thu cho kỳ đã chọn hoặc có lỗi xảy ra.
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="q-mt-lg">
      <q-card-section>
        <div class="text-h6">Sản phẩm Bán chạy nhất</div>
        <div class="text-caption text-grey-7" v-if="!initialLoad && displayPeriod">
          Trong khoảng thời gian: {{ displayPeriod }}
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section v-if="topProductsLoading" class="text-center q-pa-md">
        <q-spinner color="primary" size="2em" />
        <div>Đang tải danh sách sản phẩm bán chạy...</div>
      </q-card-section>
      <q-card-section v-else-if="!initialLoad && topSellingProducts && topSellingProducts.length > 0">
        <q-table
            :rows="topSellingProducts"
            :columns="topProductsColumns"
            row-key="product_id_ref"
            flat
            dense
            separator="horizontal"
            :rows-per-page-options="[5, 10, 20, 0]"
        >
          <template v-slot:no-data>
            <div class="full-width row flex-center text-grey q-gutter-sm q-pa-md">
              <q-icon size="2em" name="sentiment_dissatisfied" />
              <span>Không có dữ liệu sản phẩm bán chạy cho kỳ này.</span>
            </div>
          </template>
        </q-table>
      </q-card-section>
      <q-card-section v-else-if="!initialLoad && (!topSellingProducts || topSellingProducts.length === 0) && !topProductsLoading" class="text-center q-pa-md text-grey">
        Không có dữ liệu sản phẩm bán chạy cho kỳ đã chọn.
      </q-card-section>
    </q-card>

    <q-card-section v-if="initialLoad && salesData === null && topSellingProducts === null" class="text-center q-pa-md text-grey q-mt-md">
      Chọn kỳ báo cáo và nhấn "Xem Báo cáo" để bắt đầu.
    </q-card-section>

  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useQuasar, date as qDate } from 'quasar'

definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const supabase = useSupabase()
const $q = useQuasar()

const loading = ref(false) // Loading cho tổng doanh thu
const salesData = ref<number | null>(null)
const initialLoad = ref(true) // Để kiểm soát hiển thị thông báo ban đầu

const selectedPeriod = ref('today') // Mặc định
const dateRange = ref({
  from: qDate.formatDate(Date.now(), 'YYYY-MM-DD'), // Mặc định hôm nay
  to: qDate.formatDate(Date.now(), 'YYYY-MM-DD')    // Mặc định hôm nay
})
const displayPeriod = ref('') // Hiển thị khoảng thời gian đã chọn cho báo cáo

const periodOptions = [
  { label: 'Hôm nay', value: 'today' },
  { label: 'Hôm qua', value: 'yesterday' },
  { label: 'Tuần này (tính từ Chủ Nhật)', value: 'this_week' },
  { label: 'Tháng này', value: 'this_month' },
  { label: 'Tháng trước', value: 'last_month' },
  { label: 'Tùy chọn', value: 'custom' }
]

// --- State và Columns cho Sản phẩm Bán chạy ---
interface TopSellingProduct {
  product_id_ref: number; // Hoặc string/UUID nếu ID sản phẩm của bạn khác
  product_name: string;
  total_quantity_sold: number;
}
const topSellingProducts = ref<TopSellingProduct[] | null>(null);
const topProductsLoading = ref(false); // Loading riêng cho bảng sản phẩm bán chạy

const topProductsColumns = [
  { name: 'product_name', required: true, label: 'Tên Sản phẩm', align: 'left', field: (row: TopSellingProduct) => row.product_name, sortable: true },
  { name: 'total_quantity_sold', label: 'Tổng Số lượng Bán', field: (row: TopSellingProduct) => row.total_quantity_sold, sortable: true, align: 'right' },
  // { name: 'product_id_ref', label: 'ID Sản phẩm', field: 'product_id_ref', sortable: true, align: 'left' }, // Tùy chọn hiển thị
];
// --- Kết thúc State và Columns cho Sản phẩm Bán chạy ---

const calculateDateRange = (period: string) => {
  const today = new Date()
  let fromDate = new Date()
  let toDate = new Date()

  switch (period) {
    case 'today':
      // fromDate và toDate đã là today
      break;
    case 'yesterday':
      fromDate = qDate.subtractFromDate(today, { days: 1 })
      toDate = qDate.subtractFromDate(today, { days: 1 })
      break;
    case 'this_week':
      fromDate = qDate.subtractFromDate(today, { days: today.getDay() }) // Chủ nhật của tuần hiện tại
      toDate = today; // Đến ngày hiện tại của tuần
      break;
    case 'this_month':
      fromDate = qDate.startOfDate(today, 'month')
      toDate = today; // Đến ngày hiện tại của tháng
      break;
    case 'last_month':
      const lastMonthDate = qDate.subtractFromDate(today, { months: 1 })
      fromDate = qDate.startOfDate(lastMonthDate, 'month')
      toDate = qDate.endOfDate(lastMonthDate, 'month')
      break;
    case 'custom':
      // Người dùng sẽ tự chọn, không cần tính ở đây
      return;
  }
  dateRange.value.from = qDate.formatDate(fromDate, 'YYYY-MM-DD')
  dateRange.value.to = qDate.formatDate(toDate, 'YYYY-MM-DD')
}

const handlePeriodChange = (periodValue: string) => {
  selectedPeriod.value = periodValue; // Cập nhật selectedPeriod trước
  if (periodValue !== 'custom') {
    calculateDateRange(periodValue)
    fetchSalesReport() // Tự động tải lại báo cáo khi chọn kỳ định sẵn
  } else {
    salesData.value = null; // Reset data khi chuyển sang custom
    topSellingProducts.value = null;
    initialLoad.value = false; // Đánh dấu là không phải lần tải đầu nữa để hiển thị đúng thông báo
    displayPeriod.value = ''; // Xóa hiển thị kỳ cũ
  }
}

const fetchSalesReport = async () => {
  if (selectedPeriod.value === 'custom' && (!dateRange.value.from || !dateRange.value.to)) {
    $q.notify({ type: 'negative', message: 'Vui lòng chọn ngày bắt đầu và kết thúc cho kỳ tùy chọn.', position: 'top' })
    return
  }
  if (dateRange.value.from && dateRange.value.to && new Date(dateRange.value.from) > new Date(dateRange.value.to)) {
    $q.notify({ type: 'negative', message: 'Ngày bắt đầu không thể lớn hơn ngày kết thúc.', position: 'top' })
    return
  }

  loading.value = true;
  topProductsLoading.value = true;
  initialLoad.value = false; // Đã có hành động xem báo cáo
  salesData.value = null;
  topSellingProducts.value = null;

  // Params cho hàm calculate_sales_in_period
  const salesParams = {
    start_date: dateRange.value.from, // ĐÚNG TÊN THAM SỐ
    end_date: dateRange.value.to       // ĐÚNG TÊN THAM SỐ
  };

  // Params cho hàm get_top_selling_products
  const topProductsParams = {
    p_start_date: dateRange.value.from, // ĐÚNG TÊN THAM SỐ
    p_end_date: dateRange.value.to     // ĐÚNG TÊN THAM SỐ
  };

  // Cập nhật displayPeriod dựa trên dateRange đã được tính toán hoặc nhập
  displayPeriod.value = `${qDate.formatDate(dateRange.value.from, 'DD/MM/YYYY')} - ${qDate.formatDate(dateRange.value.to, 'DD/MM/YYYY')}`;


  try {
    // Chạy song song hai yêu cầu RPC
    const [salesResponse, topProductsResponse] = await Promise.all([
      supabase.rpc('calculate_sales_in_period', salesParams),
      supabase.rpc('get_top_selling_products', topProductsParams)
    ]);

    // Xử lý kết quả tổng doanh thu
    if (salesResponse.error) throw salesResponse.error;
    salesData.value = salesResponse.data as number;

    // Xử lý kết quả sản phẩm bán chạy
    if (topProductsResponse.error) throw topProductsResponse.error;
    topSellingProducts.value = topProductsResponse.data as TopSellingProduct[];

  } catch (error: any) {
    console.error('Lỗi tải báo cáo:', error);
    // salesData và topSellingProducts đã được reset thành null ở trên
    $q.notify({
      color: 'negative',
      message: `Lỗi tải báo cáo: ${error.message || 'Lỗi không xác định'}`,
      icon: 'report_problem',
      position: 'top'
    });
  } finally {
    loading.value = false;
    topProductsLoading.value = false;
  }
}

onMounted(() => {
  calculateDateRange('today'); // Đặt ngày mặc định khi component được mount
  fetchSalesReport(); // Tải báo cáo cho ngày hôm nay khi trang được mở lần đầu
})

</script>

<style scoped>
.q-table th {
  font-weight: bold;
}
/* Thêm CSS nếu cần */
</style>
