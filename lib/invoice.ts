import PDFDocument from "pdfkit"
import { createAdminClient } from "@/lib/supabase/admin"
import { calculateGST, formatINR, SAC_CODE } from "@/lib/plans"

// ── Company Settings ──

type CompanySettings = {
  company_legal_name: string
  company_address: string
  company_gstin: string
  company_state: string
  company_state_code: string
  invoice_prefix: string
  sac_code: string
  gst_rate: string
}

const DEFAULTS: CompanySettings = {
  company_legal_name: "Superhuman Entrepreneur",
  company_address: "India",
  company_gstin: "",
  company_state: "Maharashtra",
  company_state_code: "27",
  invoice_prefix: "FY26",
  sac_code: SAC_CODE,
  gst_rate: "18",
}

export async function getCompanySettings(): Promise<CompanySettings> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("admin_settings")
    .select("key, value")

  if (!data || data.length === 0) return DEFAULTS

  const settings = { ...DEFAULTS }
  for (const row of data) {
    if (row.key in settings) {
      ;(settings as Record<string, string>)[row.key] = row.value
    }
  }
  return settings
}

// ── Invoice Number ──

export async function getNextInvoiceNumber(): Promise<string> {
  const supabase = createAdminClient()
  const settings = await getCompanySettings()
  const prefix = settings.invoice_prefix

  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .like("invoice_number", `${prefix}/%`)

  const seq = ((count ?? 0) + 1).toString().padStart(3, "0")
  return `${prefix}/${seq}`
}

// ── PDF Generation ──

type InvoiceData = {
  invoiceNumber: string
  date: Date
  company: CompanySettings
  customer: {
    name: string
    email: string
    gstin?: string | null
    businessName?: string | null
    state?: string | null
  }
  description: string
  sacCode: string
  basePaise: number
  cgstPaise: number
  sgstPaise: number
  totalPaise: number
}

function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 })
    const chunks: Uint8Array[] = []

    doc.on("data", (chunk: Uint8Array) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    // Header
    doc.fontSize(20).font("Helvetica-Bold").text(data.company.company_legal_name, 50, 50)
    doc.fontSize(10).font("Helvetica").text(data.company.company_address, 50, 75)
    if (data.company.company_gstin) {
      doc.text(`GSTIN: ${data.company.company_gstin}`, 50, 90)
    }

    // Invoice title
    doc.fontSize(16).font("Helvetica-Bold").text("TAX INVOICE", 400, 50, { align: "right" })
    doc.fontSize(10).font("Helvetica")
    doc.text(`Invoice #: ${data.invoiceNumber}`, 400, 75, { align: "right" })
    doc.text(`Date: ${data.date.toLocaleDateString("en-IN")}`, 400, 90, { align: "right" })

    doc.moveTo(50, 120).lineTo(545, 120).stroke()

    // Bill to
    doc.fontSize(12).font("Helvetica-Bold").text("Bill To:", 50, 135)
    doc.fontSize(10).font("Helvetica")
    let y = 155
    doc.text(data.customer.name, 50, y)
    y += 15
    doc.text(data.customer.email, 50, y)
    if (data.customer.businessName) {
      y += 15
      doc.text(data.customer.businessName, 50, y)
    }
    if (data.customer.gstin) {
      y += 15
      doc.text(`GSTIN: ${data.customer.gstin}`, 50, y)
    }

    // Table
    const tableTop = y + 30
    doc.fontSize(10).font("Helvetica-Bold")
    doc.text("Description", 50, tableTop)
    doc.text("SAC", 320, tableTop)
    doc.text("Amount", 450, tableTop, { align: "right" })
    doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke()

    let row = tableTop + 25
    doc.font("Helvetica")
    doc.text(data.description, 50, row)
    doc.text(data.sacCode, 320, row)
    doc.text(formatINR(data.basePaise), 450, row, { align: "right" })

    // Totals
    row += 30
    doc.moveTo(350, row).lineTo(545, row).stroke()
    row += 10
    doc.text("Subtotal", 350, row)
    doc.text(formatINR(data.basePaise), 450, row, { align: "right" })
    row += 18
    doc.text("CGST (9%)", 350, row)
    doc.text(formatINR(data.cgstPaise), 450, row, { align: "right" })
    row += 18
    doc.text("SGST (9%)", 350, row)
    doc.text(formatINR(data.sgstPaise), 450, row, { align: "right" })
    row += 18
    doc.moveTo(350, row).lineTo(545, row).stroke()
    row += 8
    doc.font("Helvetica-Bold")
    doc.text("Total", 350, row)
    doc.text(formatINR(data.totalPaise), 450, row, { align: "right" })

    // Footer
    doc.fontSize(8).font("Helvetica").fillColor("#666666")
    doc.text(
      "This is a computer-generated invoice and does not require a signature.",
      50, 750, { align: "center" }
    )

    doc.end()
  })
}

// ── Orchestrator ──

type GenerateInvoiceParams = {
  userId: string
  subscriptionId: string
  planLabel: string
  basePaise: number
  customerName: string
  customerEmail: string
  customerGstin?: string | null
  customerBusinessName?: string | null
  customerState?: string | null
}

export async function generateInvoice(params: GenerateInvoiceParams): Promise<string> {
  const supabase = createAdminClient()
  const gst = calculateGST(params.basePaise)
  const invoiceNumber = await getNextInvoiceNumber()
  const company = await getCompanySettings()

  const invoiceData: InvoiceData = {
    invoiceNumber,
    date: new Date(),
    company,
    customer: {
      name: params.customerName,
      email: params.customerEmail,
      gstin: params.customerGstin,
      businessName: params.customerBusinessName,
      state: params.customerState,
    },
    description: `${params.planLabel} Subscription`,
    sacCode: company.sac_code,
    basePaise: gst.base,
    cgstPaise: gst.cgst,
    sgstPaise: gst.sgst,
    totalPaise: gst.total,
  }

  const pdfBuffer = await generateInvoicePDF(invoiceData)

  // Upload to Supabase Storage
  const filename = `${params.userId}/${invoiceNumber.replace("/", "-")}.pdf`
  const { error: uploadError } = await supabase.storage
    .from("invoices")
    .upload(filename, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Invoice upload failed: ${uploadError.message}`)
  }

  // Insert invoice record
  const { data: invoice, error: dbError } = await supabase
    .from("invoices")
    .insert({
      user_id: params.userId,
      subscription_id: params.subscriptionId,
      invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString(),
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      customer_gstin: params.customerGstin ?? null,
      customer_business_name: params.customerBusinessName ?? null,
      customer_state: params.customerState ?? null,
      description: `${params.planLabel} Subscription`,
      sac_code: company.sac_code,
      base_amount: gst.base,
      tax_rate: 18,
      cgst_amount: gst.cgst,
      sgst_amount: gst.sgst,
      igst_amount: 0,
      total_amount: gst.total,
      pdf_url: filename,
    })
    .select("id")
    .single()

  if (dbError) {
    throw new Error(`Invoice record failed: ${dbError.message}`)
  }

  return invoice.id
}
