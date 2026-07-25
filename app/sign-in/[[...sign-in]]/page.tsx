import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <main className="grid min-h-svh place-items-center bg-black px-4 py-10">
      <div className="grid gap-4">
        <SignIn fallbackRedirectUrl="/dashboard" signUpUrl="/sign-up" />
        <div className="rounded-lg border border-white/[.1] bg-white/[.04] p-4 text-center">
          <p className="text-sm text-zinc-300">No account found. Create one?</p>
          <Button asChild className="mt-3 w-full bg-violet-500 text-white hover:bg-violet-400">
            <Link href="/sign-up">Sign Up</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
