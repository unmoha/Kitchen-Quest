export interface ProfileActionState {
    kind: "idle" | "success" | "error";
    message: string;
}

export const initialProfileActionState: ProfileActionState = {
    kind: "idle",
    message: "",
};