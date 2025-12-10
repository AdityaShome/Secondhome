"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Home, Shield, Award, Users, Clock } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"

export default function AboutPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="container px-4 mx-auto">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-6">
            {t("about.heroTitle")}
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t("about.heroSubtitle")}
          </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="h-12 px-6" asChild>
              <Link href="/listings">{t("about.hero.ctaPrimary")}</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-6" asChild>
              <Link href="/contact">{t("about.hero.ctaSecondary")}</Link>
              </Button>
            </div>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
      </section>

      {/* Our Story Section */}
      <section className="py-20">
        <div className="container px-4 mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
            <h2 className="text-3xl font-bold mb-6">{t("about.story.title")}</h2>
              <div className="space-y-4 text-muted-foreground">
              <p>{t("about.story.p1")}</p>
              <p>{t("about.story.p2")}</p>
              <p>{t("about.story.p3")}</p>
              <p>{t("about.story.p4")}</p>
              <p className="pt-4">{t("about.story.p5")}</p>
              </div>
            </motion.div>
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="relative w-full min-h-[500px] rounded-2xl overflow-hidden shadow-xl bg-gray-50 flex items-center justify-center">
                <Image
                  src="/second_home_about.png"
                  alt="Second Home - Student accommodation platform"
                  width={800}
                  height={600}
                  className="object-contain w-full h-auto"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-lg shadow-lg z-10">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Home className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t("about.story.callout.title")}</p>
                    <p className="text-xs text-muted-foreground">{t("about.story.callout.subtitle")}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Values Section */}
      <section className="py-20 bg-gray-50">
        <div className="container px-4 mx-auto">
          <motion.div
            className="max-w-3xl mx-auto text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
          <h2 className="text-3xl font-bold mb-4">{t("about.values.title")}</h2>
          <p className="text-lg text-muted-foreground">{t("about.values.subtitle")}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Shield,
              title: t("about.values.card1.title"),
              description: t("about.values.card1.desc"),
              },
              {
                icon: Users,
              title: t("about.values.card2.title"),
              description: t("about.values.card2.desc"),
              },
              {
                icon: Award,
              title: t("about.values.card3.title"),
              description: t("about.values.card3.desc"),
              },
              {
                icon: Clock,
              title: t("about.values.card4.title"),
              description: t("about.values.card4.desc"),
              },
            ].map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                      <value.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{value.title}</h3>
                    <p className="text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <div className="container px-4 mx-auto">
          <motion.div
            className="max-w-3xl mx-auto text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
          <h2 className="text-3xl font-bold mb-4">{t("about.team.title")}</h2>
          <p className="text-lg text-muted-foreground">{t("about.team.subtitle")}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: "Srijit Das",
                role: "Founder",
                image: "/Srijit_secondhome.jpeg",
                bio: "Dayananda Sagar College of Engineering",
              },
              {
                name: "Kausheya Roy",
                role: "Co-founder",
                image: "/Kausheya_secondhome.jpeg",
                bio: "IIIT Hyderabad",
              },
              {
                name: "Aditya Shome",
                role: "Co-founder",
                image: "/Aditya_secondhome.jpg",
                bio: "Dayananda Sagar College of Engineering",
              },
            ].map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-md transition-shadow duration-200 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="relative w-full h-80 bg-gray-100 overflow-hidden">
                      <Image 
                        src={member.image || "/placeholder.svg"} 
                        alt={member.name} 
                        fill 
                        className="object-contain object-center"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-1">{member.name}</h3>
                      <p className="text-primary font-medium mb-3">{member.role}</p>
                      <p className="text-muted-foreground">{member.bio}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container px-4 mx-auto">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
          <h2 className="text-3xl font-bold mb-6">{t("about.cta.title")}</h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t("about.cta.subtitle")}
          </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="h-12 px-8" asChild>
              <Link href="/listings">{t("about.cta.primary")}</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8" asChild>
              <Link href="/register-property">{t("about.cta.secondary")}</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
