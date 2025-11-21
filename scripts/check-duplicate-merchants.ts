import { executeGraphql } from '../packages/sql/src/dataconnect.js';

const query = `
  query GetAllMerchants {
    merchants {
      id
      name
      normalized_name
      category
    }
  }
`;

executeGraphql({ query })
  .then(result => {
    const merchants = result.data.merchants;
    console.log(`Total merchants: ${merchants.length}`);

    // Group by normalized_name
    const grouped: Record<string, any[]> = {};
    merchants.forEach((m: any) => {
      if (!grouped[m.normalized_name]) {
        grouped[m.normalized_name] = [];
      }
      grouped[m.normalized_name].push(m);
    });

    // Find duplicates
    const duplicates = Object.entries(grouped).filter(([_, list]) => list.length > 1);
    console.log(`\nDuplicate merchants (${duplicates.length} normalized names):`);
    duplicates.forEach(([normName, list]) => {
      console.log(`\n  ${normName}: ${list.length} entries`);
      list.forEach(m => console.log(`    - ID: ${m.id}, Name: ${m.name}, Category: ${m.category || 'N/A'}`));
    });
  })
  .catch(err => console.error('Error:', err));
