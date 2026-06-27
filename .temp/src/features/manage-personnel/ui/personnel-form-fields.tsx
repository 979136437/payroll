import type { UseFormReturn } from "react-hook-form"

import type { CreatePersonnelValues } from "@/features/manage-personnel/model/schema"
import { SelectField } from "@/shared/ui/select-field"
import { Field } from "@/shared/ui/workspace-primitives"

const inputClassName =
  "h-10 w-full cursor-text rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"

const textareaClassName =
  "min-h-[88px] w-full resize-none cursor-text rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"

const genderOptions = [
  { label: "男", value: "男" },
  { label: "女", value: "女" },
]

type PersonnelFormFieldsProps = {
  form: UseFormReturn<CreatePersonnelValues>
  selectedGender: string
}

export function PersonnelFormFields({
  form,
  selectedGender,
}: PersonnelFormFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="姓名 *" error={form.formState.errors.name?.message}>
        <input
          {...form.register("name")}
          className={inputClassName}
          placeholder="例如：张三"
        />
      </Field>

      <Field label="性别">
        <SelectField
          onChange={(nextValue) =>
            form.setValue("gender", nextValue as "男" | "女" | "")
          }
          options={genderOptions}
          placeholder="请选择性别"
          value={selectedGender}
        />
      </Field>

      <Field label="民族">
        <input
          {...form.register("ethnicity")}
          className={inputClassName}
          placeholder="例如：汉"
        />
      </Field>

      <div className="hidden md:block" aria-hidden="true" />

      <div className="md:col-span-2">
        <Field label="籍贯">
          <textarea
            {...form.register("nativePlace")}
            rows={3}
            className={textareaClassName}
            placeholder="例如：河北石家庄"
          />
        </Field>
      </div>

      <Field label="身份证号码">
        <input
          {...form.register("idCardNumber")}
          className={inputClassName}
          placeholder="例如：130000199901010001"
        />
      </Field>

      <Field label="工资卡号">
        <input
          {...form.register("payrollCardNumber")}
          className={inputClassName}
          placeholder="例如：622200000000000001"
        />
      </Field>

      <Field label="开户行">
        <input
          {...form.register("bankName")}
          className={inputClassName}
          placeholder="例如：中国建设银行"
        />
      </Field>

      <Field label="联系电话">
        <input
          {...form.register("phoneNumber")}
          className={inputClassName}
          placeholder="例如：13800000000"
        />
      </Field>
    </div>
  )
}
