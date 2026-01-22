// src/types_db.ts
export interface Database {
  public: {
    tabungan: {
      Row: {
        id: number
        nama: string
        saldo_awal: number
        jumlah: number
        user_id: string
        created_at: string
        updated_at: string
      }
    }
    transaksi: {
      Row: {
        id: number
        judul: string
        jumlah: number
        deskripsi: string | null
        tanggal: string
        tipe: string
        tabungan_id: number
        user_id: string
        created_at: string
        updated_at: string
      }
    }
  }
}