"use client"

import { Search, Eye, Calendar, CreditCard, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useLanguage } from "@/providers/language-provider"

export default function HowItWorks() {
  const { t } = useLanguage()
  const steps = [
    {
      icon: Search,
      title: t("home.how.steps.search.title"),
      description: t("home.how.steps.search.desc"),
      number: "01",
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600",
      borderColor: "border-orange-200",
    },
    {
      icon: Eye,
      title: t("home.how.steps.compare.title"),
      description: t("home.how.steps.compare.desc"),
      number: "02",
      bgColor: "bg-cyan-100",
      iconColor: "text-cyan-600",
      borderColor: "border-cyan-200",
    },
    {
      icon: Calendar,
      title: t("home.how.steps.book.title"),
      description: t("home.how.steps.book.desc"),
      number: "03",
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      borderColor: "border-green-200",
    },
    {
      icon: CreditCard,
      title: t("home.how.steps.pay.title"),
      description: t("home.how.steps.pay.desc"),
      number: "04",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      borderColor: "border-blue-200",
    },
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="container px-4 mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {t("home.how.title")}
          </h2>
          <p className="text-xl text-gray-600">
            {t("home.how.subtitle")}
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-12">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative group"
            >
              {/* Connecting Arrow (Desktop Only) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 left-full w-full h-px bg-gray-300 z-0">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-8 border-l-gray-300 border-y-4 border-y-transparent" />
                </div>
              )}

              <div className="relative h-full bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-orange-300 hover:shadow-lg transition-all duration-300">
                {/* Number Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">
                    {step.number}
                  </div>
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 ${step.bgColor} rounded-lg flex items-center justify-center mb-5`}>
                  <step.icon className={`w-7 h-7 ${step.iconColor}`} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>

                {/* CTA on first card */}
                {index === 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-semibold"
                    >
                      <Link href="/listings" className="flex items-center justify-center gap-2">
                        {t("home.how.startSearching")}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-6 text-lg">
            {t("home.how.readyCta")}
          </p>
          <Button
            size="lg"
            asChild
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-6 text-base rounded shadow-md"
          >
            <Link href="/listings" className="flex items-center gap-2">
              {t("home.how.browseAll")}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
