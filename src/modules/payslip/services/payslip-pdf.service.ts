import PDFDocument from 'pdfkit'
import JSZip from 'jszip'
import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prismaclient/client'
import { PrismaService } from '@src/database/prisma.service'
import { AbilityFactory } from '@src/common/casl'
import type { AuditContext } from '@src/common/types'

type PayslipPdfData = {
  tenantName: string
  periodName: string
  periodStart: Date
  periodEnd: Date
  employeeCode: string
  employeeName: string
  baseSalary: Prisma.Decimal
  grossSalary: Prisma.Decimal
  totalAllowance: Prisma.Decimal
  totalDeduction: Prisma.Decimal
  netSalary: Prisma.Decimal
  items: Array<{
    componentName: string
    componentType: 'allowance' | 'deduction'
    amount: Prisma.Decimal
  }>
}

type PdfDoc = InstanceType<typeof PDFDocument>

@Injectable()
export class PayslipPdfService {
  constructor(
    private prisma: PrismaService,
    private abilityFactory: AbilityFactory,
  ) {}

  async downloadSingle(
    payslipId: number,
    auditContext: AuditContext,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const scopeFilter = this.abilityFactory.buildPayslipWhere(
      auditContext,
      'read',
    )

    const payslip = await this.prisma.payslip.findFirst({
      where: { id: payslipId, ...(scopeFilter ?? {}) },
      include: {
        tenant: { select: { name: true } },
        employee: { select: { employeeCode: true, fullName: true } },
        payslipRun: {
          select: {
            payslipPeriod: {
              select: { name: true, period_start: true, period_end: true },
            },
          },
        },
        payslipItems: { orderBy: { id: 'asc' } },
      },
    })

    if (!payslip) {
      throw new NotFoundException(`Payslip with ID ${payslipId} not found`)
    }

    const data: PayslipPdfData = {
      tenantName: payslip.tenant?.name ?? 'Company',
      periodName: payslip.payslipRun?.payslipPeriod?.name ?? '',
      periodStart:
        payslip.payslipRun?.payslipPeriod?.period_start ?? new Date(),
      periodEnd: payslip.payslipRun?.payslipPeriod?.period_end ?? new Date(),
      employeeCode: payslip.employee?.employeeCode ?? '',
      employeeName: payslip.employee?.fullName ?? '',
      baseSalary: payslip.baseSalary,
      grossSalary: payslip.grossSalary,
      totalAllowance: payslip.totalAllowance,
      totalDeduction: payslip.totalDeduction,
      netSalary: payslip.netSalary,
      items: payslip.payslipItems.map((item) => ({
        componentName: item.componentName,
        componentType: item.componentType as 'allowance' | 'deduction',
        amount: item.amount,
      })),
    }

    const buffer = await this.renderPdf(data)
    const month = this.periodToMonth(data.periodStart)

    return {
      buffer,
      filename: `payslip-${data.employeeCode}-${month}.pdf`,
    }
  }

