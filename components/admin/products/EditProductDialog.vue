<template>
  <q-dialog :model-value="modelValue" @update:model-value="updateDialogState" persistent>
    <q-card style="width: 700px; max-width: 80vw;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Chỉnh Sửa Sản phẩm</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="closeDialog" />
      </q-card-section>

      <q-card-section v-if="productToEdit && productForm">
        <q-form @submit.prevent="handleSubmit" class="q-gutter-md">
          <q-input
              v-model="productForm.name"
              label="Tên Sản phẩm *"
              filled
              dense
              lazy-rules
              :rules="[val => (val && val.length > 0) || 'Vui lòng nhập tên sản phẩm']"
          />
          <q-input
              v-model.number="productForm.price"
              label="Giá (VNĐ) *"
              type="number"
              filled
              dense
              lazy-rules
              :rules="[
              val => (val !== null && val !== undefined && val !== '') || 'Vui lòng nhập giá',
              val => val > 0 || 'Giá phải lớn hơn 0'
            ]"
          />
          <q-input
              v-model="productForm.description"
              label="Mô tả"
              type="textarea"
              filled
              dense
              autogrow
          />
          <q-input
              v-model="productForm.category"
              label="Danh mục"
              filled
              dense
          />

          <div class="text-subtitle2 q-mt-md">Hình ảnh sản phẩm</div>
          <div v-if="currentImageUrl && !newImagePreviewUrl && !imageMarkedForRemoval" class="q-mb-sm text-center">
            <q-img
                :src="currentImageUrl"
                spinner-color="white"
                style="height: 140px; max-width: 150px; border: 1px solid #ddd; border-radius: 4px;"
                fit="contain"
            />
            <div>Ảnh hiện tại</div>
            <q-btn
                label="Xóa ảnh hiện tại"
                icon="delete_outline"
                color="negative"
                flat
                dense
                size="sm"
                @click="confirmRemoveCurrentImage"
                class="q-ml-sm q-mt-xs"
                v-if="!selectedImageFile"
            />
          </div>
          <div v-if="imageMarkedForRemoval && !selectedImageFile" class="q-mb-sm text-center text-grey-7">
            <em>Ảnh hiện tại sẽ bị xóa khi lưu.</em>
          </div>


          <q-file
              v-model="selectedImageFile"
              label="Chọn ảnh mới (để thay thế hoặc thêm mới)"
              filled
              dense
              accept="image/jpeg, image/png, image/gif, image/webp"
              max-file-size="2097152" @rejected="(rejectedEntries) => $q.notify({ type: 'negative', message: `File quá lớn hoặc sai định dạng. Tối đa 2MB. Lỗi: ${rejectedEntries[0].failedPropValidation}` })"
              @update:model-value="handleFileSelection"
              clearable
          >
            <template v-slot:prepend>
              <q-icon name="attach_file" />
            </template>
            <template v-slot:append v-if="selectedImageFile">
              <q-btn icon="cancel" @click.stop.prevent="clearNewSelectedFile" flat round dense />
            </template>
            <template v-slot:hint>
              Để trống nếu không muốn thay đổi ảnh. Tối đa 2MB.
            </template>
          </q-file>

          <div v-if="newImagePreviewUrl" class="q-mt-sm text-center">
            <q-img
                :src="newImagePreviewUrl"
                spinner-color="white"
                style="height: 140px; max-width: 150px; border: 1px solid #ddd; border-radius: 4px;"
                fit="contain"
            />
            <div>Xem trước ảnh mới</div>
          </div>

          <q-toggle
              v-model="productForm.is_active"
              label="Đang bán?"
              left-label
          />

          <div class="row justify-end q-mt-md">
            <q-btn label="Hủy" type="button" color="grey" flat @click="closeDialog" class="q-mr-sm" :disable="loading"/>
            <q-btn label="Lưu Thay Đổi" type="submit" color="primary" :loading="loading" />
          </div>
        </q-form>
      </q-card-section>
      <q-card-section v-else class="text-center q-pa-xl">
        <q-spinner color="primary" size="3em" />
        <p>Đang tải dữ liệu sản phẩm...</p>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { PropType } from 'vue'
import { useQuasar } from 'quasar'

interface ProductForProp {
  id: string | number;
  created_at?: string;
  name: string;
  price: number;
  description?: string | null;
  image_url?: string | null;
  category?: string | null;
  is_active: boolean;
}

interface ProductEditFormData {
  name: string;
  price: number | null;
  description: string | null;
  category: string | null;
  is_active: boolean;
}

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  productToEdit: {
    type: Object as PropType<ProductForProp | null>,
    default: null
  }
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'product-updated'): void;
}>()

const supabase = useSupabase()
const $q = useQuasar()

