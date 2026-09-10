"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChoiceSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

// 公共业务表单只需字符串选项，统一组合现有 Select，保持标签与键盘行为一致。
export function ChoiceSelect({ label, value, options, onChange, disabled, className, id }: ChoiceSelectProps) {
  return (
    <Select value={value || null} items={options} disabled={disabled} onValueChange={(next) => onChange(next ?? "")}>
      <SelectTrigger id={id} aria-label={label} className={className}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
