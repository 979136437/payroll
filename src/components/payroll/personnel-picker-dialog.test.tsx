import userEvent from "@testing-library/user-event";
import { act, render, screen, waitFor } from "@testing-library/react";

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
    expect(
      screen.getByRole("searchbox", { name: "搜索待添加人员" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "添加 李四" }));
    expect(
      screen.getByRole("spinbutton", { name: "李四的实发工资" })
    ).toBeInTheDocument();

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

  test("ignores a response from an earlier dialog opening", async () => {
    let resolveFirst!: (value: any[]) => void;
    let resolveSecond!: (value: any[]) => void;
    vi.mocked(personnelApi.list)
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveFirst = resolve;
        })
      )
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveSecond = resolve;
        })
      );

    const props = {
      onOpenChange: vi.fn(),
      existingPersonnelIds: [],
      onConfirm: vi.fn().mockResolvedValue(undefined),
    };
    const { rerender } = render(<PersonnelPickerDialog open {...props} />);
    await waitFor(() => expect(personnelApi.list).toHaveBeenCalledTimes(1));

    rerender(<PersonnelPickerDialog open={false} {...props} />);
    rerender(<PersonnelPickerDialog open {...props} />);
    await waitFor(() => expect(personnelApi.list).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveSecond([{ id: 2, name: "李四" }]);
    });
    expect(await screen.findByText("李四")).toBeInTheDocument();

    await act(async () => {
      resolveFirst([{ id: 1, name: "张三" }]);
    });
    expect(screen.getByText("李四")).toBeInTheDocument();
    expect(screen.queryByText("张三")).not.toBeInTheDocument();
  });

  test("clears stale personnel and shows an alert when reloading fails", async () => {
    vi.mocked(personnelApi.list)
      .mockResolvedValueOnce([{ id: 1, name: "张三" }] as any)
      .mockRejectedValueOnce(new Error("请求失败"));

    const props = {
      onOpenChange: vi.fn(),
      existingPersonnelIds: [],
      onConfirm: vi.fn().mockResolvedValue(undefined),
    };
    const { rerender } = render(<PersonnelPickerDialog open {...props} />);
    expect(await screen.findByText("张三")).toBeInTheDocument();

    rerender(<PersonnelPickerDialog open={false} {...props} />);
    rerender(<PersonnelPickerDialog open {...props} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "人员列表加载失败，请稍后重试"
    );
    expect(screen.queryByText("张三")).not.toBeInTheDocument();
  });

  test("keeps the dialog open and preserves selections when submission fails", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn().mockRejectedValue(new Error("添加失败"));
    vi.mocked(personnelApi.list).mockResolvedValue([
      { id: 1, name: "张三" },
    ] as any);

    render(
      <PersonnelPickerDialog
        open
        onOpenChange={onOpenChange}
        existingPersonnelIds={[]}
        onConfirm={onConfirm}
      />
    );
    expect(await screen.findByText("张三")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /添加/ }));
    await user.click(screen.getByRole("button", { name: "加入当前工资表" }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByText("张三")).toBeInTheDocument();
  });

  test("prevents closing while submission is in progress", async () => {
    const user = userEvent.setup();
    let resolveConfirm!: () => void;
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn(
      () => new Promise<void>((resolve) => {
        resolveConfirm = resolve;
      })
    );
    vi.mocked(personnelApi.list).mockResolvedValue([
      { id: 1, name: "张三" },
    ] as any);

    render(
      <PersonnelPickerDialog
        open
        onOpenChange={onOpenChange}
        existingPersonnelIds={[]}
        onConfirm={onConfirm}
      />
    );
    expect(await screen.findByText("张三")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "添加 张三" }));
    await user.click(screen.getByRole("button", { name: "加入当前工资表" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));

    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    await act(async () => {
      resolveConfirm();
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  test("does not let an earlier submission close a reopened dialog", async () => {
    const user = userEvent.setup();
    let resolveConfirm!: () => void;
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn(
      () => new Promise<void>((resolve) => {
        resolveConfirm = resolve;
      })
    );
    vi.mocked(personnelApi.list).mockResolvedValue([
      { id: 1, name: "张三" },
    ] as any);
    const props = {
      onOpenChange,
      existingPersonnelIds: [],
      onConfirm,
    };

    const { rerender } = render(<PersonnelPickerDialog open {...props} />);
    expect(await screen.findByText("张三")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "添加 张三" }));
    await user.click(screen.getByRole("button", { name: "加入当前工资表" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));

    rerender(<PersonnelPickerDialog open={false} {...props} />);
    rerender(<PersonnelPickerDialog open {...props} />);
    expect(await screen.findByText("张三")).toBeInTheDocument();

    await act(async () => {
      resolveConfirm();
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
