import WebsiteConfig from '../models/WebsiteConfig.js';
import AdminActivity from '../models/AdminActivity.js';

const DEFAULT_CONFIG = {
  branding: {
    siteName: 'Krishna Kripa — Bhagavad Gita Attendance Management',
    logoUrl: '',
    logoHeight: 44,
    logoPlacement: 'left',
    logoAltText: 'Krishna Kripa Logo',
    useCustomLogo: false,
    heroHeading: 'Srimad Bhagavad Gita Weekend Classes',
    heroSubtitle: 'Timeless Vedic Wisdom for Character, Clarity, and Spiritual Growth',
    aboutTitle: 'About Krishna Kripa',
    aboutContent: 'Krishna Kripa is dedicated to sharing the timeless wisdom of the Bhagavad Gita with students and seekers every weekend. Through interactive sessions, guided discussions, and practical lifestyle applications, we nurture spiritual awareness, moral grounding, and inner peace.',
    gitaSectionTitle: 'The Sacred Science of Bhagavad Gita',
    gitaSectionContent: 'Spoken by Lord Sri Krishna on the battlefield of Kurukshetra, the Bhagavad Gita offers eternal guidance for navigating stress, mastering duty without anxiety, and discovering the supreme path of devotional service (Bhakti Yoga).',
    footerText: 'All glories to Sri Guru and Gauranga • Dedicated to Bhagavad Gita Study',
    contactEmail: '',
    contactPhone: '',
    contactLocation: ''
  },
  styling: {
    bgImageUrl: 'https://images.unsplash.com/photo-1641730259879-ad98e7db7bcb?crop=entropy&cs=srgb&fm=jpg&q=85',
    overlayOpacity: 0.90,
    primaryColor: '#1B4332',
    secondaryColor: '#8B4513',
    accentColor: '#FFD700',
    heroAlignment: 'center',
    bannerImageUrl: ''
  },
  sectionsVisibility: {
    showHero: true,
    showClassStatus: true,
    showAbout: true,
    showGita: true,
    showContact: true
  }
};

// GET /api/config/published (Public)
export const getPublishedConfig = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    let config = await WebsiteConfig.findOne({ configType: 'published' });
    if (!config) {
      config = await WebsiteConfig.create({
        configType: 'published',
        ...DEFAULT_CONFIG
      });
    }
    return res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      data: { configType: 'published', ...DEFAULT_CONFIG }
    });
  }
};

// GET /api/config/draft (Admin only)
export const getDraftConfig = async (req, res) => {
  try {
    let config = await WebsiteConfig.findOne({ configType: 'draft' });
    if (!config) {
      const published = await WebsiteConfig.findOne({ configType: 'published' });
      const initial = published ? published.toObject() : DEFAULT_CONFIG;
      delete initial._id;
      config = await WebsiteConfig.create({
        ...initial,
        configType: 'draft'
      });
    }
    return res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch draft config: ' + error.message
    });
  }
};

// PUT /api/config/draft (Admin only)
export const saveDraftConfig = async (req, res) => {
  try {
    const { branding, styling, sectionsVisibility } = req.body;
    
    // Basic validation & sanitization
    const updateData = {
      branding: { ...DEFAULT_CONFIG.branding, ...branding },
      styling: { ...DEFAULT_CONFIG.styling, ...styling },
      sectionsVisibility: { ...DEFAULT_CONFIG.sectionsVisibility, ...sectionsVisibility },
      lastUpdatedBy: req.admin?.username || 'ANIK',
      updatedAt: new Date()
    };

    const config = await WebsiteConfig.findOneAndUpdate(
      { configType: 'draft' },
      { $set: updateData },
      { returnDocument: 'after', upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Draft settings saved successfully.',
      data: config
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to save draft settings: ' + error.message
    });
  }
};