  async downloadPeriodZip(
    periodId: number,
    auditContext: AuditContext,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const periodScopeFilter = this.abilityFactory.buildPayslipPeriodWhere(
      auditContext,
      'read',
    )

    const period = await this.prisma.payslipPeriod.findFirst({
      where: { id: periodId, ...(periodScopeFilter ?? {}) },
      include: {
        tenant: { select: { name: true } },
        payslipRuns: {
          orderBy: { id: 'asc' },
          include: {
            payslips: {
              orderBy: { id: 'asc' },
              include: {
                employee: { select: { employeeCode: true, fullName: true } },
                payslipItems: { orderBy: { id: 'asc' } },
              },
            },
          },
        },
      },
    })

    if (!period) {
      throw new NotFoundException(
        `Payslip period with ID ${periodId} not found`,
      )
    }

    const zip = new JSZip()
    const tenantName = period.tenant?.name ?? 'Company'
    const month = this.periodToMonth(period.period_start)

    for (const run of period.payslipRuns) {
      for (const payslip of run.payslips) {
        const data: PayslipPdfData = {
          tenantName,
          periodName: period.name,
          periodStart: period.period_start,
          periodEnd: period.period_end,
          employeeCode: payslip.employee?.employeeCode ?? '',
          employeeName: payslip.employee?.fullName ?? '',
          baseSalary: payslip.baseSalary,
          grossSalary: payslip.grossSalary,
          totalAllowance: payslip.totalAllowance,
          totalDeduction: payslip.totalDeduction,
          netSalary: payslip.netSalary,
          items: payslip.payslipItems.map((item) => ({
            componentName: item.componentName,
            componentType: item.componentType as 'allowance' | 'deduction',
            amount: item.amount,
          })),
        }

        const pdfBuffer = await this.renderPdf(data)
        zip.file(`payslip-${data.employeeCode}-${month}.pdf`, pdfBuffer)
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const safeName = period.name
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase()
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    return {
      buffer: zipBuffer,
      filename: `payslips-${safeName}.zip`,
    }
  }

  private periodToMonth(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  }

  private async renderPdf(data: PayslipPdfData): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 })
      const chunks: Buffer[] = []

      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      this.drawPayslip(doc, data)
      doc.end()
    })
  }

  private drawPayslip(doc: PdfDoc, data: PayslipPdfData): void {
    const L = 50 // left margin
    const R = 545 // right edge (595 - 50)
    const MID = 310 // second column x for header info
    const AMT = 350 // start of amount column
    const W_AMT = 195 // width of amount column
    const W_DESC = AMT - L - 10 // width of description column

    // ── Header ──────────────────────────────────────────────────────────
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#1a1a1a')
      .text(data.tenantName, L, 50)

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#666666')
      .text('SLIP GAJI  /  PAYROLL SLIP', L, 76)

    doc
      .moveTo(L, 96)
      .lineTo(R, 96)
      .lineWidth(1.5)
      .strokeColor('#1a1a1a')
      .stroke()

    // ── Period and Employee Info ─────────────────────────────────────────
    const infoY = 110

    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#999999')
      .text('PERIODE / PERIOD', L, infoY)
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#1a1a1a')
      .text(data.periodName, L, infoY + 14)
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#555555')
      .text(
        `${this.fmtDate(data.periodStart)}  –  ${this.fmtDate(data.periodEnd)}`,
        L,
        infoY + 29,
      )

    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#999999')
      .text('KARYAWAN / EMPLOYEE', MID, infoY)
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#1a1a1a')
      .text(data.employeeName, MID, infoY + 14)
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#555555')
      .text(data.employeeCode, MID, infoY + 29)

    doc
      .moveTo(L, 162)
      .lineTo(R, 162)
      .lineWidth(0.5)
      .strokeColor('#cccccc')
      .stroke()

    // ── Earnings ────────────────────────────────────────────────────────
    let y = 177

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#1a1a1a')
      .text('PENDAPATAN  /  EARNINGS', L, y)
    y += 16

    doc.moveTo(L, y).lineTo(R, y).lineWidth(0.5).strokeColor('#dddddd').stroke()
    y += 9

    // Base salary
    doc
      .fontSize(9.5)
      .font('Helvetica')
      .fillColor('#333333')
      .text('Gaji Pokok  /  Base Salary', L, y, { width: W_DESC })
    doc.text(this.fmtRupiah(data.baseSalary), AMT, y, {
      width: W_AMT,
      align: 'right',
    })
    y += 18

    for (const item of data.items.filter(
      (i) => i.componentType === 'allowance',
    )) {
      doc.text(item.componentName, L, y, { width: W_DESC })
      doc.text(this.fmtRupiah(item.amount), AMT, y, {
        width: W_AMT,
        align: 'right',
      })
      y += 18
    }

    doc
      .moveTo(AMT, y)
      .lineTo(R, y)
      .lineWidth(0.5)
      .strokeColor('#333333')
      .stroke()
    y += 6

    doc
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .fillColor('#1a1a1a')
      .text('Total Bruto  /  Gross Salary', L, y, { width: W_DESC })
    doc.text(this.fmtRupiah(data.grossSalary), AMT, y, {
      width: W_AMT,
      align: 'right',
    })
    y += 24

    // ── Deductions ──────────────────────────────────────────────────────
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#1a1a1a')
      .text('POTONGAN  /  DEDUCTIONS', L, y)
    y += 16

    doc.moveTo(L, y).lineTo(R, y).lineWidth(0.5).strokeColor('#dddddd').stroke()
    y += 9

    for (const item of data.items.filter(
      (i) => i.componentType === 'deduction',
    )) {
      doc
        .fontSize(9.5)
        .font('Helvetica')
        .fillColor('#333333')
        .text(item.componentName, L, y, { width: W_DESC })
      doc
        .fillColor('#cc3333')
        .text(`(${this.fmtRupiah(item.amount)})`, AMT, y, {
          width: W_AMT,
          align: 'right',
        })
      y += 18
    }

    doc
      .moveTo(AMT, y)
      .lineTo(R, y)
      .lineWidth(0.5)
      .strokeColor('#333333')
      .stroke()
    y += 6

    doc
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .fillColor('#1a1a1a')
      .text('Total Potongan  /  Total Deductions', L, y, { width: W_DESC })
    doc
      .fillColor('#cc3333')
      .text(`(${this.fmtRupiah(data.totalDeduction)})`, AMT, y, {
        width: W_AMT,
        align: 'right',
      })
    y += 26

    // ── Net Salary ───────────────────────────────────────────────────────
    doc.moveTo(L, y).lineTo(R, y).lineWidth(1.5).strokeColor('#1a1a1a').stroke()
    y += 9

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1a1a1a')
      .text('GAJI BERSIH  /  NET SALARY', L, y)
    doc.text(this.fmtRupiah(data.netSalary), AMT, y, {
      width: W_AMT,
      align: 'right',
    })
    y += 22

    doc.moveTo(L, y).lineTo(R, y).lineWidth(1.5).strokeColor('#1a1a1a').stroke()

    // ── Footer ────────────────────────────────────────────────────────────
    const today = new Date()
    const footerText = `Dicetak pada / Generated on: ${this.fmtDate(today)}`
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#aaaaaa')
      .text(footerText, L, 790, { align: 'center', width: R - L })
  }

  private fmtRupiah(value: Prisma.Decimal): string {
    const [intPart, decPart] = value.toFixed(2).split('.')
    const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return `Rp ${formatted},${decPart}`
  }

  private fmtDate(date: Date): string {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
    return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`
  }
}
