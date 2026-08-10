require('dotenv').config();
const mongoose = require('mongoose');
const Company = require('./models/Company');

const staticCompanies = [
  {
    name: 'THE SM GROUPS',
    address: '2nd Floor, Om Shiva Towers, 239 Advaitha Ashram Road, Fairlands, Salem, Tamil Nadu - 636004',
    gst: '33AABCT1234F1ZV',
    phone: '+91 9488316728',
    email: 'info@thesmgroups.com',
    logo: '/logo.png',
    bankDetails: {
      accountName: 'THE SM GROUPS',
      bankName: 'CITY UNION BANK',
      accountNumber: '510909010317651',
      ifscCode: 'CIUB0000188',
    },
    themeColor: '#d60000',
    signature: '/signature-sm.png'
  },
  {
    name: 'THE SRI TECH ENGINEERING',
    address: '2nd Floor, Om Shiva Towers, 239 Advaitha Ashram Road, Fairlands, Salem, Tamil Nadu - 636004',
    gst: '33AABCT5678G2ZX',
    phone: '+91 9488316728',
    email: 'info@thesritech.com',
    logo: '/logo-sritech.png',
    bankDetails: {
      accountName: 'THE SM GROUPS',
      bankName: 'CITY UNION BANK',
      accountNumber: '510909010317651',
      ifscCode: 'CIUB0000188',
    },
    themeColor: '#1d4ed8',
    signature: '/signature-sri.png'
  },
  {
    name: 'THE SRI TECH ENERGY',
    address: '2nd Floor, Om Shiva Towers, 239 Advaitha Ashram Road, Fairlands, Salem, Tamil Nadu - 636004',
    gst: '33AABCS1234K6ZB',
    phone: '+91 9488316728',
    email: 'energy@thesritech.com',
    logo: '/logo-sritechen.png',
    bankDetails: {
      accountName: 'THE SM GROUPS',
      bankName: 'CITY UNION BANK',
      accountNumber: '510909010317651',
      ifscCode: 'CIUB0000188',
    },
    themeColor: '#10b981',
    signature: '/signature-sri-energy.png'
  },
  {
    name: 'MBK TECHNOLOGY',
    address: '2nd Floor, Om Shiva Towers, 239 Advaitha Ashram Road, Fairlands, Salem, Tamil Nadu - 636004',
    gst: '33AABCM7890J5ZA',
    phone: '+91 9488316728',
    email: 'info@mbk.in',
    logo: '/logo-mbk.png',
    bankDetails: {
      accountName: 'THE SM GROUPS',
      bankName: 'CITY UNION BANK',
      accountNumber: '510909010317651',
      ifscCode: 'CIUB0000188',
    },
    themeColor: '#8b5cf6',
    signature: '/signature-mbk.png'
  },
  {
    name: 'OPTIME',
    address: '2nd Floor, Om Shiva Towers, 239 Advaitha Ashram Road, Fairlands, Salem, Tamil Nadu - 636004',
    gst: '33AABCO9012H3ZY',
    phone: '+91 9488316728',
    email: 'info@optime.in',
    logo: '/logo-optime.png',
    bankDetails: {
      accountName: 'THE SM GROUPS',
      bankName: 'CITY UNION BANK',
      accountNumber: '510909010317651',
      ifscCode: 'CIUB0000188',
    },
    themeColor: '#f59e0b',
    signature: '/signature-optime.png'
  },
  {
    name: 'VENTHULIR',
    address: '2nd Floor, Om Shiva Towers, 239 Advaitha Ashram Road, Fairlands, Salem, Tamil Nadu - 636004',
    gst: '33AABCV3456I4ZZ',
    phone: '+91 9488316728',
    email: 'info@venthulir.com',
    logo: '/logo-venthulir.png',
    bankDetails: {
      accountName: 'THE SM GROUPS',
      bankName: 'CITY UNION BANK',
      accountNumber: '510909010317651',
      ifscCode: 'CIUB0000188',
    },
    themeColor: '#14b8a6',
    signature: '/signature-venthulir.png'
  },
  {
    name: 'PAVECH',
    address: '2nd Floor, Om Shiva Towers, 239 Advaitha Ashram Road, Fairlands, Salem, Tamil Nadu - 636004',
    gst: '33AABCP1234P1ZZ',
    phone: '+91 9488316728',
    email: 'info@pavech.com',
    logo: '/logo-pavech.png',
    bankDetails: {
      accountName: 'THE SM GROUPS',
      bankName: 'CITY UNION BANK',
      accountNumber: '510909010317651',
      ifscCode: 'CIUB0000188',
    },
    themeColor: '#8b5cf6',
    signature: '/signature-pavech.png'
  },
  {
    name: 'WINKBENCH',
    address: '2nd Floor, Om Shiva Towers, 239 Advaitha Ashram Road, Fairlands, Salem, Tamil Nadu - 636004',
    gst: '33AABCW1234W1ZZ',
    phone: '+91 9488316728',
    email: 'info@winkbench.com',
    logo: '/logo-winkbench.png',
    bankDetails: {
      accountName: 'THE SM GROUPS',
      bankName: 'CITY UNION BANK',
      accountNumber: '510909010317651',
      ifscCode: 'CIUB0000188',
    },
    themeColor: '#ec4899',
    signature: '/signature-winkbench.png'
  }
];

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB.");

        const count = await Company.countDocuments();
        console.log(`Current companies in DB: ${count}`);

        const existing = await Company.find({});
        existing.forEach(c => {
            console.log(`  - name: "${c.name}", id: ${c._id}`);
        });

        // Seed if empty or missing any company
        for (const sc of staticCompanies) {
            let found = await Company.findOne({ name: sc.name });
            if (!found) {
                const created = await Company.create(sc);
                console.log(`🌱 Created company: "${created.name}" with ID: ${created._id}`);
            } else {
                console.log(`✅ Company exists: "${found.name}" (ID: ${found._id})`);
            }
        }

        console.log("Done checking companies.");
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
})();
