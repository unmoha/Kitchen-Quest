import { PreviewNotice } from "@/components/ui/page-states";

export function SupabaseSetupNotice() {
    return (
        <section className="w-full max-w-xl rounded-lg border border-[#e7e3d9] bg-white p-5 sm:p-8">
            <h1 className="display-font text-3xl text-[#254235]">Connect Kitchen Quest to Supabase.</h1>
            <p className="mt-3 text-sm leading-6 text-[#59675c]">
                Live content and account features need a Supabase project. Add its URL and publishable key to your local environment, then restart the app.
            </p>
            <div className="mt-5">
                <PreviewNotice>Required variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. See .env.example. No credentials are stored in this repository.</PreviewNotice>
            </div>
        </section>
    );
}