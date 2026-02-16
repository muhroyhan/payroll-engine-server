📌 Tujuan MVP

Membangun sistem payroll multi-tenant yang bisa:

- mengelola data karyawan
- mengatur komponen gaji & potongan
- menjalankan perhitungan payroll bulanan
- menghasilkan payslip
- memiliki audit log
- aman & siap di-deploy

👥 User Role

- Tenant Admin → kelola user & config
- Payroll Officer → run payroll
- Viewer → lihat data & laporan

✅ Fitur Inti MVP
1️⃣ Multi-Tenant

- registrasi company
- setiap data pakai tenant_id
- isolasi data antar company

2️⃣ Authentication & RBAC

- login JWT
- role-based access
- tenant context dari token

3️⃣ Employee Management

- tambah / edit / nonaktifkan karyawan
- field: nama, posisi, base salary, join date

4️⃣ Salary Components

- allowance & deduction
- tipe: fixed / percentage
- bisa diaktif/nonaktifkan

Contoh:

- transport allowance (+)
- tax placeholder (-)

5️⃣ Payroll Period

- buat periode payroll
- status: draft → processed → locked

6️⃣ Payroll Run Engine (Core)

Saat run payroll:

gross = base_salary + allowances
net = gross - deductions

Support:

- fixed amount
- percentage
- prorate sederhana (join date)
- Hasil disimpan sebagai snapshot (immutable).

7️⃣ Payslip Output

- generate payslip per employee
- export CSV
- generate PDF sederhana

8️⃣ Audit Log

Catat aksi penting:

- run payroll
- edit salary
- ubah component

9️⃣ Engineering Standard

- Swagger API docs
- Dockerized
- Migration script
- Seed data
- CI lint + test
- Health endpoint

❌ Tidak Masuk MVP

- pajak regulasi kompleks
- AI analytics
- mobile app
- approval workflow berlapis
- integrasi bank
- attendance sync
- microservices

🧪 Demo Flow MVP

- Register tenant
- Login admin
- Tambah employee
- Set allowance/deduction
- Buat payroll period
- Run payroll
- Generate payslip
- Export CSV
- Lihat audit log
