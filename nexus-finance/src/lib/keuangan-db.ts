import Dexie, { Table } from 'dexie';

export interface Tabungan {
  id?: number;
  nama: string;
  kategori: 'rekening_bank' | 'cash' | 'e_wallet' | 'e_money';
  saldoAwal: number;
  saldoSaatIni: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaksi {
  id?: number;
  jenis: 'pemasukan' | 'pengeluaran';
  jumlah: number;
  keterangan: string;
  tabunganId: number;
  tabunganNama: string;
  kategoriTabungan: string;
  tanggal: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatistikBulanan {
  id?: number;
  bulan: string;
  tahun: number;
  bulanNumber: number;
  totalPemasukan: number;
  totalPengeluaran: number;
  saldoAkhir: number;
  createdAt: string;
  updatedAt: string;
}

class KeuanganDatabase extends Dexie {
  tabungan!: Table<Tabungan>;
  transaksi!: Table<Transaksi>;
  statistikBulanan!: Table<StatistikBulanan>;

  constructor() {
    super('KeuanganDB');
    
    this.version(1).stores({
      tabungan: '++id, nama, kategori, saldoAwal, saldoSaatIni, createdAt, updatedAt',
      transaksi: '++id, jenis, jumlah, tabunganId, tanggal, createdAt, updatedAt',
      statistikBulanan: '++id, bulan, tahun, bulanNumber, totalPemasukan, totalPengeluaran, saldoAkhir'
    });
  }
}

export const db = new KeuanganDatabase();
export class KeuanganService {
  static async createTabungan(tabungan: Omit<Tabungan, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const newTabungan: Tabungan = {
      ...tabungan,
      saldoSaatIni: tabungan.saldoAwal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return await db.tabungan.add(newTabungan);
  }

  static async getAllTabungan(): Promise<Tabungan[]> {
    return await db.tabungan.orderBy('nama').toArray();
  }

  static async getTabunganById(id: number): Promise<Tabungan | undefined> {
    return await db.tabungan.get(id);
  }

  static async updateTabungan(id: number, updates: Partial<Tabungan>): Promise<void> {
    await db.tabungan.update(id, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  static async deleteTabungan(id: number): Promise<void> {
    const transaksi = await db.transaksi.where('tabunganId').equals(id).toArray();
    for (const t of transaksi) {
      if (t.id) {
        await db.transaksi.delete(t.id);
      }
    }
    await db.tabungan.delete(id);
  }

  static async getTotalSaldo(): Promise<number> {
    const tabungan = await this.getAllTabungan();
    return tabungan.reduce((total, t) => total + t.saldoSaatIni, 0);
  }

  static async createTransaksi(transaksi: Omit<Transaksi, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const newTransaksi: Transaksi = {
      ...transaksi,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const id = await db.transaksi.add(newTransaksi);
    await this.updateSaldoTabungan(transaksi.tabunganId, transaksi.jumlah, transaksi.jenis);

    return id;
  }

  static async getAllTransaksi(): Promise<Transaksi[]> {
    return await db.transaksi.orderBy('tanggal').reverse().toArray();
  }

  static async getTransaksiByBulanTahun(bulan: number, tahun: number): Promise<Transaksi[]> {
    const startDate = `${tahun}-${bulan.toString().padStart(2, '0')}-01`;
    const endDate = `${tahun}-${bulan.toString().padStart(2, '0')}-31`;

    return await db.transaksi
      .where('tanggal')
      .between(startDate, endDate)
      .toArray();
  }

  static async getTransaksiByTabungan(tabunganId: number): Promise<Transaksi[]> {
    return await db.transaksi
      .where('tabunganId')
      .equals(tabunganId)
      .toArray();
  }

  static async updateTransaksi(id: number, updates: Partial<Transaksi>): Promise<void> {
    await db.transaksi.update(id, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  static async deleteTransaksi(id: number): Promise<void> {
    const transaksi = await db.transaksi.get(id);
    if (transaksi) {
      const jumlahKembali = transaksi.jenis === 'pemasukan' ? -transaksi.jumlah : transaksi.jumlah;
      await this.updateSaldoTabungan(transaksi.tabunganId, jumlahKembali, transaksi.jenis === 'pemasukan' ? 'pengeluaran' : 'pemasukan');
      await db.transaksi.delete(id);
    }
  }

  private static async updateSaldoTabungan(tabunganId: number, jumlah: number, jenis: 'pemasukan' | 'pengeluaran'): Promise<void> {
    const tabungan = await db.tabungan.get(tabunganId);
    if (tabungan) {
      const newSaldo = jenis === 'pemasukan' 
        ? tabungan.saldoSaatIni + jumlah 
        : tabungan.saldoSaatIni - jumlah;
      
      await db.tabungan.update(tabunganId, {
        saldoSaatIni: newSaldo,
        updatedAt: new Date().toISOString()
      });
    }
  }

  static async getPemasukanBulanIni(): Promise<number> {
    const now = new Date();
    const bulan = now.getMonth() + 1;
    const tahun = now.getFullYear();
    
    const transaksi = await this.getTransaksiByBulanTahun(bulan, tahun);
    return transaksi
      .filter(t => t.jenis === 'pemasukan')
      .reduce((total, t) => total + t.jumlah, 0);
  }

  static async getPengeluaranBulanIni(): Promise<number> {
    const now = new Date();
    const bulan = now.getMonth() + 1;
    const tahun = now.getFullYear();
    
    const transaksi = await this.getTransaksiByBulanTahun(bulan, tahun);
    return transaksi
      .filter(t => t.jenis === 'pengeluaran')
      .reduce((total, t) => total + t.jumlah, 0);
  }

  static async getStatistikBulanan(bulanAwal?: number, tahunAwal?: number): Promise<StatistikBulanan[]> {
    const transaksi = await this.getAllTransaksi();
    const statistikMap = new Map<string, StatistikBulanan>();

    transaksi.forEach(t => {
      const date = new Date(t.tanggal);
      const bulanKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!statistikMap.has(bulanKey)) {
        statistikMap.set(bulanKey, {
          id: undefined,
          bulan: bulanKey,
          tahun: date.getFullYear(),
          bulanNumber: date.getMonth() + 1,
          totalPemasukan: 0,
          totalPengeluaran: 0,
          saldoAkhir: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      const statistik = statistikMap.get(bulanKey)!;
      if (t.jenis === 'pemasukan') {
        statistik.totalPemasukan += t.jumlah;
      } else {
        statistik.totalPengeluaran += t.jumlah;
      }
    });

    let saldoSebelumnya = 0;
    const sortedStatistik = Array.from(statistikMap.values()).sort((a, b) => {
      if (a.tahun !== b.tahun) return a.tahun - b.tahun;
      return a.bulanNumber - b.bulanNumber;
    });

    sortedStatistik.forEach(s => {
      s.saldoAkhir = saldoSebelumnya + s.totalPemasukan - s.totalPengeluaran;
      saldoSebelumnya = s.saldoAkhir;
    });

    return sortedStatistik;
  }

  static async getKategoriLabel(kategori: string): Promise<string> {
    const kategoriMap = {
      'rekening_bank': 'Rekening Bank',
      'cash': 'Cash',
      'e_wallet': 'E-Wallet',
      'e_money': 'E-Money'
    };
    return kategoriMap[kategori as keyof typeof kategoriMap] || kategori;
  }

  static async formatCurrency(amount: number): Promise<string> {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}