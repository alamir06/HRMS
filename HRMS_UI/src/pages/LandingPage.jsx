import React, { useEffect } from 'react';
import Navbar from '../components/Landing/Navbar';
import HeroCarousel from '../components/Landing/HeroCarousel';
import LandingContent from '../components/Landing/LandingContent';
import FeaturesSection from '../components/Landing/FeaturesSection';
import NoticeCards from '../components/Landing/NoticeCards';
import Footer from '../components/Landing/Footer';

const LandingPage = () => {
  // Theme toggle placeholder logic (if requested eventually)
  useEffect(() => {
    // Ensuring basic color scheme consistency
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  return (
    <div className="landing-page">
      <Navbar />
      <HeroCarousel />
      <LandingContent />
      <FeaturesSection />
      <NoticeCards />
      <Footer />
    </div>
  );
};

export default LandingPage;
