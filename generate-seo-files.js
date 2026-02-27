const fs = require('fs');
const path = require('path');

// SEO Keywords extracted from requirements
const keywords = [
    'transport in hyderabad',
    'friends transport',
    'friends transport company',
    'karimnagar to hyderabad transport',
    'hyderabad transport services',
    'reliable transport in telangana',
    'godavari khani to hyderabad transport',
    'secunderabad transport',
    'parcel service hyderabad',
    'goods transport hyderabad',
    'cargo service telangana',
    'hyderabad to karimnagar transport',
    'telangana transport company',
    'friends transport co',
    'ftc transport',
    'parcel tracking hyderabad',
    'logistics hyderabad',
    'freight service telangana'
];

// Service locations
const locations = [
    'Hyderabad',
    'Secunderabad',
    'Karimnagar',
    'Godavari Khani',
    'Telangana'
];

// Generate sitemap.xml
const generateSitemap = () => {
    const baseURL = 'https://friendstransport.in';
    const currentDate = new Date().toISOString().split('T')[0];
    
    const urls = [
        { loc: '/', priority: '1.0', changefreq: 'daily' },
        { loc: '/track', priority: '0.9', changefreq: 'daily' },
        { loc: '/about', priority: '0.8', changefreq: 'monthly' },
        { loc: '/services', priority: '0.8', changefreq: 'monthly' },
        { loc: '/contact', priority: '0.7', changefreq: 'monthly' },
        { loc: '/locations', priority: '0.7', changefreq: 'monthly' }
    ];
    
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    urls.forEach(url => {
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseURL}${url.loc}</loc>\n`;
        sitemap += `    <lastmod>${currentDate}</lastmod>\n`;
        sitemap += `    <changefreq>${url.changefreq}</changefreq>\n`;
        sitemap += `    <priority>${url.priority}</priority>\n`;
        sitemap += '  </url>\n';
    });
    
    sitemap += '</urlset>';
    
    fs.writeFileSync(path.join(__dirname, 'public', 'sitemap.xml'), sitemap);
    console.log('✅ sitemap.xml generated');
};

// Generate robots.txt
const generateRobotsTxt = () => {
    const baseURL = 'https://friendstransport.in';
    
    const robots = `# Friends Transport Company - Robots.txt
User-agent: *
Allow: /
Allow: /track
Allow: /about
Allow: /services
Allow: /contact
Allow: /locations
Disallow: /api/
Disallow: /admin/
Disallow: /login

Sitemap: ${baseURL}/sitemap.xml

# Crawl-delay for polite crawling
Crawl-delay: 1
`;
    
    fs.writeFileSync(path.join(__dirname, 'public', 'robots.txt'), robots);
    console.log('✅ robots.txt generated');
};

// Generate SEO-optimized landing page
const generateLandingPage = () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Primary Meta Tags -->
    <title>Friends Transport Company | Reliable Transport Services in Hyderabad, Telangana</title>
    <meta name="title" content="Friends Transport Company | Reliable Transport Services in Hyderabad, Telangana">
    <meta name="description" content="Friends Transport Company (FTC) - Leading transport and logistics service provider in Hyderabad, Karimnagar, Godavari Khani, and across Telangana. Fast, reliable, and affordable parcel delivery services.">
    <meta name="keywords" content="${keywords.join(', ')}">
    <meta name="author" content="Friends Transport Company">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://friendstransport.in/">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://friendstransport.in/">
    <meta property="og:title" content="Friends Transport Company | Reliable Transport Services in Hyderabad">
    <meta property="og:description" content="Leading transport and logistics service provider in Hyderabad, Karimnagar, and across Telangana. Track your parcels online.">
    <meta property="og:image" content="https://friendstransport.in/assets/logo.jpg">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://friendstransport.in/">
    <meta property="twitter:title" content="Friends Transport Company | Reliable Transport Services in Hyderabad">
    <meta property="twitter:description" content="Leading transport and logistics service provider in Hyderabad, Karimnagar, and across Telangana.">
    <meta property="twitter:image" content="https://friendstransport.in/assets/logo.jpg">
    
    <!-- Geo Tags -->
    <meta name="geo.region" content="IN-TG">
    <meta name="geo.placename" content="Hyderabad">
    <meta name="geo.position" content="17.385044;78.486671">
    <meta name="ICBM" content="17.385044, 78.486671">
    
    <!-- Schema.org JSON-LD -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Friends Transport Company",
        "alternateName": "FTC Transport",
        "url": "https://friendstransport.in",
        "logo": "https://friendstransport.in/assets/logo.jpg",
        "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+91-7075124426",
            "contactType": "customer service",
            "areaServed": "IN",
            "availableLanguage": ["en", "hi", "te"]
        },
        "sameAs": [],
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "Hyderabad",
            "addressRegion": "Telangana",
            "addressCountry": "IN"
        },
        "description": "Leading transport and logistics service provider in Hyderabad, Karimnagar, Godavari Khani, and across Telangana.",
        "areaServed": [
            {
                "@type": "City",
                "name": "Hyderabad"
            },
            {
                "@type": "City",
                "name": "Secunderabad"
            },
            {
                "@type": "City",
                "name": "Karimnagar"
            },
            {
                "@type": "City",
                "name": "Godavari Khani"
            }
        ]
    }
    </script>
    
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": "Transport and Logistics",
        "provider": {
            "@type": "Organization",
            "name": "Friends Transport Company"
        },
        "areaServed": {
            "@type": "State",
            "name": "Telangana"
        },
        "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "Transport Services",
            "itemListElement": [
                {
                    "@type": "Offer",
                    "itemOffered": {
                        "@type": "Service",
                        "name": "Parcel Delivery Service"
                    }
                },
                {
                    "@type": "Offer",
                    "itemOffered": {
                        "@type": "Service",
                        "name": "Goods Transport Service"
                    }
                },
                {
                    "@type": "Offer",
                    "itemOffered": {
                        "@type": "Service",
                        "name": "Cargo Service"
                    }
                }
            ]
        }
    }
    </script>
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            text-align: center;
        }
        
        h1 {
            color: #667eea;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .tagline {
            color: #666;
            font-size: 1.2em;
        }
        
        .hero {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            text-align: center;
        }
        
        .hero h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 2em;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 50px;
            font-size: 1.2em;
            font-weight: bold;
            margin: 10px;
            transition: transform 0.3s;
        }
        
        .cta-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        
        .services {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .service-card {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .service-card h3 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 1.5em;
        }
        
        .locations {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .locations h2 {
            color: #667eea;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .location-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .location-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
            font-weight: bold;
            color: #333;
        }
        
        .seo-content {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .seo-content h2 {
            color: #667eea;
            margin-bottom: 15px;
        }
        
        .seo-content p {
            margin-bottom: 15px;
            text-align: justify;
        }
        
        footer {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        @media (max-width: 768px) {
            h1 {
                font-size: 1.8em;
            }
            
            .hero h2 {
                font-size: 1.5em;
            }
            
            .cta-button {
                display: block;
                margin: 10px 0;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🚚 Friends Transport Company</h1>
            <p class="tagline">Your Trusted Transport Partner in Telangana</p>
        </header>
        
        <div class="hero">
            <h2>Fast, Reliable & Affordable Transport Services</h2>
            <p>Track your parcels in real-time across Hyderabad, Karimnagar, Godavari Khani, and all major locations in Telangana</p>
            <a href="/track" class="cta-button">📦 Track Your Parcel</a>
            <a href="tel:+917075124426" class="cta-button">📞 Call Us Now</a>
        </div>
        
        <div class="services">
            <div class="service-card">
                <h3>🚛 Parcel Delivery</h3>
                <p>Fast and secure parcel delivery services across Telangana. Door-to-door delivery available.</p>
            </div>
            
            <div class="service-card">
                <h3>📦 Goods Transport</h3>
                <p>Reliable goods transport services for businesses and individuals. Safe handling guaranteed.</p>
            </div>
            
            <div class="service-card">
                <h3>🔍 Real-Time Tracking</h3>
                <p>Track your shipments in real-time with our advanced tracking system. Stay updated 24/7.</p>
            </div>
        </div>
        
        <div class="locations">
            <h2>📍 We Serve Across Telangana</h2>
            <div class="location-grid">
                <div class="location-item">Hyderabad</div>
                <div class="location-item">Secunderabad</div>
                <div class="location-item">Karimnagar</div>
                <div class="location-item">Godavari Khani</div>
                <div class="location-item">Warangal</div>
                <div class="location-item">Nizamabad</div>
                <div class="location-item">Khammam</div>
                <div class="location-item">Nalgonda</div>
            </div>
        </div>
        
        <div class="seo-content">
            <h2>Transport Services in Hyderabad - Friends Transport Company</h2>
            
            <p><strong>Friends Transport Company (FTC)</strong> is a leading transport and logistics service provider in Hyderabad, Telangana. We specialize in providing reliable, fast, and affordable parcel delivery and goods transport services across Hyderabad, Secunderabad, Karimnagar, Godavari Khani, and all major cities in Telangana.</p>
            
            <h3>Why Choose Friends Transport for Your Transport Needs in Hyderabad?</h3>
            
            <p>When you search for <strong>"transport in Hyderabad"</strong> or <strong>"reliable transport services in Telangana"</strong>, Friends Transport Company stands out as the most trusted name. With years of experience in the logistics industry, we have built a reputation for excellence in parcel delivery and goods transport.</p>
            
            <h3>Our Transport Routes</h3>
            
            <p>We provide comprehensive transport services connecting:</p>
            <ul style="margin-left: 20px; margin-bottom: 15px;">
                <li><strong>Hyderabad to Karimnagar</strong> - Daily transport services</li>
                <li><strong>Karimnagar to Hyderabad</strong> - Fast and reliable delivery</li>
                <li><strong>Godavari Khani to Hyderabad</strong> - Regular transport schedule</li>
                <li><strong>Hyderabad to Secunderabad</strong> - Same-day delivery available</li>
                <li><strong>All stations across Telangana</strong> - Comprehensive network coverage</li>
            </ul>
            
            <h3>Transport Services We Offer</h3>
            
            <p><strong>Parcel Delivery Services:</strong> Whether you need to send documents, packages, or goods, our parcel delivery service ensures safe and timely delivery across Telangana.</p>
            
            <p><strong>Goods Transport:</strong> We handle all types of goods transport requirements for businesses and individuals. From small packages to bulk cargo, we've got you covered.</p>
            
            <p><strong>Door-to-Door Delivery:</strong> Enjoy the convenience of door-to-door delivery service in Hyderabad and surrounding areas.</p>
            
            <p><strong>Real-Time Tracking:</strong> Track your shipments online with our advanced tracking system. Know exactly where your parcel is at any time.</p>
            
            <h3>Serving Telangana with Excellence</h3>
            
            <p>As a <strong>reliable transport company in Telangana</strong>, we understand the importance of timely delivery and safe handling of your goods. Our extensive network covers all major cities and towns in Telangana, making us the preferred choice for transport services in the region.</p>
            
            <h3>Contact Friends Transport Company</h3>
            
            <p>For the best <strong>transport services in Hyderabad</strong>, contact Friends Transport Company today. Call us at <strong>+91-7075124426</strong> or track your parcel online at <strong>www.friendstransport.in</strong></p>
            
            <p><em>Keywords: transport in hyderabad, friends transport, karimnagar to hyderabad transport, reliable transport in telangana, godavari khani to hyderabad, secunderabad transport, parcel service hyderabad, goods transport telangana, logistics hyderabad, cargo service</em></p>
        </div>
        
        <footer>
            <p><strong>Friends Transport Company</strong></p>
            <p>📞 Phone: +91-7075124426</p>
            <p>🌐 Website: www.friendstransport.in</p>
            <p>📍 Serving: Hyderabad, Secunderabad, Karimnagar, Godavari Khani & All Telangana</p>
            <p style="margin-top: 15px; color: #666;">© 2024 Friends Transport Company. All rights reserved.</p>
        </footer>
    </div>
</body>
</html>`;
    
    fs.writeFileSync(path.join(__dirname, 'public', 'index.html'), html);
    console.log('✅ SEO-optimized landing page generated');
};

// Create public directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'public'))) {
    fs.mkdirSync(path.join(__dirname, 'public'));
    console.log('✅ Created public directory');
}

// Generate all SEO files
console.log('🚀 Generating SEO files...\n');
generateSitemap();
generateRobotsTxt();
generateLandingPage();
console.log('\n✅ All SEO files generated successfully!');
console.log('\n📋 Next steps:');
console.log('1. Update index.js to serve static files from /public');
console.log('2. Submit sitemap to Google Search Console');
console.log('3. Verify robots.txt is accessible');
console.log('4. Test the landing page');
