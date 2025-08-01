<template>
  <q-dialog :model-value="modelValue" @update:model-value="updateDialogState" persistent>
    <q-card style="width: 700px; max-width: 80vw;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Thêm Sản phẩm Mới</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="closeDialog" />
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="handleSubmit" class="q-gutter-md">
          <q-input
              v-model="productForm.name"
              label="Tên Sản phẩm *"
              filled
              lazy-rules
              :rules="[val => (val && val.length > 0) || 'Vui lòng nhập tên sản phẩm']"
          />
          <q-input
              v-model.number="productForm.price"
              label="Giá (VNĐ) *"
              type="number"
              filled
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
              autogrow
          />
          <q-input
              v-model="productForm.category"
              label="Danh mục"
              filled
          />

          <q-file
              v-model="selectedImageFile"
              label="Chọn hình ảnh sản phẩm"
              filled
              accept="image/jpeg, image/png, image/gif, image/webp"
              max-file-size="2097152" @rejected="(rejectedEntries) => $q.notify({ type: 'negative', message: `File quá lớn hoặc sai định dạng. Tối đa 2MB. Lỗi: ${rejectedEntries[0].failedPropValidation}` })"
              @update:model-value="handleFileSelection"
              clearable
          >
            <template v-slot:prepend>
              <q-icon name="attach_file" />
            </template>
            <template v-slot:append v-if="selectedImageFile">
              <q-btn icon="cancel" @click.stop.prevent="clearSelectedFile" flat round dense />
            </template>
            <template v-slot:hint>
              Tối đa 2MB. Định dạng: JPG, PNG, GIF, WEBP.
            </template>
          </q-file>

          <div v-if="imagePreviewUrl" class="q-mt-sm text-center">
            <q-img
                :src="imagePreviewUrl"
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
            <q-btn label="Hủy" type="button" color="grey" flat @click="closeDialog" class="q-mr-sm" :disable="loading" />
            <q-btn label="Thêm Sản phẩm" type="submit" color="primary" :loading="loading" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useQuasar } from 'quasar'

interface ProductFormData {
  name: string;
  price: number | null;
  description: string | null;
  category: string | null;
  is_active: boolean;
}

const props = defineProps<{
  modelValue: boolean;
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'product-added'): void;
}>()

const supabase = useSupabase()
const $q = useQuasar()

const initialFormState: ProductFormData = {
  name: '',
  price: null,
  description: null,
  category: null,
  is_active: true,
}
const productForm = ref<ProductFormData>({ ...initialFormState })
const loading = ref(false)

const selectedImageFile = ref<File | null>(null)
const imagePreviewUrl = ref<string | null>(null)

const clearSelectedFile = () => {
  selectedImageFile.value = null;
  if (imagePreviewUrl.value && imagePreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreviewUrl.value);
  }
  imagePreviewUrl.value = null;
}

const updateDialogState = (value: boolean) => {
  emit('update:modelValue', value)
  if (!value) { // Nếu dialog đóng, reset file và preview
    clearSelectedFile();
  }
}

const closeDialog = () => {
  updateDialogState(false)
}

const resetForm = () => {
  productForm.value = { ...initialFormState }
  clearSelectedFile();
}

const handleFileSelection = (file: File | null) => {
  // Clear previous preview if any
  if (imagePreviewUrl.value && imagePreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreviewUrl.value);
  }

  selectedImageFile.value = file;
  if (file) {
    imagePreviewUrl.value = URL.createObjectURL(file);
  } else {
    imagePreviewUrl.value = null;
  }
}

// HÀM LÀM SẠCH TÊN FILE
const sanitizeFileName = (name: string): string => {
  let sanitized = name.replace(/\s+/g, '_'); // Thay thế khoảng trắng
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, ''); // Loại bỏ ký tự đặc biệt không mong muốn

  // Tách tên và phần mở rộng
  const nameParts = sanitized.split('.');
  let extension = '';
  if (nameParts.length > 1) {
    extension = '.' + nameParts.pop()?.toLowerCase(); // Lấy phần mở rộng cuối cùng và chuyển chữ thường
    sanitized = nameParts.join('.'); // Nối lại phần tên nếu tên có nhiều dấu chấm
  }

  sanitized = sanitized.replace(/\.+/g, '.').replace(/^\.|\.$/g, ''); // Tránh nhiều dấu chấm, dấu chấm ở đầu/cuối phần tên

  if (!sanitized && extension) { // Nếu phần tên rỗng sau khi làm sạch (ví dụ: file ".png")
    sanitized = 'untitled_file'; // Đặt tên mặc định
  } else if (!sanitized && !extension) { // Nếu cả tên và phần mở rộng đều rỗng (tên file rất kỳ lạ)
    return `default_filename_${Date.now()}`; // Trả về một tên hoàn toàn mặc định
  }

  return sanitized + extension;
};


const handleSubmit = async () => {
  loading.value = true;
  let uploadedImageUrl: string | null = null;

  try {
    if (selectedImageFile.value) {
      const file = selectedImageFile.value;

      const sanitizedOriginalName = sanitizeFileName(file.name);
      if (!sanitizedOriginalName || sanitizedOriginalName.startsWith('.')) { // Kiểm tra kỹ hơn
        throw new Error('Tên file không hợp lệ sau khi làm sạch hoặc chỉ chứa phần mở rộng.');
      }

      const fileName = `${Date.now()}-${sanitizedOriginalName}`;
      // Đường dẫn trong bucket, không cần dấu / ở đầu
      // Ví dụ: '1678886400000-tra_sua_tran_chau.jpg'
      const filePath = fileName;

      console.log('Uploading file with path:', filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images') // Tên bucket của bạn
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false // true nếu muốn ghi đè file cùng tên
          });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(`Lỗi tải ảnh lên: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        // Nếu file được upload vào thư mục con, ví dụ 'public/', thì getPublicUrl cần đường dẫn đầy đủ 'public/' + filePath
        throw new Error('Không thể lấy được URL public của ảnh sau khi upload.');
      }
      uploadedImageUrl = publicUrlData.publicUrl;
    }

    const productToInsert = {
      name: productForm.value.name,
      price: productForm.value.price,
      description: productForm.value.description || null,
      category: productForm.value.category || null,
      image_url: uploadedImageUrl,
      is_active: productForm.value.is_active,
    };

    const { data: productData, error: insertError } = await supabase
        .from('products')
        .insert(productToInsert)
        .select()
        .single();

    if (insertError) throw insertError;

    $q.notify({
      color: 'positive',
      message: `Sản phẩm "${productData?.name || productForm.value.name}" đã được thêm thành công!`,
      icon: 'check_circle',
      position: 'top'
    });
    emit('product-added');
    closeDialog();

  } catch (error: any) {
    console.error('Error adding product with image:', error);
    $q.notify({
      color: 'negative',
      message: error.message || 'Lỗi khi thêm sản phẩm.',
      icon: 'report_problem',
      position: 'top'
    });
  } finally {
    loading.value = false;
  }
};

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    resetForm();
  } else {
    // Thu hồi Object URL để tránh memory leak khi dialog đóng và preview không còn cần nữa
    if (imagePreviewUrl.value && imagePreviewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl.value);
    }
    imagePreviewUrl.value = null;
    // selectedImageFile không cần reset ở đây vì resetForm đã làm hoặc updateDialogState làm
  }
});

</script>
