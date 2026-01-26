'use client';

import { signIn, useSession } from "next-auth/react";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Globe, UserCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();

  const handleGuestLogin = () => {
    document.cookie = "guest-mode=true; path=/; max-age=86400";
    router.push('/');
    router.refresh();
  };

  useEffect(() => {
  if (status === "authenticated") {
    window.location.href = "/";
  }
}, [status]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl font-bold text-blue-600">Nexus Financial</CardTitle>
          <CardDescription>Kelola keuangan pribadi Anda dengan aman.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <Button 
            variant="outline" 
            className="w-full h-12 gap-3 font-semibold border-slate-200 hover:bg-slate-50 transition-colors"
            onClick={() => signIn('google', { callbackUrl: '/' })}
          >
            <Globe className="w-5 h-5 text-blue-500" /> Masuk dengan Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-medium">Atau coba dulu</span>
            </div>
          </div>

          <Button 
            variant="secondary" 
            className="w-full h-12 gap-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 shadow-sm"
            onClick={handleGuestLogin}
          >
            <UserCircle className="w-5 h-5 text-slate-500" /> Masuk sebagai Guest
          </Button>
          
          <div className="pt-2">
            <p className="text-[10px] text-center text-slate-400 leading-relaxed px-6">
              *Mode Guest menyimpan data secara lokal di browser ini. Data akan disinkronkan ke Cloud setelah Anda login permanen nanti.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}