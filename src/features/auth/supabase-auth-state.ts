export type SupabaseAuthActionState = {
  message: string;
  status: "idle" | "error" | "success";
};

export const initialSupabaseAuthActionState: SupabaseAuthActionState = {
  message: "",
  status: "idle",
};
