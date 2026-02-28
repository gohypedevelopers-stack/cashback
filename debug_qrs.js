const prisma = require('./src/config/prismaClient');
const vendorController = require('./src/controllers/vendorController');

async function main() {
  const vendor = await prisma.vendor.findFirst();
  const req = { user: { id: vendor.userId } };

  const resStats = { json: (data) => console.log("getCampaignStats Data:", JSON.stringify(data, null, 2)), status: () => resStats };
  await vendorController.getCampaignStats(req, resStats);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