const productForm = ref<ProductEditFormData>({
  name: '',
  price: null,
  description: null,
  category: null,
  is_active: true,
})
const loading = ref(false)
const currentProductId = ref<string | number | null>(null)
const currentImageUrl = ref<string | null>(null)
const imageMarkedForRemoval = ref(false)

const selectedImageFile = ref<File | null>(null)
const newImagePreviewUrl = ref<string | null>(null)

const sanitizeFileName = (name: string): string => {
  let sanitized = name.replace(/\s+/g, '_');
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '');
  const nameParts = sanitized.split('.');
  let extension = '';
  if (nameParts.length > 1) {
    extension = '.' + nameParts.pop()?.toLowerCase();
    sanitized = nameParts.join('.');
  }
  sanitized = sanitized.replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
  if (!sanitized && extension) {
    sanitized = 'untitled_file';
  } else if (!sanitized && !extension) {
    return `default_filename_${Date.now()}`;
  }
  return sanitized + extension;
};

const clearNewSelectedFile = () => {
  selectedImageFile.value = null;
  if (newImagePreviewUrl.value && newImagePreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(newImagePreviewUrl.value);
  }
  newImagePreviewUrl.value = null;
}

const updateDialogState = (value: boolean) => {
  emit('update:modelValue', value)
  if (!value) {
    clearNewSelectedFile();
    imageMarkedForRemoval.value = false;
  }
}

const closeDialog = () => {
  updateDialogState(false)
}

const populateForm = (product: ProductForProp | null) => {
  clearNewSelectedFile();
  imageMarkedForRemoval.value = false;
  if (product) {
    currentProductId.value = product.id;
    productForm.value = {
      name: product.name,
      price: product.price,
      description: product.description ?? null,
      category: product.category ?? null,
      is_active: product.is_active,
    };
    currentImageUrl.value = product.image_url ?? null;
  } else {
    currentProductId.value = null;
    productForm.value = { name: '', price: null, description: null, category: null, is_active: true };
    currentImageUrl.value = null;
  }
}

const handleFileSelection = (file: File | null) => {
  if (newImagePreviewUrl.value && newImagePreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(newImagePreviewUrl.value);
  }
  selectedImageFile.value = file;
  if (file) {
    newImagePreviewUrl.value = URL.createObjectURL(file);
    imageMarkedForRemoval.value = false; // Nếu chọn file mới, bỏ đánh dấu xóa ảnh cũ
  } else {
    newImagePreviewUrl.value = null;
  }
}

const confirmRemoveCurrentImage = () => {
  $q.dialog({
    title: 'Xác nhận Xóa Ảnh',
    message: 'Bạn có chắc chắn muốn xóa hình ảnh hiện tại của sản phẩm này không? Hành động này sẽ được áp dụng khi bạn lưu thay đổi.',
    cancel: { label: 'Hủy', color: 'grey', flat: true },
    ok: { label: 'Đồng ý Xóa Ảnh', color: 'negative' },
    persistent: true
  }).onOk(() => {
    imageMarkedForRemoval.value = true;
    // currentImageUrl.value = null; // Không ẩn preview ngay, chỉ đánh dấu để xử lý khi submit
    selectedImageFile.value = null; // Nếu đang chọn file mới thì hủy chọn file mới
    if (newImagePreviewUrl.value && newImagePreviewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(newImagePreviewUrl.value);
    }
    newImagePreviewUrl.value = null;
    $q.notify({ type: 'info', message: 'Ảnh hiện tại sẽ được xóa khi bạn nhấn "Lưu Thay Đổi".', position: 'top' });
  });
}

const deleteImageFromStorage = async (imageUrl: string | null): Promise<boolean> => {
  if (!imageUrl) {
    console.log('[Delete Storage] No image URL provided to delete.');
    return false;
  }
  console.log('[Delete Storage] Received URL to delete:', imageUrl);
  try {
    const url = new URL(imageUrl);
    const pathSegments = decodeURIComponent(url.pathname).split('/');
    const bucketName = 'product-images'; // Tên bucket của bạn

    let bucketNameIndex = -1;
    for (let i = 0; i < pathSegments.length; i++) {
      if (pathSegments[i] === bucketName) {
        bucketNameIndex = i;
        break;
      }
    }
    console.log('[Delete Storage] Path segments:', pathSegments, 'Bucket name index:', bucketNameIndex);

    if (bucketNameIndex > -1 && bucketNameIndex < pathSegments.length - 1) {
      const storagePath = pathSegments.slice(bucketNameIndex + 1).join('/');
      if (storagePath) {
        console.log('[Delete Storage] Attempting to delete image from storage (path):', storagePath);
        const { error: deleteError } = await supabase.storage
            .from(bucketName)
            .remove([storagePath]);
        if (deleteError) {
          console.error('[Delete Storage] Error deleting image from storage:', deleteError);
          $q.notify({ type: 'warning', message: `Không thể xóa ảnh "${storagePath}" khỏi storage: ${deleteError.message}`, position: 'top', timeout: 7000, closeBtn: true });
          return false; // Xóa thất bại
        } else {
          console.log('[Delete Storage] Successfully attempted to delete image from storage:', storagePath);
          return true; // Xóa (hoặc lệnh chạy không lỗi) thành công
        }
      } else {
        console.warn('[Delete Storage] Derived storagePath is empty for URL:', imageUrl);
      }
    } else {
      console.warn('[Delete Storage] Could not determine image path from URL. Bucket name not found or path is too short. URL:', imageUrl);
    }
  } catch (e) {
    console.warn('[Delete Storage] Error parsing image URL or during deletion process:', imageUrl, e);
  }
  return false; // Mặc định là xóa thất bại nếu có lỗi hoặc không tìm thấy path
};


