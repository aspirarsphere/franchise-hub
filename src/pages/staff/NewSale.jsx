import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatINR, nowIST, todayIST, generateInvoiceNo } from '../../lib/utils'
import Spinner from '../../components/Spinner'
import { jsPDF } from 'jspdf'
import { ChevronLeft, Plus, Minus, Check } from 'lucide-react'

const PAYMENT_MODES = ['Cash', 'UPI', 'Card']

export default function NewSale() {
  const { profile } = useAuth()
  const [step, setStep] = useState(1)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [lastInvoice, setLastInvoice] = useState(null)

  // Customer
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' })
  const [custErrors, setCustErrors] = useState({})

  // Cart
  const [cart, setCart] = useState({}) // { product_id: qty }
  const [discount, setDiscount] = useState('')

  // Payment
  const [paymentMode, setPaymentMode] = useState('Cash')

  useEffect(() => {
    supabase.from('products').select('*').order('line').then(({ data }) => {
      setProducts(data || [])
      setLoading(false)
    })
  }, [])

  // Group products by line
  const grouped = products.reduce((acc, p) => {
    const line = p.line || 'Other'
    if (!acc[line]) acc[line] = []
    acc[line].push(p)
    return acc
  }, {})

  const subtotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = products.find(x => x.id === id)
    return sum + (p ? p.price * qty : 0)
  }, 0)
  const discountAmt = parseFloat(discount) || 0
  const total = Math.max(0, subtotal - discountAmt)
  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0)

  function setQty(id, qty) {
    setCart(prev => {
      const next = { ...prev }
      if (qty <= 0) delete next[id]
      else next[id] = qty
      return next
    })
  }

  function validateCustomer() {
    const errors = {}
    if (!customer.name.trim()) errors.name = 'Name is required'
    if (!customer.phone.match(/^\d{10}$/)) errors.phone = 'Enter a valid 10-digit number'
    setCustErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function submitSale() {
    setSubmitting(true)
    try {
      const { count } = await supabase
        .from('sales')
        .select('id', { count: 'exact' })
        .eq('franchise_id', profile.franchise_id)
      const invoiceNo = generateInvoiceNo('VC', count || 0)

      const saleItems = Object.entries(cart).map(([product_id, quantity]) => {
        const p = products.find(x => x.id === product_id)
        return { product_id, quantity, unit_price: p.price, subtotal: p.price * quantity }
      })

      const { data: sale, error } = await supabase.from('sales').insert({
        franchise_id: profile.franchise_id,
        staff_id: profile.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email || null,
        products: saleItems,
        subtotal,
        discount: discountAmt,
        total,
        payment_mode: paymentMode,
        invoice_number: invoiceNo,
      }).select().single()

      if (error) { alert('Save error: ' + error.message); setSubmitting(false); return }

      for (const { product_id, quantity } of saleItems) {
        try {
          await supabase.rpc('deduct_inventory', {
            p_franchise_id: profile.franchise_id,
            p_product_id: product_id,
            p_qty: quantity
          })
        } catch (_) {}
      }

      setLastInvoice({ ...sale, items: saleItems })
      try { generatePDF({ ...sale, items: saleItems }, invoiceNo) } catch (e) { console.error('PDF error', e) }
      setDone(true)
    } catch (e) {
      alert('Unexpected error: ' + e.message)
    }
    setSubmitting(false)
  }

  function generatePDF(sale, invoiceNo) {
    const doc = new jsPDF({ unit: 'mm', format: 'a5' })
    const W = 148

    // Header
    doc.setFillColor(112, 0, 0)
    doc.rect(0, 0, W, 28, 'F')
    doc.setTextColor(156, 119, 56)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('VeaChoc', 10, 13)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('by Aspirar Sphere Pvt. Ltd.', 10, 19)
    doc.text(`FSSAI: 11221332000521`, 10, 24)

    // Invoice details
    doc.setTextColor(30, 30, 30)
    doc.setFontSize(9)
    doc.text(`Invoice: ${invoiceNo}`, 10, 36)
    doc.text(`Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 10, 42)
    doc.text(`Outlet: ${profile.franchises?.name || 'VeaChoc'}`, 10, 48)
    doc.text(`Address: ${profile.franchises?.address || ''}`, 10, 54)
    doc.text(`Staff: ${profile.full_name}`, 10, 60)

    // Customer
    doc.setFillColor(253, 251, 247)
    doc.rect(10, 65, W - 20, 18, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('CUSTOMER DETAILS', 13, 71)
    doc.setFont('helvetica', 'normal')
    doc.text(`Name: ${sale.customer_name}   Phone: ${sale.customer_phone}`, 13, 77)
    if (sale.customer_email) doc.text(`Email: ${sale.customer_email}`, 13, 82)

    // Items header
    let y = 90
    doc.setFillColor(112, 0, 0)
    doc.rect(10, y, W - 20, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('Product', 13, y + 5.5)
    doc.text('Qty', 95, y + 5.5)
    doc.text('Price', 108, y + 5.5)
    doc.text('Amount', 122, y + 5.5)
    y += 10

    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'normal')
    sale.products.forEach((item, i) => {
      const p = products.find(x => x.id === item.product_id)
      if (i % 2 === 0) { doc.setFillColor(248, 245, 240); doc.rect(10, y - 4, W - 20, 8, 'F') }
      doc.text(p ? `${p.line} ${p.variant}` : 'Product', 13, y + 1)
      doc.text(String(item.quantity), 96, y + 1)
      doc.text(formatINR(item.unit_price), 105, y + 1)
      doc.text(formatINR(item.subtotal), 122, y + 1)
      y += 8
    })

    // Totals
    y += 4
    doc.setDrawColor(200, 200, 200)
    doc.line(10, y, W - 10, y)
    y += 6
    doc.setFontSize(8)
    doc.text(`Subtotal:`, 95, y); doc.text(formatINR(sale.subtotal), 122, y); y += 6
    if (sale.discount > 0) { doc.setTextColor(200, 0, 0); doc.text(`Discount:`, 95, y); doc.text(`-${formatINR(sale.discount)}`, 122, y); y += 6; doc.setTextColor(30, 30, 30) }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    doc.text(`TOTAL:`, 90, y); doc.setTextColor(112, 0, 0); doc.text(formatINR(sale.total), 120, y); y += 6
    doc.setTextColor(30, 30, 30); doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text(`Payment Mode: ${sale.payment_mode}`, 13, y)

    // Footer
    y += 12
    doc.setTextColor(100, 100, 100)
    doc.setFontSize(7)
    doc.text('Thank you for choosing VeaChoc', W / 2, y, { align: 'center' })
    doc.text('An Anaemia-Free India through Joyful Nutrition', W / 2, y + 5, { align: 'center' })

    doc.save(`${invoiceNo}.pdf`)
    return doc
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  if (done) return (
    <div className="px-4 py-10 flex flex-col items-center fade-in">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <Check size={32} className="text-green-600" />
      </div>
      <h2 className="font-heading text-2xl font-semibold text-gray-800 mb-2">Sale Recorded!</h2>
      <p className="text-sm text-gray-500 font-body mb-2">{lastInvoice?.invoice_number}</p>
      <p className="text-3xl font-heading font-bold mb-6" style={{ color: '#9c7738' }}>{formatINR(total)}</p>

      <div className="w-full space-y-3">
        <a
          href={`https://wa.me/${customer.phone}?text=Thank%20you%20for%20your%20purchase%20at%20VeaChoc!%20Invoice%3A%20${lastInvoice?.invoice_number}%20Amount%3A%20${formatINR(total)}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-green-500 text-white font-body font-semibold text-sm"
        >
          Share via WhatsApp
        </a>
        {customer.email && (
          <a
            href={`mailto:${customer.email}?subject=VeaChoc Invoice ${lastInvoice?.invoice_number}&body=Dear ${customer.name},%0A%0AThank you for your purchase. Total: ${formatINR(total)}.%0A%0AVeaChoc Team`}
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl border border-gray-200 text-gray-700 font-body font-semibold text-sm"
          >
            Send via Email
          </a>
        )}
        <button
          onClick={() => { setDone(false); setStep(1); setCustomer({ name: '', phone: '', email: '' }); setCart({}); setDiscount(''); setPaymentMode('Cash') }}
          className="w-full h-12 rounded-xl font-body font-semibold text-white text-sm"
          style={{ backgroundColor: '#700000' }}
        >
          New Sale
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen bg-cream">
      {/* Step indicator */}
      <div className="bg-white px-4 py-3 flex items-center gap-4 border-b border-gray-100">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} className="p-1">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
        )}
        <div className="flex gap-2 flex-1">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? 'bg-maroon' : 'bg-gray-200'}`} style={s <= step ? { backgroundColor: '#700000' } : {}} />
          ))}
        </div>
        <span className="text-xs text-gray-400 font-body">Step {step}/3</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 pb-36">

        {/* STEP 1: Customer */}
        {step === 1 && (
          <div className="fade-in">
            <h2 className="font-heading text-xl font-semibold text-gray-800 mb-5">Customer Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 font-body uppercase tracking-wider mb-1.5">Full Name *</label>
                <input
                  value={customer.name}
                  onChange={e => setCustomer(p => ({ ...p, name: e.target.value }))}
                  placeholder="Customer name"
                  className={`w-full h-12 px-4 border rounded-xl font-body text-sm focus:outline-none focus:border-maroon transition-all ${custErrors.name ? 'border-red-400' : 'border-gray-200'}`}
                />
                {custErrors.name && <p className="text-red-500 text-xs mt-1 font-body">{custErrors.name}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 font-body uppercase tracking-wider mb-1.5">Phone *</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={customer.phone}
                  onChange={e => setCustomer(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                  placeholder="10-digit mobile"
                  className={`w-full h-12 px-4 border rounded-xl font-body text-sm focus:outline-none focus:border-maroon transition-all ${custErrors.phone ? 'border-red-400' : 'border-gray-200'}`}
                />
                {custErrors.phone && <p className="text-red-500 text-xs mt-1 font-body">{custErrors.phone}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 font-body uppercase tracking-wider mb-1.5">Email (Optional)</label>
                <input
                  type="email"
                  value={customer.email}
                  onChange={e => setCustomer(p => ({ ...p, email: e.target.value }))}
                  placeholder="customer@email.com"
                  className="w-full h-12 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none focus:border-maroon transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Products */}
        {step === 2 && (
          <div className="fade-in">
            <h2 className="font-heading text-xl font-semibold text-gray-800 mb-4">Select Products</h2>
            {Object.entries(grouped).map(([line, items]) => (
              <div key={line} className="mb-5">
                <p className="text-xs font-semibold text-gold font-body uppercase tracking-wider mb-2">{line}</p>
                <div className="space-y-2">
                  {items.map(p => (
                    <div key={p.id} className="bg-white rounded-xl px-4 py-3 flex items-center justify-between shadow-sm border border-gray-100">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm font-body font-medium text-gray-800 truncate">{p.line} {p.variant}</p>
                        <p className="text-xs text-gray-400 font-body">{p.size || ''}</p>
                        <p className="text-sm font-semibold font-body mt-0.5" style={{ color: '#9c7738' }}>{formatINR(p.price)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setQty(p.id, (cart[p.id] || 0) - 1)}
                          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center font-body font-semibold text-sm">{cart[p.id] || 0}</span>
                        <button
                          onClick={() => setQty(p.id, (cart[p.id] || 0) + 1)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors"
                          style={{ backgroundColor: '#700000' }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Discount */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-600 font-body uppercase tracking-wider mb-1.5">Discount (₹)</label>
              <input
                type="number"
                inputMode="numeric"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                placeholder="0"
                className="w-full h-12 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none focus:border-maroon transition-all"
              />
            </div>
          </div>
        )}

        {/* STEP 3: Payment */}
        {step === 3 && (
          <div className="fade-in">
            <h2 className="font-heading text-xl font-semibold text-gray-800 mb-5">Payment & Invoice</h2>

            {/* Order summary */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-5">
              <p className="text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-3">Order Summary</p>
              {Object.entries(cart).map(([id, qty]) => {
                const p = products.find(x => x.id === id)
                return p ? (
                  <div key={id} className="flex justify-between text-sm font-body py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-gray-700">{p.line} {p.variant} × {qty}</span>
                    <span className="font-semibold">{formatINR(p.price * qty)}</span>
                  </div>
                ) : null
              })}
              <div className="mt-3 pt-3 border-t border-dashed border-gray-200 space-y-1.5">
                <div className="flex justify-between text-sm font-body text-gray-600">
                  <span>Subtotal</span><span>{formatINR(subtotal)}</span>
                </div>
                {discountAmt > 0 && (
                  <div className="flex justify-between text-sm font-body text-red-500">
                    <span>Discount</span><span>-{formatINR(discountAmt)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold font-body text-base pt-1">
                  <span>Total</span>
                  <span style={{ color: '#700000' }}>{formatINR(total)}</span>
                </div>
              </div>
            </div>

            {/* Payment mode */}
            <p className="text-xs font-semibold text-gray-600 font-body uppercase tracking-wider mb-2">Payment Mode</p>
            <div className="flex gap-2 mb-6">
              {PAYMENT_MODES.map(mode => (
                <button
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={`flex-1 h-12 rounded-xl border font-body font-medium text-sm transition-all ${paymentMode === mode ? 'border-maroon text-maroon bg-red-50' : 'border-gray-200 text-gray-600'}`}
                  style={paymentMode === mode ? { borderColor: '#700000', color: '#700000' } : {}}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
        {step === 2 && (
          <div className="flex justify-between text-sm font-body font-semibold mb-3 px-1">
            <span className="text-gray-500">{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
            <span style={{ color: '#9c7738' }}>{formatINR(total)}</span>
          </div>
        )}
        {step < 3 ? (
          <button
            onClick={() => {
              if (step === 1 && !validateCustomer()) return
              if (step === 2 && cartCount === 0) { alert('Please add at least one product.'); return }
              setStep(s => s + 1)
            }}
            className="w-full h-12 rounded-xl font-body font-semibold text-white text-sm transition-all active:scale-[0.98]"
            style={{ backgroundColor: '#700000' }}
          >
            Continue →
          </button>
        ) : (
          <button
            onClick={submitSale}
            disabled={submitting || total === 0}
            className="w-full h-12 rounded-xl font-body font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
            style={{ backgroundColor: '#700000' }}
          >
            {submitting ? <Spinner size={20} /> : `Generate Invoice — ${formatINR(total)}`}
          </button>
        )}
      </div>
    </div>
  )
}
