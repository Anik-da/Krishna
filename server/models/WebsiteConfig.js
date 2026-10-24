import mongoose from 'mongoose';

const websiteConfigSchema = new mongoose.Schema({
  configType: {
    type: String,
    enum: ['published', 'draft'],
    required: true,
    unique: true,
    index: true
  },
  branding: {
    siteName: { type: String, default: 'Krishna Kripa — Bhagavad Gita Attendance Management' },
    logoUrl: { type: String, default: '' },
    logoHeight: { type: Number, default: 44, min: 24, max: 96 },
    logoPlacement: { type: String, enum: ['left', 'center'], default: 'left' },
    logoAltText: { type: String, default: 'Krishna Kripa Logo' },
    useCustomLogo: { type: Boolean, default: false },
    heroHeading: { type: String, default: 'Srimad Bhagavad Gita Weekend Classes' },
    heroSubtitle: { type: String, default: 'Timeless Vedic Wisdom for Character, Clarity, and Spiritual Growth' },
    aboutTitle: { type: String, default: 'About Krishna Kripa' },
    aboutContent: { 
      type: String, 
      default: 'Krishna Kripa is dedicated to sharing the timeless wisdom of the Bhagavad Gita with students and seekers every weekend. Through interactive sessions, guided discussions, and practical lifestyle applications, we nurture spiritual awareness, moral grounding, and inner peace.' 
    },
    gitaSectionTitle: { type: String, default: 'The Sacred Science of Bhagavad Gita' },
    gitaSectionContent: { 
      type: String, 
      default: 'Spoken by Lord Sri Krishna on the battlefield of Kurukshetra, the Bhagavad Gita offers eternal guidance for navigating stress, mastering duty without anxiety, and discovering the supreme path of devotional service (Bhakti Yoga).' 
    },
    footerText: { type: String, default: 'All glories to Sri Guru and Gauranga • Dedicated to Bhagavad Gita Study' },
    contactEmail: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    contactLocation: { type: String, default: '' }
  },
  styling: {
    bgImageUrl: { 
      type: String, 
      default: 'https://images.unsplash.com/photo-1641730259879-ad98e7db7bcb?crop=entropy&cs=srgb&fm=jpg&q=85' 
    },
    overlayOpacity: { type: Number, default: 0.90, min: 0.2, max: 0.99 },
    primaryColor: { type: String, default: '#1B4332' },
    secondaryColor: { type: String, default: '#8B4513' },
    accentColor: { type: String, default: '#FFD700' },
    heroAlignment: { type: String, enum: ['center', 'left'], default: 'center' },
    bannerImageUrl: { type: String, default: '' }
  },
  sectionsVisibility: {
    showHero: { type: Boolean, default: true },
    showClassStatus: { type: Boolean, default: true },
    showAbout: { type: Boolean, default: true },
    showGita: { type: Boolean, default: true },
    showContact: { type: Boolean, default: true }
  },
  lastUpdatedBy: { type: String, default: 'ANIK' },
  updatedAt: { type: Date, default: Date.now }
});

const WebsiteConfig = mongoose.model('WebsiteConfig', websiteConfigSchema);
export default WebsiteConfig;