const handleSubmit = async () => {
  if (!currentProductId.value) {
    $q.notify({ color: 'negative', message: 'Không tìm thấy ID sản phẩm để cập nhật.', position: 'top' });
    return;
  }
  if (productForm.value.price === null || productForm.value.price <=0 ) {
    $q.notify({ color: 'negative', message: 'Giá sản phẩm không hợp lệ.', position: 'top' });
    return;
  }


  loading.value = true;
  let finalImageUrl: string | null = currentImageUrl.value; // Giữ URL ảnh hiện tại làm mặc định

  try {
    // Trường hợp 1: Người dùng chọn xóa ảnh hiện tại và KHÔNG chọn ảnh mới
    if (imageMarkedForRemoval.value && !selectedImageFile.value) {
      if (currentImageUrl.value) {
        await deleteImageFromStorage(currentImageUrl.value);
      }
      finalImageUrl = null;
    }

    // Trường hợp 2: Người dùng chọn một file ảnh MỚI
    if (selectedImageFile.value) {
      const file = selectedImageFile.value;
      const sanitizedOriginalName = sanitizeFileName(file.name);
      if (!sanitizedOriginalName || sanitizedOriginalName.startsWith('.')) {
        throw new Error('Tên file mới không hợp lệ sau khi làm sạch.');
      }
      const newFileName = `${Date.now()}-${sanitizedOriginalName}`;
      const newFilePath = newFileName;

      console.log('Uploading new file with path:', newFilePath);
      const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(newFilePath, file, { upsert: true });

      if (uploadError) throw new Error(`Lỗi tải ảnh mới lên: ${uploadError.message}`);

      const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(newFilePath);
      if (!publicUrlData?.publicUrl) throw new Error('Không thể lấy được URL public của ảnh mới.');

      const newUploadedImageUrl = publicUrlData.publicUrl;

      // Nếu có ảnh cũ và nó khác ảnh mới, xóa ảnh cũ
      if (currentImageUrl.value && currentImageUrl.value !== newUploadedImageUrl) {
        await deleteImageFromStorage(currentImageUrl.value);
      }
      finalImageUrl = newUploadedImageUrl;
    }

    // Cập nhật thông tin sản phẩm trong CSDL
    const productUpdates = {
      name: productForm.value.name,
      price: productForm.value.price,
      description: productForm.value.description || null,
      category: productForm.value.category || null,
      is_active: productForm.value.is_active,
      image_url: finalImageUrl,
    };

    const { data, error } = await supabase
        .from('products')
        .update(productUpdates)
        .eq('id', currentProductId.value)
        .select()
        .single();

    if (error) throw error;

    $q.notify({
      color: 'positive',
      message: `Sản phẩm "${data?.name || productForm.value.name}" đã được cập nhật!`,
      icon: 'check_circle',
      position: 'top'
    });
    emit('product-updated');
    closeDialog();

  } catch (error: any) {
    console.error('Error updating product:', error);
    $q.notify({
      color: 'negative',
      message: error.message || 'Lỗi khi cập nhật sản phẩm.',
      icon: 'report_problem',
      position: 'top'
    });
  } finally {
    loading.value = false;
  }
};

watch(() => props.productToEdit, (newProduct) => {
  if (props.modelValue && newProduct) {
    populateForm(newProduct);
  }
}, { immediate: true, deep: true });

watch(() => props.modelValue, (isDialogVisible) => {
  if (isDialogVisible && props.productToEdit) {
    populateForm(props.productToEdit);
  } else if (!isDialogVisible) {
    clearNewSelectedFile();
    imageMarkedForRemoval.value = false;
  }
});

</script>
