import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Ensure default agent profile
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.agentProfile.upsert({
    where: { email: 'agent@example.com' },
    update: {},
    create: {
      id: 'default_agent',
      email: 'agent@example.com',
      agentName: 'John Mwangi',
      passwordHash,
      whatsappNumber: '+254712345678',
      customGreeting: "Hi John! I'm inquiring about [Plot Title] listed for [Price]. Is it still available?",
    },
  });

  // Seed sample land listings
  const samplePlots = [
    {
      id: 'malaa-4b',
      title: 'Plot 4B - Malaa Ridge, Kangundo Rd',
      status: 'AVAILABLE',
      priceType: 'FIXED',
      priceKes: 1500000,
      sizePreset: '50x100',
      sizeCustomValue: null,
      zoning: 'Residential',
      roadAccess: 'All-weather gravel',
      waterSource: 'Borehole on-site',
      electricity: 'Grid on plot boundary',
      description: 'Prime 50x100 ft residential plot situated 600m from Kangundo Road. Ideal for immediate residential development with panoramic views of the Lukenya Hills. High-speed fiber internet and borehole water connected to site.',
      latitude: -1.3055,
      longitude: 37.1284,
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=80',
      ]),
      videoUrl: null,
    },
    {
      id: 'kilifi-5ac',
      title: '5-Acre Coastal Parcel - Kilifi North',
      status: 'PENDING',
      priceType: 'FIXED',
      priceKes: 4800000,
      sizePreset: '5 Acres',
      sizeCustomValue: '5 Acres Freehold',
      zoning: 'Agricultural',
      roadAccess: 'Tarmac road',
      waterSource: 'Piped county water',
      electricity: 'Transformer nearby (<200m)',
      description: 'Expansive 5-acre agricultural and holiday home parcel in Kilifi. Features mature cashew and coconut trees with gentle rolling elevation and ocean breeze. Clear freehold title deed ready for transfer.',
      latitude: -3.6305,
      longitude: 39.8499,
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&auto=format&fit=crop&q=80',
      ]),
      videoUrl: null,
    },
    {
      id: 'tinga-qtr',
      title: '1/4 Acre Commercial Plot - Tinga Town',
      status: 'SOLD',
      priceType: 'FIXED',
      priceKes: 2200000,
      sizePreset: '100x100',
      sizeCustomValue: '100 × 100 ft',
      zoning: 'Commercial',
      roadAccess: 'Tarmac road',
      waterSource: 'Piped county water',
      electricity: 'Grid on plot boundary',
      description: 'Strategic commercial plot directly fronting the tarmac along Magadi Road. Rapidly developing commercial node suitable for hardware stores, rental apartments, or retail petrol station.',
      latitude: -1.7821,
      longitude: 36.6542,
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&auto=format&fit=crop&q=80',
      ]),
      videoUrl: null,
    },
  ];

  for (const plot of samplePlots) {
    await prisma.plot.upsert({
      where: { id: plot.id },
      update: {},
      create: plot,
    });
  }

  console.log('Seeding complete! 3 sample plots added.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