// POST /api/config/publish (Admin only)
export const publishConfig = async (req, res) => {
  try {
    const draft = await WebsiteConfig.findOne({ configType: 'draft' });
    const draftData = draft ? draft.toObject() : {};
    
    // Priority: Explicitly published config in req.body > draft > default
    const clientConfig = (req.body && (req.body.branding || req.body.styling)) ? req.body : {};
    
    const configToPublish = {
      ...DEFAULT_CONFIG,
      ...draftData,
      ...clientConfig,
      branding: {
        ...DEFAULT_CONFIG.branding,
        ...(draftData.branding || {}),
        ...(clientConfig.branding || {})
      },
      styling: {
        ...DEFAULT_CONFIG.styling,
        ...(draftData.styling || {}),
        ...(clientConfig.styling || {})
      },
      sectionsVisibility: {
        ...DEFAULT_CONFIG.sectionsVisibility,
        ...(draftData.sectionsVisibility || {}),
        ...(clientConfig.sectionsVisibility || {})
      }
    };

    // 1. Explicitly handle custom logo state from client payload
    if (clientConfig.branding) {
      if (clientConfig.branding.useCustomLogo === false || !clientConfig.branding.logoUrl || !clientConfig.branding.logoUrl.trim()) {
        configToPublish.branding.logoUrl = '';
        configToPublish.branding.useCustomLogo = false;
      } else {
        configToPublish.branding.logoUrl = clientConfig.branding.logoUrl.trim();
        configToPublish.branding.useCustomLogo = true;
      }
    } else if (draftData.branding) {
      configToPublish.branding.logoUrl = draftData.branding.useCustomLogo ? (draftData.branding.logoUrl || '') : '';
      configToPublish.branding.useCustomLogo = Boolean(draftData.branding.useCustomLogo && draftData.branding.logoUrl);
    }

    delete configToPublish._id;
    delete configToPublish.createdAt;

    configToPublish.configType = 'published';
    configToPublish.version = Date.now(); // Cache-busting version
    configToPublish.lastUpdatedBy = req.admin?.username || 'ANIK';
    configToPublish.updatedAt = new Date();

    const published = await WebsiteConfig.findOneAndUpdate(
      { configType: 'published' },
      { $set: configToPublish },
      { returnDocument: 'after', upsert: true }
    );

    // Keep draft synchronized with published
    await WebsiteConfig.findOneAndUpdate(
      { configType: 'draft' },
      { $set: { ...configToPublish, configType: 'draft' } },
      { upsert: true }
    );

    await AdminActivity.create({
      activityType: 'SETTINGS_UPDATE',
      description: 'Published website appearance, logo, and branding customizations to live public site in MongoDB Atlas.',
      adminUsername: req.admin?.username || 'ANIK',
      details: { timestamp: new Date().toISOString() }
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Website appearance published successfully to live website!',
      data: published
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to publish settings: ' + error.message
    });
  }
};

// POST /api/config/reset (Admin only)
export const resetConfig = async (req, res) => {
  try {
    const resetData = {
      ...DEFAULT_CONFIG,
      lastUpdatedBy: req.admin?.username || 'ANIK',
      updatedAt: new Date()
    };

    await WebsiteConfig.findOneAndUpdate(
      { configType: 'draft' },
      { $set: { ...resetData, configType: 'draft' } },
      { upsert: true }
    );

    const published = await WebsiteConfig.findOneAndUpdate(
      { configType: 'published' },
      { $set: { ...resetData, configType: 'published' } },
      { new: true, upsert: true }
    );

    await AdminActivity.create({
      activityType: 'SETTINGS_UPDATE',
      description: 'Reset website appearance and branding to authentic default theme.',
      adminUsername: req.admin?.username || 'ANIK',
      details: { timestamp: new Date().toISOString() }
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Website appearance successfully reset to default.',
      data: published
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reset settings: ' + error.message
    });
  }
};

// POST /api/config/upload-logo (Admin only)
export const uploadLogo = async (req, res) => {
  try {
    const { imageBase64, mimeType, fileName } = req.body;

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({
        success: false,
        message: 'No logo image data provided.'
      });
    }

    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file format. Please upload PNG, JPG, WebP, or SVG.'
      });
    }

    // Size check (max 5MB)
    const approximateSizeBytes = (imageBase64.length * 3) / 4;
    if (approximateSizeBytes > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Logo file size exceeds 5MB limit. Please upload a smaller image.'
      });
    }

    let sanitizedDataUrl = '';
    if (mimeType.toLowerCase() === 'image/svg+xml') {
      // Decode SVG and sanitize against script tags and javascript: hrefs
      const buffer = Buffer.from(imageBase64, 'base64');
      let svgText = buffer.toString('utf-8');
      
      // Strict SVG sanitization
      svgText = svgText
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
        .replace(/href\s*=\s*['"]javascript:[^'"]*['"]/gi, 'href="#"')
        .replace(/xlink:href\s*=\s*['"]javascript:[^'"]*['"]/gi, 'xlink:href="#"');

      const sanitizedBase64 = Buffer.from(svgText).toString('base64');
      sanitizedDataUrl = `data:image/svg+xml;base64,${sanitizedBase64}`;
    } else {
      sanitizedDataUrl = `data:${mimeType};base64,${imageBase64}`;
    }

    // Update Draft config in MongoDB Atlas
    const draft = await WebsiteConfig.findOneAndUpdate(
      { configType: 'draft' },
      { 
        $set: { 
          'branding.logoUrl': sanitizedDataUrl,
          'branding.useCustomLogo': true,
          lastUpdatedBy: req.admin?.username || 'ANIK',
          updatedAt: new Date()
        } 
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Logo uploaded and set in draft! Click Publish to apply live.',
      logoUrl: sanitizedDataUrl,
      draftConfig: draft
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Logo upload failed: ' + error.message
    });
  }
};

// POST /api/config/remove-logo (Admin only)
export const removeLogo = async (req, res) => {
  try {
    const update = {
      'branding.logoUrl': '',
      'branding.useCustomLogo': false,
      lastUpdatedBy: req.admin?.username || 'ANIK',
      updatedAt: new Date()
    };

    const draft = await WebsiteConfig.findOneAndUpdate(
      { configType: 'draft' },
      { $set: update },
      { returnDocument: 'after', upsert: true }
    );

    const published = await WebsiteConfig.findOneAndUpdate(
      { configType: 'published' },
      { $set: update },
      { returnDocument: 'after', upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Custom logo removed from database. Sacred Devotional Crest restored.',
      data: published,
      draftConfig: draft
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to remove logo: ' + error.message
    });
  }
};
