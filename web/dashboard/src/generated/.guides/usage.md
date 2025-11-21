# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { listTransactions, getTransaction, listMerchants, getMerchantsCount, getMerchant, getMerchantByName, getSpendingSummary, getTopMerchants, getSpendingByCategory, listEmails } from '@dataconnect/default';


// Operation ListTransactions:  For variables, look at type ListTransactionsVars in ../index.d.ts
const { data } = await ListTransactions(dataConnect, listTransactionsVars);

// Operation GetTransaction:  For variables, look at type GetTransactionVars in ../index.d.ts
const { data } = await GetTransaction(dataConnect, getTransactionVars);

// Operation ListMerchants:  For variables, look at type ListMerchantsVars in ../index.d.ts
const { data } = await ListMerchants(dataConnect, listMerchantsVars);

// Operation GetMerchantsCount:  For variables, look at type GetMerchantsCountVars in ../index.d.ts
const { data } = await GetMerchantsCount(dataConnect, getMerchantsCountVars);

// Operation GetMerchant:  For variables, look at type GetMerchantVars in ../index.d.ts
const { data } = await GetMerchant(dataConnect, getMerchantVars);

// Operation GetMerchantByName:  For variables, look at type GetMerchantByNameVars in ../index.d.ts
const { data } = await GetMerchantByName(dataConnect, getMerchantByNameVars);

// Operation GetSpendingSummary:  For variables, look at type GetSpendingSummaryVars in ../index.d.ts
const { data } = await GetSpendingSummary(dataConnect, getSpendingSummaryVars);

// Operation GetTopMerchants:  For variables, look at type GetTopMerchantsVars in ../index.d.ts
const { data } = await GetTopMerchants(dataConnect, getTopMerchantsVars);

// Operation GetSpendingByCategory:  For variables, look at type GetSpendingByCategoryVars in ../index.d.ts
const { data } = await GetSpendingByCategory(dataConnect, getSpendingByCategoryVars);

// Operation ListEmails:  For variables, look at type ListEmailsVars in ../index.d.ts
const { data } = await ListEmails(dataConnect, listEmailsVars);


```