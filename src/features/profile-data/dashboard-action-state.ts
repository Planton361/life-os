export type DashboardActionState = {
  status: "idle" | "success" | "blocked" | "error";
  message: string;
};

export const initialDashboardActionState: DashboardActionState = {
  message: "",
  status: "idle",
};
