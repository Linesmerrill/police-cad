import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Stats from '@/components/Stats';
import WhatWeDo from '@/components/WhatWeDo';
import Features from '@/components/Features';
import ContentCreators from '@/components/ContentCreators';
import Feedback from '@/components/Feedback';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main
      className="min-h-screen"
      style={{
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100vw',
        backgroundColor: '#0a0a0f',
        position: 'relative',
        margin: 0,
        padding: 0,
        overflowX: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      <Navbar />
      <Hero />
      <Stats />
      <WhatWeDo />
      <Features />
      <ContentCreators />
      <Feedback />
      <Footer />
    </main>
  );
}

