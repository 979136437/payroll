<script setup lang="ts">
import type { Personnel, CreatePersonnelInput } from '~/types'

interface Props {
  initialPersonnel?: Personnel | null
  isBusy?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialPersonnel: null,
  isBusy: false,
})

const emit = defineEmits<{
  submit: [payload: CreatePersonnelInput]
}>()

const isEdit = computed(() => !!props.initialPersonnel)

const form = reactive<CreatePersonnelInput>({
  name: '',
  gender: null,
  ethnicity: null,
  nativePlace: null,
  idCardNumber: null,
  payrollCardNumber: null,
  bankName: null,
  jobType: null,
  startDate: null,
  endDate: null,
  phoneNumber: null,
  remark: null,
})

watch(
  () => props.initialPersonnel,
  (val) => {
    if (val) {
      form.name = val.name
      form.gender = val.gender
      form.ethnicity = val.ethnicity
      form.nativePlace = val.nativePlace
      form.idCardNumber = val.idCardNumber
      form.payrollCardNumber = val.payrollCardNumber
      form.bankName = val.bankName
      form.jobType = val.jobType
      form.startDate = val.startDate
      form.endDate = val.endDate
      form.phoneNumber = val.phoneNumber
      form.remark = val.remark
    } else {
      form.name = ''
      form.gender = null
      form.ethnicity = null
      form.nativePlace = null
      form.idCardNumber = null
      form.payrollCardNumber = null
      form.bankName = null
      form.jobType = null
      form.startDate = null
      form.endDate = null
      form.phoneNumber = null
      form.remark = null
    }
  },
  { immediate: true },
)

const handleSubmit = () => {
  if (!form.name.trim()) {
    alert('请输入姓名')
    return
  }
  emit('submit', { ...form })
}

const genderOptions = [
  { value: '男', label: '男' },
  { value: '女', label: '女' },
]
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          姓名 <span class="text-red-500">*</span>
        </label>
        <input
          v-model="form.name"
          type="text"
          placeholder="请输入姓名"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="isBusy"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          性别
        </label>
        <select
          v-model="form.gender"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="isBusy"
        >
          <option :value="null">请选择</option>
          <option v-for="opt in genderOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          民族
        </label>
        <input
          v-model="form.ethnicity"
          type="text"
          placeholder="请输入民族"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="isBusy"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          籍贯
        </label>
        <input
          v-model="form.nativePlace"
          type="text"
          placeholder="请输入籍贯"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="isBusy"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          身份证号码
        </label>
        <input
          v-model="form.idCardNumber"
          type="text"
          placeholder="请输入身份证号码"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="isBusy"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          工资卡号
        </label>
        <input
          v-model="form.payrollCardNumber"
          type="text"
          placeholder="请输入工资卡号"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="isBusy"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          开户行
        </label>
        <input
          v-model="form.bankName"
          type="text"
          placeholder="请输入开户行"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="isBusy"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          工种
        </label>
        <input
          v-model="form.jobType"
          type="text"
          placeholder="请输入工种"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="isBusy"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          上场时间
        </label>
        <input
          v-model="form.startDate"
          type="date"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="isBusy"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          撤场时间
        </label>
        <input
          v-model="form.endDate"
          type="date"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="isBusy"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          联系电话
        </label>
        <input
          v-model="form.phoneNumber"
          type="tel"
          placeholder="请输入联系电话"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="isBusy"
        />
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        备注
      </label>
      <textarea
        v-model="form.remark"
        rows="3"
        placeholder="请输入备注信息"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        :disabled="isBusy"
      />
    </div>

    <div class="flex justify-end gap-3 pt-2">
      <button
        type="submit"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        :disabled="isBusy"
      >
        {{ isBusy ? '提交中...' : (isEdit ? '保存修改' : '创建') }}
      </button>
    </div>
  </form>
</template>
