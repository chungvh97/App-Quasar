<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">Quản lý Sản phẩm</div>
      <q-btn
          color="primary"
          icon="add"
          label="Thêm Sản phẩm"
          @click="openAddProductDialog"
          :loading="loading"
      />
    </div>

    <q-table
        title="Danh sách Sản phẩm"
        :rows="products"
        :columns="columns"
        row-key="id"
        :loading="tableLoading"
        flat
        bordered
        separator="cell"
        class="q-mt-md"
    >
      <template v-slot:body-cell-price="props">
        <q-td :props="props">
          {{ props.value }} VNĐ </q-td>
      </template>

      <template v-slot:body-cell-is_active="props">
        <q-td :props="props">
          <q-chip
              :color="props.value ? 'green' : 'red'"
              text-color="white"
              dense
              class="text-weight-bolder"
              square
              size="sm"
          >
            {{ props.value ? 'Đang bán' : 'Ngừng bán' }}
          </q-chip>
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="q-gutter-xs">
          <q-btn
              dense
              round
              flat
              color="grey-8"
              @click="viewProduct(props.row)"
              icon="visibility"
              size="sm"
          >
            <q-tooltip delay-page>Xem chi tiết</q-tooltip>
          </q-btn>
          <q-btn
              dense
              round
              flat
              color="primary"
              @click="openEditProductDialog(props.row)"
              icon="edit"
              size="sm"
          >
            <q-tooltip delay-page>Sửa</q-tooltip>
          </q-btn>
          <q-btn
              dense
              round
              flat
              color="negative"
              @click="confirmDeleteProduct(props.row)"
              icon="delete"
              size="sm"
              :loading="props.row.id ===productIdBeingDeleted && loading"
          >
            <q-tooltip delay-page>Xóa</q-tooltip>
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

    <add-product-dialog
        v-model="showAddDialog"
        @product-added="handleProductAdded"
    />

    <edit-product-dialog
        v-if="selectedProduct"
        v-model="showEditDialog"
        :product-to-edit="selectedProduct"
        @product-updated="handleProductUpdated"
    />

  </q-page>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'; // Bỏ QTableProps
import AddProductDialog from '~/components/admin/products/AddProductDialog.vue';
import EditProductDialog from '~/components/admin/products/EditProductDialog.vue';

definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const supabase = useSupabase()
const $q = useQuasar()

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

// Định nghĩa interface cục bộ cho column
interface ProductTableColumn {
  name: string;
  label: string;
  field: string | ((row: Product) => any);
  required?: boolean;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  style?: string;
}

const products = ref<Product[]>([])
const loading = ref(false)
const tableLoading = ref(false)
const productIdBeingDeleted = ref<string | number | null>(null);

// Sử dụng interface cục bộ ProductTableColumn
const columns: ProductTableColumn[] = [
  { name: 'name', required: true, label: 'Tên Sản phẩm', align: 'left', field: (row: Product) => row.name, sortable: true, style: 'min-width: 200px; white-space: normal;' },
  { name: 'price', label: 'Giá', field: (row: Product) => row.price, sortable: true, align: 'right' },
  { name: 'category', label: 'Danh mục', field: (row: Product) => row.category || 'N/A', sortable: true, align: 'left', style: 'min-width: 150px;' },
  { name: 'is_active', label: 'Trạng thái', field: (row: Product) => row.is_active, sortable: true, align: 'center' },
  { name: 'actions', label: 'Hành động', field: 'actions', align: 'center', sortable: false, style: 'width: 150px;' }
];

const fetchProducts = async () => {
  tableLoading.value = true;
  try {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw error
    products.value = data || []
  } catch (error: any) {
    console.error('Error fetching products:', error.message)
    $q.notify({
      color: 'negative',
      message: `Lỗi tải danh sách sản phẩm: ${error.message}`,
      icon: 'report_problem',
      position: 'top-right'
    })
  } finally {
    tableLoading.value = false;
  }
}

// --- Add Product ---
const showAddDialog = ref(false)
const openAddProductDialog = () => {
  showAddDialog.value = true;
}
const handleProductAdded = () => {
  fetchProducts();
}

// --- Edit Product ---
const showEditDialog = ref(false)
const selectedProduct = ref<Product | null>(null)
const openEditProductDialog = (product: Product) => {
  selectedProduct.value = { ...product };
  showEditDialog.value = true;
}
const handleProductUpdated = () => {
  fetchProducts();
}

// --- View Product (Simple Dialog) ---
const viewProduct = (product: Product) => {
  $q.dialog({
    title: `<span class="text-weight-bold">Chi tiết: ${product.name}</span>`,
    message: `
      <div class="q-gutter-y-sm">
        <div><strong>ID:</strong> ${product.id}</div>
        <div><strong>Giá:</strong> ${product.price.toLocaleString('vi-VN')} VNĐ</div>
        <div><strong>Danh mục:</strong> ${product.category || 'N/A'}</div>
        <div><strong>Trạng thái:</strong>
          <span class="q-chip q-chip--dense q-chip--square text-white ${product.is_active ? 'bg-green' : 'bg-red'}">
            ${product.is_active ? 'Đang bán' : 'Ngừng bán'}
          </span>
        </div>
        <div><strong>Mô tả:</strong></div>
        <div style="white-space: pre-wrap; max-height: 200px; overflow-y: auto;">${product.description || 'Không có mô tả'}</div>
        ${product.image_url ? `<div><strong>Hình ảnh:</strong> <br/><img src="${product.image_url}" alt="Hình ảnh sản phẩm" style="max-width: 100%; max-height: 200px; border-radius: 4px; margin-top: 4px;" /></div>` : ''}
      </div>
    `,
    html: true,
    persistent: true,
    ok: {
      label: 'Đóng',
      flat: true,
      color: 'primary'
    }
  })
}

// --- Delete Product ---
const deleteProductActual = async (productId: string | number, productName: string) => {
  productIdBeingDeleted.value = productId;
  loading.value = true;
  try {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

    if (error) throw error

    $q.notify({
      color: 'positive',
      message: `Sản phẩm "${productName}" đã được xóa thành công!`,
      icon: 'check_circle',
      position: 'top-right'
    })
    fetchProducts()
  } catch (error: any) {
    console.error('Error deleting product:', error)
    $q.notify({
      color: 'negative',
      message: `Lỗi khi xóa sản phẩm: ${error.message}`,
      icon: 'report_problem',
      position: 'top-right'
    })
  } finally {
    loading.value = false;
    productIdBeingDeleted.value = null;
  }
}

const confirmDeleteProduct = (product: Product) => {
  $q.dialog({
    title: 'Xác nhận Xóa',
    message: `Bạn có chắc chắn muốn xóa sản phẩm "<strong>${product.name}</strong>" không? Hành động này không thể hoàn tác.`,
    html: true,
    cancel: {
      label: 'Hủy',
      color: 'grey-7',
      flat: true
    },
    ok: {
      label: 'Xóa',
      color: 'negative',
      unelevated: true
    },
    persistent: true
  }).onOk(async () => {
    await deleteProductActual(product.id, product.name);
  })
}

onMounted(() => {
  fetchProducts()
})
</script>
<style scoped>
/* Thêm style nếu cần */
.q-table th {
  font-weight: bold;
}
</style>
