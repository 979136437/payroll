import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";

import { PersonnelFormDialog } from "@/components/personnel/personnel-form-dialog";
import { toast } from "sonner";

describe("PersonnelFormDialog", () => {
  test("prefills editing record", () => {
    render(
      <PersonnelFormDialog
        open
        onOpenChange={vi.fn()}
        personnel={{
          id: 1,
          name: "张三",
          gender: "男",
          ethnicity: "汉",
          nativePlace: "四川",
          idCardNumber: "ID-1",
          payrollCardNumber: "CARD-1",
          bankName: "工行",
          jobType: "砌砖",
          startDate: "",
          endDate: "",
          phoneNumber: "13800000000",
          remark: "",
        }}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/姓名/)).toHaveValue("张三");
    expect(screen.getByLabelText(/性别/)).toHaveValue("男");
    expect(screen.getByLabelText(/身份证号码/)).toHaveValue("ID-1");
  });

  test("rejects blank name and submits valid form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <PersonnelFormDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(toast.error).toHaveBeenCalledWith("姓名不能为空");

    await user.type(screen.getByLabelText(/姓名/), "张三");
    await user.type(screen.getByLabelText(/联系电话/), "13800000000");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "张三",
          phoneNumber: "13800000000",
          jobType: "砌砖",
        })
      );
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  test("replaces draft immediately when editing another person", async () => {
    const user = userEvent.setup();
    const props = {
      open: true,
      onOpenChange: vi.fn(),
      onSubmit: vi.fn(),
    };
    const first = {
      id: 1,
      name: "张三",
      jobType: "砌砖",
    } as any;
    const second = {
      id: 2,
      name: "李四",
      jobType: "木工",
    } as any;
    const { rerender } = render(
      <PersonnelFormDialog {...props} personnel={first} />
    );

    await user.clear(screen.getByLabelText(/姓名/));
    await user.type(screen.getByLabelText(/姓名/), "未保存草稿");
    rerender(<PersonnelFormDialog {...props} personnel={second} />);

    expect(screen.getByLabelText(/姓名/)).toHaveValue("李四");
  });
});
