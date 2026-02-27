const fs = require('fs');
const path = require('path');

console.log('🔍 Google SEO Setup Guide\n');
console.log('=' .repeat(60));

console.log('\n📋 STEP 1: Google Search Console Setup');
console.log('-'.repeat(60));
console.log('1. Go to: https://search.google.com/search-console');
console.log('2. Click "Add Property"');
console.log('3. Enter: https://friendstransport.in');
console.log('4. Choose verification method:');
console.log('   - HTML file upload (recommended)');
console.log('   - HTML tag');
console.log('   - Domain name provider');
console.log('5. After verification, submit sitemap:');
console.log('   URL: https://friendstransport.in/sitemap.xml');

console.log('\n📋 STEP 2: Google Business Profile');
console.log('-'.repeat(60));
console.log('1. Go to: https://business.google.com');
console.log('2. Create/Claim your business listing');
console.log('3. Business Name: Friends Transport Company');
console.log('4. Category: Transportation Service / Logistics Service');
console.log('5. Add your address, phone (+91-7075124426), website');
console.log('6. Add photos of your office, vehicles, team');
console.log('7. Encourage customers to leave reviews');

console.log('\n📋 STEP 3: Submit to Search Engines');
console.log('-'.repeat(60));
console.log('Google: https://www.google.com/ping?sitemap=https://friendstransport.in/sitemap.xml');
console.log('Bing: https://www.bing.com/webmasters/');

console.log('\n📋 STEP 4: Social Media & Citations');
console.log('-'.repeat(60));
console.log('Create profiles on:');
console.log('- Facebook Business Page');
console.log('- Instagram Business');
console.log('- LinkedIn Company Page');
console.log('- JustDial listing');
console.log('- IndiaMART listing');
console.log('- Sulekha listing');
console.log('\nEnsure NAP (Name, Address, Phone) consistency everywhere!');

console.log('\n📋 STEP 5: Content Marketing');
console.log('-'.repeat(60));
console.log('Create blog posts about:');
console.log('- "Best Transport Services in Hyderabad"');
console.log('- "How to Track Your Parcel Online"');
console.log('- "Karimnagar to Hyderabad Transport Guide"');
console.log('- "Reliable Goods Transport in Telangana"');

console.log('\n📋 STEP 6: Local SEO Keywords to Target');
console.log('-'.repeat(60));
const keywords = [
    'transport in hyderabad',
    'friends transport company',
    'karimnagar to hyderabad transport',
    'hyderabad transport services',
    'reliable transport in telangana',
    'godavari khani to hyderabad',
    'parcel service hyderabad',
    'goods transport hyderabad',
    'cargo service telangana',
    'logistics hyderabad'
];
keywords.forEach((kw, i) => console.log(`${i + 1}. ${kw}`));

console.log('\n📋 STEP 7: Technical SEO Checklist');
console.log('-'.repeat(60));
console.log('✅ Sitemap.xml created');
console.log('✅ Robots.txt created');
console.log('✅ SEO-optimized landing page created');
console.log('✅ Schema.org structured data added');
console.log('✅ Meta tags optimized');
console.log('✅ Open Graph tags added');
console.log('⏳ SSL certificate (HTTPS) - Ensure enabled');
console.log('⏳ Mobile-friendly design - Test on mobile');
console.log('⏳ Page speed optimization - Use Google PageSpeed Insights');

console.log('\n📋 STEP 8: Monitor & Track');
console.log('-'.repeat(60));
console.log('1. Google Search Console - Track rankings & clicks');
console.log('2. Google Analytics - Track website traffic');
console.log('3. Google Business Profile Insights - Track local searches');

console.log('\n📋 STEP 9: Get Backlinks');
console.log('-'.repeat(60));
console.log('- List on transport directories');
console.log('- Partner with local businesses');
console.log('- Get featured in local news/blogs');
console.log('- Create valuable content others want to link to');

console.log('\n📋 STEP 10: Regular Updates');
console.log('-'.repeat(60));
console.log('- Update Google Business Profile weekly');
console.log('- Post updates about services');
console.log('- Respond to customer reviews');
console.log('- Add new photos regularly');

console.log('\n' + '='.repeat(60));
console.log('✅ SEO Setup Complete!');
console.log('🚀 Your website is now optimized for Google search');
console.log('📈 Rankings will improve over 2-3 months with consistent effort');
console.log('='.repeat(60) + '\n');

// Generate a quick reference file
const quickRef = `# Friends Transport Company - SEO Quick Reference

## Important URLs
- Website: https://friendstransport.in
- Sitemap: https://friendstransport.in/sitemap.xml
- Robots: https://friendstransport.in/robots.txt

## Target Keywords
${keywords.map((kw, i) => `${i + 1}. ${kw}`).join('\n')}

## Business Information
- Name: Friends Transport Company
- Phone: +91-7075124426
- Service Area: Hyderabad, Secunderabad, Karimnagar, Godavari Khani, Telangana
- Category: Transportation Service, Logistics Service

## Monthly SEO Tasks
- [ ] Update Google Business Profile (weekly)
- [ ] Check Google Search Console for issues
- [ ] Respond to customer reviews
- [ ] Post on social media (3x per week)
- [ ] Monitor keyword rankings
- [ ] Add new content/blog posts

## Tools to Use
- Google Search Console: https://search.google.com/search-console
- Google Business Profile: https://business.google.com
- Google Analytics: https://analytics.google.com
- PageSpeed Insights: https://pagespeed.web.dev
- Mobile-Friendly Test: https://search.google.com/test/mobile-friendly

## Contact for SEO Issues
- Check server logs for crawl errors
- Verify sitemap is accessible
- Ensure robots.txt allows crawling
- Monitor 404 errors in Search Console
`;

fs.writeFileSync(path.join(__dirname, 'SEO-QUICK-REFERENCE.txt'), quickRef);
console.log('📄 Created: SEO-QUICK-REFERENCE.txt\n');
