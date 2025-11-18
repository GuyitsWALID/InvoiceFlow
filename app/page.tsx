'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Upload,
  FileText,
  CheckCircle2,
  RefreshCw,
  Globe,
  Eye,
  Zap,
  Shield,
  ArrowRight,
  Star,
  Play,
  Lock,
  Check,
  ChevronRight,
} from 'lucide-react'

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    // Redirect to signup with file
    window.location.href = '/signup'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFF] to-[#F2F6FF] dark:from-[#0B1020] dark:to-[#101329]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 dark:bg-[#0F1724]/80 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="container mx-auto px-6 py-4 max-w-[1320px]">
          <div className="flex items-center justify-between">
            <Link 
              href="/" 
              className="flex items-center space-x-2 hover:-translate-y-0.5 transition-transform"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-[#3B82F6] to-[#7C3AED] bg-clip-text text-transparent">
                InvoiceFlow
              </span>
            </Link>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-sm font-medium text-[#475569] dark:text-gray-300 hover:text-[#3B82F6] dark:hover:text-[#22D3EE] transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-[#475569] dark:text-gray-300 hover:text-[#3B82F6] dark:hover:text-[#22D3EE] transition-colors">
                How it works
              </a>
              <a href="#pricing" className="text-sm font-medium text-[#475569] dark:text-gray-300 hover:text-[#3B82F6] dark:hover:text-[#22D3EE] transition-colors">
                Pricing
              </a>
              <a href="#reviews" className="text-sm font-medium text-[#475569] dark:text-gray-300 hover:text-[#3B82F6] dark:hover:text-[#22D3EE] transition-colors">
                Reviews
              </a>
            </div>

            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <Button variant="outline" size="sm" className="hidden sm:flex" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button size="sm" className="bg-gradient-to-r from-[#3B82F6] to-[#7C3AED] hover:scale-105 transition-transform shadow-lg" asChild>
                <Link href="/signup">Start for Free</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-24 pb-32 max-w-[1320px]">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <Badge className="bg-gradient-to-r from-[#3B82F6]/10 to-[#7C3AED]/10 text-[#3B82F6] dark:text-[#22D3EE] border-[#3B82F6]/20 px-4 py-1 text-sm font-semibold">
              ✨ AI-Powered Invoice Processing
            </Badge>
            
            <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-[#1E40AF] via-[#3B82F6] to-[#7C3AED] dark:from-[#60A5FA] dark:via-[#22D3EE] dark:to-[#A78BFA] bg-clip-text text-transparent">
                Invoice processing
              </span>
              <br />
              <span className="text-[#0F172A] dark:text-white">
                made effortless
              </span>
            </h1>

            <p className="text-lg text-[#475569] dark:text-gray-300 leading-relaxed max-w-xl">
              Upload, extract, and sync your invoices automatically. InvoiceFlow uses advanced AI to read any invoice format and sync directly to your accounting software—saving you hours every week.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-[#3B82F6] to-[#7C3AED] hover:scale-105 transition-all shadow-xl text-base font-semibold px-8 py-6 rounded-full" 
                asChild
              >
                <Link href="/signup">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base font-semibold px-8 py-6 rounded-full border-2 hover:bg-[#3B82F6]/5" 
                asChild
              >
                <Link href="#how-it-works">
                  <Play className="mr-2 h-5 w-5" />
                  See How It Works
                </Link>
              </Button>
            </div>

            <div className="flex items-center gap-8 pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
                <span className="text-sm text-[#475569] dark:text-gray-400">No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
                <span className="text-sm text-[#475569] dark:text-gray-400">Free plan forever</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#3B82F6]/20 to-[#7C3AED]/20 blur-3xl rounded-full" />
            <Card className="relative overflow-hidden border-2 border-[#3B82F6]/20 shadow-2xl backdrop-blur-sm bg-white/80 dark:bg-[#1E293B]/80 rounded-3xl">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] rounded-xl flex items-center justify-center">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-[#0F172A] dark:text-white">Dashboard</p>
                        <p className="text-xs text-[#64748B]">Overview</p>
                      </div>
                    </div>
                    <Badge className="bg-[#10B981]/10 text-[#10B981] border-0">Active</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Invoices Processed', value: '1,234', color: 'from-[#3B82F6] to-[#7C3AED]' },
                      { label: 'Hours Saved', value: '567', color: 'from-[#10B981] to-[#22C55E]' },
                      { label: 'Accuracy', value: '99.8%', color: 'from-[#F59E0B] to-[#EAB308]' },
                      { label: 'Auto-synced', value: '1,189', color: 'from-[#EC4899] to-[#D946EF]' },
                    ].map((stat, idx) => (
                      <div 
                        key={idx} 
                        className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200/50 dark:border-gray-700/50"
                      >
                        <p className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                          {stat.value}
                        </p>
                        <p className="text-xs text-[#64748B] mt-1">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-white">Recent Activity</p>
                    {[
                      { icon: CheckCircle2, text: 'Invoice #1234 synced to Xero', color: 'text-[#10B981]' },
                      { icon: Eye, text: 'Invoice #1233 reviewed by Alex', color: 'text-[#3B82F6]' },
                      { icon: Upload, text: 'Invoice #1232 uploaded', color: 'text-[#7C3AED]' },
                    ].map((activity, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/50 dark:bg-gray-800/30">
                        <activity.icon className={`h-4 w-4 ${activity.color}`} />
                        <span className="text-sm text-[#475569] dark:text-gray-300">{activity.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Upload Section - Conversion Driver */}
      <section className="bg-white dark:bg-[#0F1724] py-24">
        <div className="container mx-auto px-6 max-w-[1320px]">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-extrabold text-[#0F172A] dark:text-white mb-4">
              Try it now—no signup needed
            </h2>
            <p className="text-lg text-[#475569] dark:text-gray-300">
              Upload an invoice to see InvoiceFlow in action. We'll extract all the data instantly.
            </p>
          </div>

          <Card 
            className={`max-w-2xl mx-auto border-2 border-dashed rounded-2xl transition-all duration-300 ${
              isDragging 
                ? 'border-[#3B82F6] bg-[#3B82F6]/5 scale-[1.02]' 
                : 'border-gray-300 dark:border-gray-700 hover:border-[#3B82F6]/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center space-y-6">
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-[#3B82F6]/10 to-[#7C3AED]/10 flex items-center justify-center transition-transform ${
                  isDragging ? 'scale-110' : ''
                }`}>
                  <Upload className="h-10 w-10 text-[#3B82F6]" />
                </div>

                <div>
                  <p className="text-xl font-bold text-[#0F172A] dark:text-white mb-2">
                    Drop your invoice here or click to upload
                  </p>
                  <p className="text-sm text-[#64748B]">
                    Supports PDF, PNG, JPG • Max 10MB
                  </p>
                </div>

                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-[#3B82F6] to-[#7C3AED] hover:scale-105 transition-transform px-8 rounded-full" 
                  asChild
                >
                  <Link href="/signup">
                    Choose File
                  </Link>
                </Button>

                <div className="flex items-center gap-2 text-xs text-[#64748B]">
                  <Lock className="h-3 w-3" />
                  <span>Your files are encrypted and secure</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-6 py-32 max-w-[1320px]">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <Badge className="bg-gradient-to-r from-[#3B82F6]/10 to-[#7C3AED]/10 text-[#3B82F6] dark:text-[#22D3EE] border-[#3B82F6]/20 px-4 py-1 text-sm font-semibold mb-6">
            Features
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-[#0F172A] dark:text-white mb-4">
            Everything you need to manage invoices
          </h2>
          <p className="text-lg text-[#475569] dark:text-gray-300">
            Powerful features that save you time and eliminate manual data entry.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              icon: Zap,
              title: 'Smart Extraction',
              description: 'AI extracts invoice data with 99.8% accuracy—vendor, amount, date, line items, and more.',
              gradient: 'from-[#3B82F6] to-[#7C3AED]',
            },
            {
              icon: RefreshCw,
              title: 'Seamless Sync',
              description: 'Connects directly to Xero, QuickBooks, MYOB, and more. One click to sync invoices.',
              gradient: 'from-[#10B981] to-[#22C55E]',
            },
            {
              icon: Eye,
              title: 'Human Review',
              description: 'Review and approve extracted data before syncing. Full control with minimal effort.',
              gradient: 'from-[#F59E0B] to-[#EAB308]',
            },
            {
              icon: Globe,
              title: 'Global Ready',
              description: 'Supports multiple currencies, tax systems, and languages. Works anywhere.',
              gradient: 'from-[#EC4899] to-[#D946EF]',
            },
          ].map((feature, idx) => (
            <Card 
              key={idx} 
              className="group border-2 border-gray-200/50 dark:border-gray-800/50 hover:border-[#3B82F6]/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 rounded-2xl bg-white/80 dark:bg-[#1E293B]/80 backdrop-blur-sm"
            >
              <CardContent className="p-8 space-y-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#0F172A] dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-[#475569] dark:text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-gradient-to-br from-[#3B82F6]/5 to-[#7C3AED]/5 dark:from-[#3B82F6]/10 dark:to-[#7C3AED]/10 py-32">
        <div className="container mx-auto px-6 max-w-[1320px]">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <Badge className="bg-white dark:bg-[#1E293B] text-[#3B82F6] border-0 px-4 py-1 text-sm font-semibold mb-6 shadow-lg">
              How It Works
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-[#0F172A] dark:text-white mb-4">
              From upload to accounting in 4 simple steps
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Connecting lines */}
            <div className="hidden lg:block absolute top-16 left-0 right-0 h-1">
              <div className="h-full bg-gradient-to-r from-[#3B82F6] via-[#7C3AED] to-[#10B981] opacity-20" style={{ width: '80%', marginLeft: '10%' }} />
            </div>

            {[
              {
                step: '1',
                title: 'Upload',
                description: 'Drag and drop your invoice or connect Google Drive/Dropbox.',
                icon: Upload,
                color: 'from-[#3B82F6] to-[#7C3AED]',
              },
              {
                step: '2',
                title: 'Extract',
                description: 'AI reads and extracts all invoice data automatically.',
                icon: Zap,
                color: 'from-[#7C3AED] to-[#EC4899]',
              },
              {
                step: '3',
                title: 'Review',
                description: 'Quickly review extracted data and make any adjustments.',
                icon: Eye,
                color: 'from-[#EC4899] to-[#F59E0B]',
              },
              {
                step: '4',
                title: 'Sync',
                description: 'Push to your accounting software with one click.',
                icon: CheckCircle2,
                color: 'from-[#F59E0B] to-[#10B981]',
              },
            ].map((step, idx) => (
              <div key={idx} className="relative">
                <Card className="border-2 border-white dark:border-gray-800 shadow-xl rounded-2xl bg-white dark:bg-[#1E293B] h-full hover:scale-105 transition-transform">
                  <CardContent className="p-8 text-center space-y-4">
                    <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
                      {step.step}
                    </div>
                    <step.icon className="h-8 w-8 mx-auto text-[#3B82F6] dark:text-[#22D3EE]" />
                    <h3 className="text-xl font-bold text-[#0F172A] dark:text-white">
                      {step.title}
                    </h3>
                    <p className="text-[#475569] dark:text-gray-300 leading-relaxed">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-6 py-32 max-w-[1320px]">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge className="bg-gradient-to-r from-[#3B82F6]/10 to-[#7C3AED]/10 text-[#3B82F6] dark:text-[#22D3EE] border-[#3B82F6]/20 px-4 py-1 text-sm font-semibold mb-6">
            Pricing
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-[#0F172A] dark:text-white mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-[#475569] dark:text-gray-300 mb-8">
            Start free, upgrade when you&apos;re ready. No hidden fees.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-semibold ${billingCycle === 'monthly' ? 'text-[#0F172A] dark:text-white' : 'text-[#64748B]'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="relative w-14 h-7 bg-gray-200 dark:bg-gray-700 rounded-full transition-colors"
            >
              <div className={`absolute top-1 left-1 w-5 h-5 bg-gradient-to-r from-[#3B82F6] to-[#7C3AED] rounded-full transition-transform ${
                billingCycle === 'annual' ? 'translate-x-7' : ''
              }`} />
            </button>
            <span className={`text-sm font-semibold ${billingCycle === 'annual' ? 'text-[#0F172A] dark:text-white' : 'text-[#64748B]'}`}>
              Annual
            </span>
            {billingCycle === 'annual' && (
              <Badge className="bg-[#10B981]/10 text-[#10B981] border-0 animate-pulse">
                Save 2 months!
              </Badge>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <Card className="border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl bg-white dark:bg-[#1E293B] hover:shadow-xl transition-shadow">
            <CardContent className="p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-[#0F172A] dark:text-white mb-2">
                  Free
                </h3>
                <p className="text-[#64748B]">Perfect for trying out InvoiceFlow</p>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-[#0F172A] dark:text-white">$0</span>
                <span className="text-[#64748B]">/month</span>
              </div>

              <Button 
                variant="outline" 
                className="w-full rounded-full border-2 hover:bg-[#3B82F6]/5 font-semibold" 
                asChild
              >
                <Link href="/signup">Get Started</Link>
              </Button>

              <div className="space-y-3 pt-4">
                {[
                  '1 invoice per month',
                  '1 team member',
                  'OCR & AI extraction',
                  'Basic accounting sync',
                  'Email support',
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-[#10B981]" />
                    <span className="text-[#475569] dark:text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="border-2 border-[#3B82F6] dark:border-[#22D3EE] rounded-2xl bg-gradient-to-br from-white to-[#F8FAFF] dark:from-[#1E293B] dark:to-[#0F1724] shadow-2xl relative hover:scale-105 transition-transform">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-[#3B82F6] to-[#7C3AED] text-white border-0 px-6 py-1 text-sm font-bold shadow-lg">
                RECOMMENDED
              </Badge>
            </div>
            
            <CardContent className="p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-[#0F172A] dark:text-white mb-2">
                  Pro
                </h3>
                <p className="text-[#64748B]">For growing businesses</p>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold bg-gradient-to-r from-[#3B82F6] to-[#7C3AED] bg-clip-text text-transparent">
                  ${billingCycle === 'monthly' ? '9.99' : '8.33'}
                </span>
                <span className="text-[#64748B]">/month</span>
              </div>

              {billingCycle === 'annual' && (
                <p className="text-sm text-[#64748B]">
                  Billed annually at $99.99/year
                </p>
              )}

              <Button 
                className="w-full bg-gradient-to-r from-[#3B82F6] to-[#7C3AED] hover:scale-105 transition-transform rounded-full font-bold shadow-lg" 
                asChild
              >
                <Link href="/signup">Start Pro Trial</Link>
              </Button>

              <div className="space-y-3 pt-4">
                {[
                  'Unlimited invoices',
                  'Unlimited team members',
                  'Advanced AI extraction',
                  'All accounting integrations',
                  'Priority support',
                  'API access',
                  'Custom workflows',
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-[#10B981]" />
                    <span className="text-[#475569] dark:text-gray-300 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="bg-gradient-to-br from-[#3B82F6]/5 to-[#7C3AED]/5 dark:from-[#3B82F6]/10 dark:to-[#7C3AED]/10 py-32">
        <div className="container mx-auto px-6 max-w-[1320px]">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <Badge className="bg-white dark:bg-[#1E293B] text-[#3B82F6] border-0 px-4 py-1 text-sm font-semibold mb-6 shadow-lg">
              Reviews
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-[#0F172A] dark:text-white mb-4">
              Loved by businesses worldwide
            </h2>
            <p className="text-lg text-[#475569] dark:text-gray-300">
              Join thousands of companies saving time with InvoiceFlow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Sarah Chen',
                role: 'CFO, TechStartup Inc.',
                avatar: 'SC',
                rating: 5,
                text: 'InvoiceFlow cut our invoice processing time by 80%. The AI extraction is incredibly accurate, and the team loves how easy it is to use.',
              },
              {
                name: 'Michael Roberts',
                role: 'Accountant, Roberts & Co.',
                avatar: 'MR',
                rating: 5,
                text: 'We process hundreds of invoices monthly. InvoiceFlow&apos;s automation has been a game-changer. The Xero integration works flawlessly.',
              },
              {
                name: 'Emily Davis',
                role: 'Operations Manager, GreenBuild',
                avatar: 'ED',
                rating: 5,
                text: 'Setup took minutes, not days. The human review step gives us confidence while still saving massive amounts of time. Highly recommend!',
              },
            ].map((review, idx) => (
              <Card key={idx} className="border-2 border-white dark:border-gray-800 shadow-xl rounded-2xl bg-white dark:bg-[#1E293B] hover:scale-105 transition-transform">
                <CardContent className="p-8 space-y-6">
                  <div className="flex gap-1">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-[#F59E0B] text-[#F59E0B]" />
                    ))}
                  </div>

                  <p className="text-[#475569] dark:text-gray-300 leading-relaxed italic">
                    &quot;{review.text}&quot;
                  </p>

                  <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] flex items-center justify-center text-white font-bold">
                      {review.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-[#0F172A] dark:text-white">{review.name}</p>
                      <p className="text-sm text-[#64748B]">{review.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Secondary CTA Section */}
      <section className="container mx-auto px-6 py-32 max-w-[1320px]">
        <Card className="bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] border-0 rounded-3xl shadow-2xl overflow-hidden">
          <CardContent className="p-16 text-center space-y-8">
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white">
              Ready to transform your invoice workflow?
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Join thousands of businesses saving time and money with InvoiceFlow. Start your free trial today—no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                className="bg-white text-[#3B82F6] hover:bg-gray-100 hover:scale-105 transition-all shadow-xl text-base font-semibold px-8 py-6 rounded-full" 
                asChild
              >
                <Link href="/signup">
                  Start for Free
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-transparent border-2 border-white text-white hover:bg-white/10 text-base font-semibold px-8 py-6 rounded-full" 
                asChild
              >
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F172A] dark:bg-[#0B0E14] text-white py-16 border-t border-gray-800">
        <div className="container mx-auto px-6 max-w-[1320px]">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand Column */}
            <div className="space-y-4">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">InvoiceFlow</span>
              </Link>
              <p className="text-gray-400 text-sm leading-relaxed">
                AI-powered invoice processing that saves you time and eliminates manual data entry.
              </p>
              <div className="flex gap-4 pt-2">
                <Shield className="h-5 w-5 text-gray-400" />
                <Lock className="h-5 w-5 text-gray-400" />
                <CheckCircle2 className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors">How it Works</a></li>
                <li><a href="#reviews" className="text-gray-400 hover:text-white transition-colors">Reviews</a></li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Newsletter Column */}
            <div>
              <h4 className="font-bold mb-4">Stay Updated</h4>
              <p className="text-gray-400 text-sm mb-4">
                Get tips and updates delivered to your inbox.
              </p>
              <div className="flex gap-2">
                <Input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 rounded-lg"
                />
                <Button className="bg-gradient-to-r from-[#3B82F6] to-[#7C3AED] shrink-0">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © 2025 InvoiceFlow. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
