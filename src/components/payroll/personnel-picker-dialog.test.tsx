import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";

import { PersonnelPickerDialog } from "@/components/payroll/personnel-picker-dialog";
import { personnelApi } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  personnelApi: {
    list: vi.fn(),
  },
  payrollApi: {},
}));

describe("PersonnelPickerDialog", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("loads available personnel, filters existing ids and submits selected ids", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    vi.mocked(personnelApi.list).mockResolvedValue([
      { id: 1, name: "张三", idCardNumber: "ID-1" },
      { id: 2, name: "李四", idCardNumber: "ID-2" },
      { id: 3, name: "王五", idCardNumber: "ID-3" },
    ] as any);

    render(
      <PersonnelPickerDialog
        open
        onOpenChange={vi.fn()}
        existingPersonnelIds={[1]}
        onConfirm={onConfirm}
      />
    );

    expect(await screen.findByText("李四")).toBeInTheDocument();
    expect(screen.queryByText("张三")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /添加/ })[0]);

    await user.type(screen.getAllByPlaceholderText("可留空")[0], "500");
    await user.click(screen.getByRole("button", { name: "加入当前工资表" }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        personnelIds: [2],
        defaultNetPay: 500,
        perPersonNetPay: { 2: 500 },
      });
    });
  });
});
