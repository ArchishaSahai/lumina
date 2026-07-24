import { CTA } from "@/components/landing/CTA";
import { Features } from "@/components/landing/Features";
import { FeaturedNotebooks } from "@/components/landing/FeaturedNotebooks";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { Navbar } from "@/components/landing/Navbar";
import { ProductDemo } from "@/components/landing/ProductDemo";
import { Timeline } from "@/components/landing/Timeline";
import { UploadSection } from "@/components/landing/UploadSection";

export default function Home() {
  return (
    <main className="overflow-hidden bg-black text-white">
      <Navbar />
      <Hero />
      <ProductDemo />
      <UploadSection />
      <Features />
      <FeaturedNotebooks />
      <Timeline />
      <CTA />
      <Footer />
    </main>
  );
}
