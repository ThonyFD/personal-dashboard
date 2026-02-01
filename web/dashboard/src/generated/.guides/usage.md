# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createEmail, updateEmailParsed, createMerchant, createTransaction, updateTransactionMerchant, updateTransactionNotes, updateTransactionType, deleteTransaction, deleteEmail, updateGmailSyncState } from '@dataconnect/default';


// Operation CreateEmail:  For variables, look at type CreateEmailVars in ../index.d.ts
const { data } = await CreateEmail(dataConnect, createEmailVars);

// Operation UpdateEmailParsed:  For variables, look at type UpdateEmailParsedVars in ../index.d.ts
const { data } = await UpdateEmailParsed(dataConnect, updateEmailParsedVars);

// Operation CreateMerchant:  For variables, look at type CreateMerchantVars in ../index.d.ts
const { data } = await CreateMerchant(dataConnect, createMerchantVars);

// Operation CreateTransaction:  For variables, look at type CreateTransactionVars in ../index.d.ts
const { data } = await CreateTransaction(dataConnect, createTransactionVars);

// Operation UpdateTransactionMerchant:  For variables, look at type UpdateTransactionMerchantVars in ../index.d.ts
const { data } = await UpdateTransactionMerchant(dataConnect, updateTransactionMerchantVars);

// Operation UpdateTransactionNotes:  For variables, look at type UpdateTransactionNotesVars in ../index.d.ts
const { data } = await UpdateTransactionNotes(dataConnect, updateTransactionNotesVars);

// Operation UpdateTransactionType:  For variables, look at type UpdateTransactionTypeVars in ../index.d.ts
const { data } = await UpdateTransactionType(dataConnect, updateTransactionTypeVars);

// Operation DeleteTransaction:  For variables, look at type DeleteTransactionVars in ../index.d.ts
const { data } = await DeleteTransaction(dataConnect, deleteTransactionVars);

// Operation DeleteEmail:  For variables, look at type DeleteEmailVars in ../index.d.ts
const { data } = await DeleteEmail(dataConnect, deleteEmailVars);

// Operation UpdateGmailSyncState:  For variables, look at type UpdateGmailSyncStateVars in ../index.d.ts
const { data } = await UpdateGmailSyncState(dataConnect, updateGmailSyncStateVars);


```