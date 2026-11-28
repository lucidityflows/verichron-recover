import { Navbar } from './components/layout/Navbar.js';
import { Footer } from './components/layout/Footer.js';
import { HeroSection } from './components/sections/HeroSection.js';
import { AboutSection } from './components/sections/AboutSection.js';
import { PlatformSection } from './components/sections/PlatformSection.js';
import { RoadmapSection } from './components/sections/RoadmapSection.js';
import { FeaturesSection } from './components/sections/FeaturesSection.js';
import { ArchitectureSection } from './components/sections/ArchitectureSection.js';
import { AlphaProgramSection } from './components/sections/AlphaProgramSection.js';
import { InvestorsSection } from './components/sections/InvestorsSection.js';
import { ContactSection } from './components/sections/ContactSection.js';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background text-foreground">
      <Navbar />
      <HeroSection />
      <AboutSection />
      <PlatformSection />
      <RoadmapSection />
      <FeaturesSection />
      <ArchitectureSection />
      <AlphaProgramSection />
      <InvestorsSection />
      <ContactSection />
      <Footer />
    </div>
  );
}

export default App;
