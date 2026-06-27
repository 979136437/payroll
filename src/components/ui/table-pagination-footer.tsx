"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type TablePaginationFooterProps = {
  onPageIndexChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export function TablePaginationFooter({
  onPageIndexChange,
  onPageSizeChange,
  pageIndex,
  pageSize,
  totalCount,
  totalPages,
}: TablePaginationFooterProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-border/80 bg-background px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
      <div className="text-muted-foreground">
        第 {pageIndex + 1} / {totalPages} 页，共 {totalCount} 条
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>每页</span>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              onPageSizeChange(Number(value));
            }}
          >
            <SelectTrigger className="w-24 h-8 min-h-8 px-2.5 text-[0.8rem]">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>条</span>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={pageIndex === 0}
            onClick={() => onPageIndexChange(pageIndex - 1)}
          >
            <ChevronLeft className="size-4" />
            上一页
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pageIndex >= totalPages - 1}
            onClick={() => onPageIndexChange(pageIndex + 1)}
          >
            下一页
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
