'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Wallet, 
  History, 
  PiggyBank, 
  FileText, 
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  LogOut,
  User,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { useFinancial } from '@/lib/financial-context';
import DashboardTab from '@/components/tabs/DashboardTab';
import RiwayatTransaksiTab from '@/components/tabs/RiwayatTransaksiTab';
import TabunganTab from '@/components/tabs/TabunganTab';
import FileTab from '@/components/tabs/FileTab';
import TransaksiDialog from '@/components/dialogs/TransaksiDialog';
import { usePWA } from '@/hooks/usePWA'
import PlatformBadge from '@/components/PlatformBadge';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

export default function KeuanganPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showTransaksiDialog, setShowTransaksiDialog] = useState(false);
  const { data: session } = useSession();
  const { tabungan, transaksi, refreshTabungan, refreshTransaksi, isOnline } = useFinancial();
  const { canInstall, installPWA } = usePWA();
  const totalSaldo = tabungan.reduce((total, t) => total + t.jumlah, 0);

  const handleLogout = async () => {
    document.cookie = "guest-mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    await signOut({ callbackUrl: '/login' });
  };

  const loadData = () => {
    refreshTabungan();
    refreshTransaksi();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Nexus Financial
              </h1>
              {/* PlatformBadge menampilkan status PWA/Browser */}
              <PlatformBadge variant="compact" className="mt-0.5" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right mr-2">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Saldo</p>
              <p className="text-sm font-bold text-blue-600">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  maximumFractionDigits: 0
                }).format(totalSaldo)}
              </p>
            </div>

            {/* Dropdown Profil Pengguna */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-slate-200 p-0 overflow-hidden hover:bg-slate-100">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name || 'User'} />
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {session?.user?.name?.charAt(0) || <User className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold truncate">{session?.user?.name || 'Guest User'}</span>
                    <span className="text-[10px] text-slate-500 truncate">{session?.user?.email || 'Mode Lokal'}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <span className="text-xs">Status: {isOnline ? 'Cloud Synced' : 'Local Only'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  <span className="text-xs">Pengaturan</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="gap-2 text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer font-bold"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-xs font-bold">Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white p-1 rounded-lg shadow-sm">
            <TabsTrigger 
              value="dashboard" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger 
              value="riwayat" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Riwayat</span>
            </TabsTrigger>
            <TabsTrigger 
              value="tabungan" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <PiggyBank className="w-4 h-4" />
              <span className="hidden sm:inline">Tabungan</span>
            </TabsTrigger>
            <TabsTrigger 
              value="file" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">File</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardTab 
              tabungan={tabungan} 
              transaksi={transaksi}
              onDataUpdate={loadData}
              canInstall={canInstall}
              installPWA={installPWA}
            />
          </TabsContent>

          <TabsContent value="riwayat" className="space-y-6">
            <RiwayatTransaksiTab 
              transaksi={transaksi}
              tabungan={tabungan}
              onDataUpdate={loadData}
            />
          </TabsContent>

          <TabsContent value="tabungan" className="space-y-6">
            <TabunganTab 
              onDataUpdate={loadData}
            />
          </TabsContent>

          <TabsContent value="file" className="space-y-6">
            <FileTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <Button
          onClick={() => setShowTransaksiDialog(true)}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl h-16 w-16 p-0 group active:scale-95 transition-transform"
        >
          <div className="absolute inset-0 rounded-full bg-blue-400 opacity-0 group-hover:animate-ping group-hover:opacity-20"></div>
          <Plus className="w-8 h-8 relative z-10" />
        </Button>
      </div>

      {/* Transaksi Dialog */}
      <TransaksiDialog
        open={showTransaksiDialog}
        onOpenChange={setShowTransaksiDialog}
        tabungan={tabungan}
      />
    </div>
  );
}