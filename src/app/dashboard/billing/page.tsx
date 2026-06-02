'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { isDemoMode } from '@/lib/env';
import { CreditCard, CheckCircle2, ShieldCheck, ArrowRight, DollarSign, Download, Loader2, X, AlertCircle } from 'lucide-react';

interface Invoice {
  id: string;
  invoice_no: string;
  date: string;
  amount: string;
  status: 'Paid' | 'Pending' | 'Failed';
}

export default function BillingPage() {
  const { organization, updateOrgProfile } = useApp();

  const [activePlan, setActivePlan] = useState(organization?.compliance_profile ? 'Professional' : 'Standard');
  const [selectedPlan, setSelectedPlan] = useState<'Standard' | 'Professional' | 'Enterprise'>('Professional');
  
  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // Invoices list state
  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: 'inv-1', invoice_no: 'VIG-2026-0082', date: '2026-05-01', amount: '£249.00', status: 'Paid' },
    { id: 'inv-2', invoice_no: 'VIG-2026-0041', date: '2026-04-01', amount: '£249.00', status: 'Paid' },
    { id: 'inv-3', invoice_no: 'VIG-2026-0010', date: '2026-03-01', amount: '£249.00', status: 'Paid' },
    { id: 'inv-4', invoice_no: 'VIG-2025-0994', date: '2026-02-01', amount: '£249.00', status: 'Paid' },
  ]);

  const handleOpenCheckout = (plan: 'Standard' | 'Professional' | 'Enterprise') => {
    if (!isDemoMode) {
      alert('Billing checkout is not configured for production. Set explicit Stripe environment variables and server-side checkout first.');
      return;
    }

    setSelectedPlan(plan);
    setShowCheckoutModal(true);
    setCardNumber('');
    setCardExpiry('');
    setCardCvc('');
    setCheckoutSuccess(false);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardExpiry || !cardCvc) return;
    if (!isDemoMode) return;

    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate Stripe Gateway checkout latency
      
      // Update local storage compliance state/simulated package tier
      setActivePlan(selectedPlan);
      
      // Seed invoice item
      const newInvoice: Invoice = {
        id: `inv-${Math.random().toString(36).substr(2, 9)}`,
        invoice_no: `VIG-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
        date: new Date().toISOString().split('T')[0],
        amount: selectedPlan === 'Standard' ? '£99.00' : selectedPlan === 'Professional' ? '£249.00' : '£599.00',
        status: 'Paid'
      };
      
      setInvoices([newInvoice, ...invoices]);
      
      // Log event
      if (typeof window !== 'undefined') {
        const logs = JSON.parse(localStorage.getItem('vigilen_logs') || '[]');
        logs.unshift({
          id: `log-${Math.random().toString(36).substr(2, 9)}`,
          organization_id: organization?.id || '',
          profile_id: 'usr-jane-doe',
          action: 'Plan Upgraded',
          details: `Jane Doe upgraded organization billing workspace to "${selectedPlan}" Monthly Plan.`,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('vigilen_logs', JSON.stringify(logs));
      }

      setCheckoutSuccess(true);
      setTimeout(() => {
        setShowCheckoutModal(false);
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Head */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight" id="billing-heading">Subscription & Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review active workspaces plans, update credit cards, and download invoices logs.
        </p>
      </div>

      {/* Stats and details cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Plan Overview & Upgrade Steppers */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active plan status banner */}
          <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Active Package Plan</span>
                <h2 className="text-2xl font-extrabold text-foreground mt-1">{activePlan} subscription</h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-md">
                  Configured under Professional compliance limits: Up to 75 assets tracked, 5 organization members, and PIN-protected share portals.
                </p>
              </div>

              <div className="bg-muted px-4 py-3.5 rounded-xl border border-border/80 text-right shrink-0">
                <span className="text-[9px] font-bold text-muted-foreground uppercase block">Next Payment Due</span>
                <span className="text-sm font-extrabold block mt-0.5">
                  {activePlan === 'Standard' ? '£99.00' : activePlan === 'Professional' ? '£249.00' : '£599.00'}
                </span>
                <span className="text-[9px] text-emerald-500 font-semibold block mt-0.5">Renews: {new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Pricing cards choices grid inside dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Standard Choice */}
            <div className={`bg-card border p-5 rounded-xl flex flex-col justify-between h-72 transition-all relative ${
              activePlan === 'Standard' ? 'border-indigo-600 bg-indigo-500/[0.02]' : 'border-border'
            }`}>
              {activePlan === 'Standard' && (
                <div className="absolute top-3 right-3 text-[9px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded">Active</div>
              )}
              <div>
                <span className="font-extrabold block text-sm">Standard Tier</span>
                <div className="flex items-baseline mt-2">
                  <span className="text-2xl font-extrabold">£99</span>
                  <span className="text-muted-foreground text-[10px] ml-0.5">/ mo</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-2">
                  Suitable for local transport fleets. Includes up to 15 vehicles/depots.
                </p>
              </div>
              <button
                onClick={() => handleOpenCheckout('Standard')}
                disabled={activePlan === 'Standard'}
                className="w-full py-2 bg-muted hover:bg-muted/80 disabled:bg-indigo-600/5 disabled:text-indigo-600/50 border border-border text-center text-xs font-bold rounded-lg transition-colors"
                id="billing-upgrade-standard"
              >
                {activePlan === 'Standard' ? 'Currently Selected' : 'Downgrade Plan'}
              </button>
            </div>

            {/* Professional Choice */}
            <div className={`bg-card border p-5 rounded-xl flex flex-col justify-between h-72 transition-all relative ${
              activePlan === 'Professional' ? 'border-indigo-600 bg-indigo-500/[0.02]' : 'border-border'
            }`}>
              {activePlan === 'Professional' && (
                <div className="absolute top-3 right-3 text-[9px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded">Active</div>
              )}
              <div>
                <span className="font-extrabold block text-sm">Professional Tier</span>
                <div className="flex items-baseline mt-2">
                  <span className="text-2xl font-extrabold">£249</span>
                  <span className="text-muted-foreground text-[10px] ml-0.5">/ mo</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-2">
                  For expanding logistics depots. Up to 75 assets tracked and PIN sharing.
                </p>
              </div>
              <button
                onClick={() => handleOpenCheckout('Professional')}
                disabled={activePlan === 'Professional'}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/5 disabled:text-indigo-600/50 text-white font-bold rounded-lg text-center text-xs shadow-md shadow-indigo-600/10 transition-colors"
                id="billing-upgrade-professional"
              >
                {activePlan === 'Professional' ? 'Currently Selected' : 'Select Plan'}
              </button>
            </div>

            {/* Enterprise Choice */}
            <div className={`bg-card border p-5 rounded-xl flex flex-col justify-between h-72 transition-all relative ${
              activePlan === 'Enterprise' ? 'border-indigo-600 bg-indigo-500/[0.02]' : 'border-border'
            }`}>
              {activePlan === 'Enterprise' && (
                <div className="absolute top-3 right-3 text-[9px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded">Active</div>
              )}
              <div>
                <span className="font-extrabold block text-sm">Enterprise Tier</span>
                <div className="flex items-baseline mt-2">
                  <span className="text-2xl font-extrabold">£599</span>
                  <span className="text-muted-foreground text-[10px] ml-0.5">/ mo</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-2">
                  Unlimited fleets, Custom regulatory profile seeding templates.
                </p>
              </div>
              <button
                onClick={() => handleOpenCheckout('Enterprise')}
                disabled={activePlan === 'Enterprise'}
                className="w-full py-2 bg-muted hover:bg-muted/80 disabled:bg-indigo-600/5 disabled:text-indigo-600/50 border border-border text-center text-xs font-bold rounded-lg transition-colors"
                id="billing-upgrade-enterprise"
              >
                {activePlan === 'Enterprise' ? 'Currently Selected' : 'Upgrade Plan'}
              </button>
            </div>

          </div>

        </div>

        {/* Invoice logs payment history listing (1 Col) */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <CreditCard className="w-5 h-5 text-indigo-500" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Payment History</h2>
          </div>

          <div className="divide-y divide-border/60 max-h-96 overflow-y-auto pr-1">
            {invoices.map(inv => (
              <div key={inv.id} className="py-3 flex justify-between items-center text-xs gap-3">
                <div className="overflow-hidden mr-2">
                  <span className="font-bold block text-foreground truncate">{inv.invoice_no}</span>
                  <span className="text-[9px] text-muted-foreground block truncate mt-0.5">
                    Paid on {inv.date} • {inv.amount}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 text-[9px] bg-emerald-500/10 text-emerald-500 font-bold rounded">
                    {inv.status}
                  </span>
                  
                  <button 
                    onClick={() => alert(`Simulated Invoice receipt PDF download for ${inv.invoice_no}`)}
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                    title="Download Invoice"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Stripe Gateway Checkout Simulator Overlay Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 relative shadow-2xl">
            <button
              onClick={() => setShowCheckoutModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            {checkoutSuccess ? (
              <div className="text-center py-8 text-xs space-y-4 max-w-[280px] mx-auto">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">Upgrade Confirmed</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your organization compliance capabilities have been adjusted.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
                  <ShieldCheck className="w-5 h-5 text-indigo-500" />
                  <div>
                    <h3 className="text-base font-extrabold text-foreground">Demo Checkout Simulator</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Prototype-only plan change for {selectedPlan} Plan.</p>
                  </div>
                </div>

                <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Selected Plan Amount
                    </span>
                    <div className="p-3 bg-muted/50 border border-border rounded-lg text-sm font-extrabold flex justify-between items-center text-foreground">
                      <span>{selectedPlan} Monthly Package</span>
                      <span>
                        {selectedPlan === 'Standard' ? '£99' : selectedPlan === 'Professional' ? '£249' : '£599'}
                        <span className="text-[10px] font-normal text-muted-foreground">/mo</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="card-num" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Credit Card Number
                    </label>
                    <input
                      id="card-num"
                      type="text"
                      required
                      value={cardNumber}
                      onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').substring(0, 16))}
                      placeholder="4242 4242 4242 4242"
                      className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="card-exp" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Expiry Date
                      </label>
                      <input
                        id="card-exp"
                        type="text"
                        required
                        value={cardExpiry}
                        onChange={e => setCardExpiry(e.target.value.substring(0, 5))}
                        placeholder="MM/YY"
                        className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none text-center"
                      />
                    </div>

                    <div>
                      <label htmlFor="card-cvc" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        CVC Code
                      </label>
                      <input
                        id="card-cvc"
                        type="password"
                        required
                        value={cardCvc}
                        onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').substring(0, 3))}
                        placeholder="123"
                        className="w-full px-3 py-2 bg-muted border border-border/80 focus:border-indigo-500 rounded-lg text-xs outline-none text-center"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowCheckoutModal(false)}
                      className="w-1/2 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold border border-border rounded-lg text-center"
                    >
                      Cancel
                    </button>
                    
                    <button
                      id="billing-checkout-submit"
                      type="submit"
                      disabled={isProcessing || !cardNumber || !cardExpiry || !cardCvc}
                      className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-1.5"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Process Payment'
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
