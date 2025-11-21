# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `default`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListTransactions*](#listtransactions)
  - [*GetTransaction*](#gettransaction)
  - [*ListMerchants*](#listmerchants)
  - [*GetMerchantsCount*](#getmerchantscount)
  - [*GetMerchant*](#getmerchant)
  - [*GetMerchantByName*](#getmerchantbyname)
  - [*GetSpendingSummary*](#getspendingsummary)
  - [*GetTopMerchants*](#gettopmerchants)
  - [*GetSpendingByCategory*](#getspendingbycategory)
  - [*ListEmails*](#listemails)
  - [*GetEmail*](#getemail)
  - [*SearchTransactions*](#searchtransactions)
  - [*GetDailySpending*](#getdailyspending)
  - [*GetGmailSyncState*](#getgmailsyncstate)
  - [*GetTransactionsByMerchant*](#gettransactionsbymerchant)
  - [*ListCategories*](#listcategories)
  - [*GetCategory*](#getcategory)
  - [*GetCategoryByName*](#getcategorybyname)
  - [*GetRecentEmailsForMonitoring*](#getrecentemailsformonitoring)
  - [*GetRecentTransactionsForMonitoring*](#getrecenttransactionsformonitoring)
  - [*GetAllEmails*](#getallemails)
  - [*GetEmailsAfterDate*](#getemailsafterdate)
  - [*GetLatestEmail*](#getlatestemail)
  - [*GetAllTransactions*](#getalltransactions)
  - [*GetTransactionsAfterDate*](#gettransactionsafterdate)
  - [*GetLatestTransaction*](#getlatesttransaction)
- [**Mutations**](#mutations)
  - [*CreateEmail*](#createemail)
  - [*UpdateEmailParsed*](#updateemailparsed)
  - [*CreateMerchant*](#createmerchant)
  - [*CreateTransaction*](#createtransaction)
  - [*UpdateTransactionMerchant*](#updatetransactionmerchant)
  - [*UpdateTransactionNotes*](#updatetransactionnotes)
  - [*DeleteTransaction*](#deletetransaction)
  - [*DeleteEmail*](#deleteemail)
  - [*UpdateGmailSyncState*](#updategmailsyncstate)
  - [*DeleteMerchant*](#deletemerchant)
  - [*CreateCategory*](#createcategory)
  - [*UpdateCategory*](#updatecategory)
  - [*DeleteCategory*](#deletecategory)
  - [*UpdateMerchantCategoryId*](#updatemerchantcategoryid)
  - [*UpdateMerchantNormalizedName*](#updatemerchantnormalizedname)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `default`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/default` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/default';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/default';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `default` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListTransactions
You can execute the `ListTransactions` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listTransactions(vars?: ListTransactionsVariables): QueryPromise<ListTransactionsData, ListTransactionsVariables>;

interface ListTransactionsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars?: ListTransactionsVariables): QueryRef<ListTransactionsData, ListTransactionsVariables>;
}
export const listTransactionsRef: ListTransactionsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listTransactions(dc: DataConnect, vars?: ListTransactionsVariables): QueryPromise<ListTransactionsData, ListTransactionsVariables>;

interface ListTransactionsRef {
  ...
  (dc: DataConnect, vars?: ListTransactionsVariables): QueryRef<ListTransactionsData, ListTransactionsVariables>;
}
export const listTransactionsRef: ListTransactionsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listTransactionsRef:
```typescript
const name = listTransactionsRef.operationName;
console.log(name);
```

### Variables
The `ListTransactions` query has an optional argument of type `ListTransactionsVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListTransactionsVariables {
  limit?: number | null;
  offset?: number | null;
  startDate?: DateString | null;
  endDate?: DateString | null;
  provider?: string | null;
  txnType?: TxnType | null;
}
```
### Return Type
Recall that executing the `ListTransactions` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListTransactionsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListTransactionsData {
  transactions: ({
    id: number;
    amount: number;
    currency?: string | null;
    txnType: TxnType;
    channel: ChannelType;
    txnDate: DateString;
    txnTimestamp?: TimestampString | null;
    merchantName?: string | null;
    merchantRaw?: string | null;
    provider: string;
    referenceNumber?: string | null;
    cardLast4?: string | null;
    accountLast4?: string | null;
    description?: string | null;
    createdAt: TimestampString;
    merchant?: {
      id: number;
      name: string;
      categoryId?: number | null;
      categoryRef?: {
        id: number;
        name: string;
        icon: string;
        color: string;
      } & Category_Key;
    } & Merchant_Key;
      email: {
        id: number;
        senderEmail: string;
        subject?: string | null;
        receivedAt: TimestampString;
      } & Email_Key;
  } & Transaction_Key)[];
}
```
### Using `ListTransactions`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listTransactions, ListTransactionsVariables } from '@dataconnect/default';

// The `ListTransactions` query has an optional argument of type `ListTransactionsVariables`:
const listTransactionsVars: ListTransactionsVariables = {
  limit: ..., // optional
  offset: ..., // optional
  startDate: ..., // optional
  endDate: ..., // optional
  provider: ..., // optional
  txnType: ..., // optional
};

// Call the `listTransactions()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listTransactions(listTransactionsVars);
// Variables can be defined inline as well.
const { data } = await listTransactions({ limit: ..., offset: ..., startDate: ..., endDate: ..., provider: ..., txnType: ..., });
// Since all variables are optional for this query, you can omit the `ListTransactionsVariables` argument.
const { data } = await listTransactions();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listTransactions(dataConnect, listTransactionsVars);

console.log(data.transactions);

// Or, you can use the `Promise` API.
listTransactions(listTransactionsVars).then((response) => {
  const data = response.data;
  console.log(data.transactions);
});
```

### Using `ListTransactions`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listTransactionsRef, ListTransactionsVariables } from '@dataconnect/default';

// The `ListTransactions` query has an optional argument of type `ListTransactionsVariables`:
const listTransactionsVars: ListTransactionsVariables = {
  limit: ..., // optional
  offset: ..., // optional
  startDate: ..., // optional
  endDate: ..., // optional
  provider: ..., // optional
  txnType: ..., // optional
};

// Call the `listTransactionsRef()` function to get a reference to the query.
const ref = listTransactionsRef(listTransactionsVars);
// Variables can be defined inline as well.
const ref = listTransactionsRef({ limit: ..., offset: ..., startDate: ..., endDate: ..., provider: ..., txnType: ..., });
// Since all variables are optional for this query, you can omit the `ListTransactionsVariables` argument.
const ref = listTransactionsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listTransactionsRef(dataConnect, listTransactionsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.transactions);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.transactions);
});
```

## GetTransaction
You can execute the `GetTransaction` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getTransaction(vars: GetTransactionVariables): QueryPromise<GetTransactionData, GetTransactionVariables>;

interface GetTransactionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetTransactionVariables): QueryRef<GetTransactionData, GetTransactionVariables>;
}
export const getTransactionRef: GetTransactionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getTransaction(dc: DataConnect, vars: GetTransactionVariables): QueryPromise<GetTransactionData, GetTransactionVariables>;

interface GetTransactionRef {
  ...
  (dc: DataConnect, vars: GetTransactionVariables): QueryRef<GetTransactionData, GetTransactionVariables>;
}
export const getTransactionRef: GetTransactionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getTransactionRef:
```typescript
const name = getTransactionRef.operationName;
console.log(name);
```

### Variables
The `GetTransaction` query requires an argument of type `GetTransactionVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetTransactionVariables {
  id: number;
}
```
### Return Type
Recall that executing the `GetTransaction` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetTransactionData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetTransactionData {
  transaction?: {
    id: number;
    amount: number;
    currency?: string | null;
    txnType: TxnType;
    channel: ChannelType;
    txnDate: DateString;
    txnTimestamp?: TimestampString | null;
    merchantName?: string | null;
    merchantRaw?: string | null;
    provider: string;
    referenceNumber?: string | null;
    cardLast4?: string | null;
    accountLast4?: string | null;
    description?: string | null;
    notes?: string | null;
    idempotencyKey: string;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    merchant?: {
      id: number;
      name: string;
      normalizedName: string;
      categoryId?: number | null;
      categoryRef?: {
        id: number;
        name: string;
        icon: string;
        color: string;
      } & Category_Key;
        transactionCount?: number | null;
        totalAmount?: number | null;
    } & Merchant_Key;
      email: {
        id: number;
        gmailMessageId: string;
        senderEmail: string;
        senderName?: string | null;
        subject?: string | null;
        receivedAt: TimestampString;
        provider?: string | null;
        labels?: string[] | null;
      } & Email_Key;
  } & Transaction_Key;
}
```
### Using `GetTransaction`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getTransaction, GetTransactionVariables } from '@dataconnect/default';

// The `GetTransaction` query requires an argument of type `GetTransactionVariables`:
const getTransactionVars: GetTransactionVariables = {
  id: ..., 
};

// Call the `getTransaction()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getTransaction(getTransactionVars);
// Variables can be defined inline as well.
const { data } = await getTransaction({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getTransaction(dataConnect, getTransactionVars);

console.log(data.transaction);

// Or, you can use the `Promise` API.
getTransaction(getTransactionVars).then((response) => {
  const data = response.data;
  console.log(data.transaction);
});
```

### Using `GetTransaction`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getTransactionRef, GetTransactionVariables } from '@dataconnect/default';

// The `GetTransaction` query requires an argument of type `GetTransactionVariables`:
const getTransactionVars: GetTransactionVariables = {
  id: ..., 
};

// Call the `getTransactionRef()` function to get a reference to the query.
const ref = getTransactionRef(getTransactionVars);
// Variables can be defined inline as well.
const ref = getTransactionRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getTransactionRef(dataConnect, getTransactionVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.transaction);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.transaction);
});
```

## ListMerchants
You can execute the `ListMerchants` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listMerchants(vars?: ListMerchantsVariables): QueryPromise<ListMerchantsData, ListMerchantsVariables>;

interface ListMerchantsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars?: ListMerchantsVariables): QueryRef<ListMerchantsData, ListMerchantsVariables>;
}
export const listMerchantsRef: ListMerchantsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMerchants(dc: DataConnect, vars?: ListMerchantsVariables): QueryPromise<ListMerchantsData, ListMerchantsVariables>;

interface ListMerchantsRef {
  ...
  (dc: DataConnect, vars?: ListMerchantsVariables): QueryRef<ListMerchantsData, ListMerchantsVariables>;
}
export const listMerchantsRef: ListMerchantsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMerchantsRef:
```typescript
const name = listMerchantsRef.operationName;
console.log(name);
```

### Variables
The `ListMerchants` query has an optional argument of type `ListMerchantsVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListMerchantsVariables {
  limit?: number | null;
  offset?: number | null;
  categoryId?: number | null;
  searchTerm?: string | null;
  sortBy?: string | null;
  sortOrder?: string | null;
}
```
### Return Type
Recall that executing the `ListMerchants` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMerchantsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMerchantsData {
  merchants: ({
    id: number;
    name: string;
    normalizedName: string;
    categoryId?: number | null;
    categoryRef?: {
      id: number;
      name: string;
      icon: string;
      color: string;
    } & Category_Key;
      transactionCount?: number | null;
      totalAmount?: number | null;
      firstSeenAt: TimestampString;
      createdAt: TimestampString;
  } & Merchant_Key)[];
}
```
### Using `ListMerchants`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMerchants, ListMerchantsVariables } from '@dataconnect/default';

// The `ListMerchants` query has an optional argument of type `ListMerchantsVariables`:
const listMerchantsVars: ListMerchantsVariables = {
  limit: ..., // optional
  offset: ..., // optional
  categoryId: ..., // optional
  searchTerm: ..., // optional
  sortBy: ..., // optional
  sortOrder: ..., // optional
};

// Call the `listMerchants()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMerchants(listMerchantsVars);
// Variables can be defined inline as well.
const { data } = await listMerchants({ limit: ..., offset: ..., categoryId: ..., searchTerm: ..., sortBy: ..., sortOrder: ..., });
// Since all variables are optional for this query, you can omit the `ListMerchantsVariables` argument.
const { data } = await listMerchants();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMerchants(dataConnect, listMerchantsVars);

console.log(data.merchants);

// Or, you can use the `Promise` API.
listMerchants(listMerchantsVars).then((response) => {
  const data = response.data;
  console.log(data.merchants);
});
```

### Using `ListMerchants`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMerchantsRef, ListMerchantsVariables } from '@dataconnect/default';

// The `ListMerchants` query has an optional argument of type `ListMerchantsVariables`:
const listMerchantsVars: ListMerchantsVariables = {
  limit: ..., // optional
  offset: ..., // optional
  categoryId: ..., // optional
  searchTerm: ..., // optional
  sortBy: ..., // optional
  sortOrder: ..., // optional
};

// Call the `listMerchantsRef()` function to get a reference to the query.
const ref = listMerchantsRef(listMerchantsVars);
// Variables can be defined inline as well.
const ref = listMerchantsRef({ limit: ..., offset: ..., categoryId: ..., searchTerm: ..., sortBy: ..., sortOrder: ..., });
// Since all variables are optional for this query, you can omit the `ListMerchantsVariables` argument.
const ref = listMerchantsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMerchantsRef(dataConnect, listMerchantsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.merchants);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.merchants);
});
```

## GetMerchantsCount
You can execute the `GetMerchantsCount` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getMerchantsCount(vars?: GetMerchantsCountVariables): QueryPromise<GetMerchantsCountData, GetMerchantsCountVariables>;

interface GetMerchantsCountRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars?: GetMerchantsCountVariables): QueryRef<GetMerchantsCountData, GetMerchantsCountVariables>;
}
export const getMerchantsCountRef: GetMerchantsCountRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMerchantsCount(dc: DataConnect, vars?: GetMerchantsCountVariables): QueryPromise<GetMerchantsCountData, GetMerchantsCountVariables>;

interface GetMerchantsCountRef {
  ...
  (dc: DataConnect, vars?: GetMerchantsCountVariables): QueryRef<GetMerchantsCountData, GetMerchantsCountVariables>;
}
export const getMerchantsCountRef: GetMerchantsCountRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMerchantsCountRef:
```typescript
const name = getMerchantsCountRef.operationName;
console.log(name);
```

### Variables
The `GetMerchantsCount` query has an optional argument of type `GetMerchantsCountVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetMerchantsCountVariables {
  categoryId?: number | null;
  searchTerm?: string | null;
}
```
### Return Type
Recall that executing the `GetMerchantsCount` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMerchantsCountData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMerchantsCountData {
  merchants: ({
    id: number;
  } & Merchant_Key)[];
}
```
### Using `GetMerchantsCount`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMerchantsCount, GetMerchantsCountVariables } from '@dataconnect/default';

// The `GetMerchantsCount` query has an optional argument of type `GetMerchantsCountVariables`:
const getMerchantsCountVars: GetMerchantsCountVariables = {
  categoryId: ..., // optional
  searchTerm: ..., // optional
};

// Call the `getMerchantsCount()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMerchantsCount(getMerchantsCountVars);
// Variables can be defined inline as well.
const { data } = await getMerchantsCount({ categoryId: ..., searchTerm: ..., });
// Since all variables are optional for this query, you can omit the `GetMerchantsCountVariables` argument.
const { data } = await getMerchantsCount();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMerchantsCount(dataConnect, getMerchantsCountVars);

console.log(data.merchants);

// Or, you can use the `Promise` API.
getMerchantsCount(getMerchantsCountVars).then((response) => {
  const data = response.data;
  console.log(data.merchants);
});
```

### Using `GetMerchantsCount`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMerchantsCountRef, GetMerchantsCountVariables } from '@dataconnect/default';

// The `GetMerchantsCount` query has an optional argument of type `GetMerchantsCountVariables`:
const getMerchantsCountVars: GetMerchantsCountVariables = {
  categoryId: ..., // optional
  searchTerm: ..., // optional
};

// Call the `getMerchantsCountRef()` function to get a reference to the query.
const ref = getMerchantsCountRef(getMerchantsCountVars);
// Variables can be defined inline as well.
const ref = getMerchantsCountRef({ categoryId: ..., searchTerm: ..., });
// Since all variables are optional for this query, you can omit the `GetMerchantsCountVariables` argument.
const ref = getMerchantsCountRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMerchantsCountRef(dataConnect, getMerchantsCountVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.merchants);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.merchants);
});
```

## GetMerchant
You can execute the `GetMerchant` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getMerchant(vars: GetMerchantVariables): QueryPromise<GetMerchantData, GetMerchantVariables>;

interface GetMerchantRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMerchantVariables): QueryRef<GetMerchantData, GetMerchantVariables>;
}
export const getMerchantRef: GetMerchantRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMerchant(dc: DataConnect, vars: GetMerchantVariables): QueryPromise<GetMerchantData, GetMerchantVariables>;

interface GetMerchantRef {
  ...
  (dc: DataConnect, vars: GetMerchantVariables): QueryRef<GetMerchantData, GetMerchantVariables>;
}
export const getMerchantRef: GetMerchantRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMerchantRef:
```typescript
const name = getMerchantRef.operationName;
console.log(name);
```

### Variables
The `GetMerchant` query requires an argument of type `GetMerchantVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetMerchantVariables {
  id: number;
}
```
### Return Type
Recall that executing the `GetMerchant` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMerchantData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMerchantData {
  merchant?: {
    id: number;
    name: string;
    normalizedName: string;
    categoryId?: number | null;
    categoryRef?: {
      id: number;
      name: string;
      icon: string;
      color: string;
    } & Category_Key;
      transactionCount?: number | null;
      totalAmount?: number | null;
      firstSeenAt: TimestampString;
      createdAt: TimestampString;
      updatedAt: TimestampString;
  } & Merchant_Key;
}
```
### Using `GetMerchant`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMerchant, GetMerchantVariables } from '@dataconnect/default';

// The `GetMerchant` query requires an argument of type `GetMerchantVariables`:
const getMerchantVars: GetMerchantVariables = {
  id: ..., 
};

// Call the `getMerchant()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMerchant(getMerchantVars);
// Variables can be defined inline as well.
const { data } = await getMerchant({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMerchant(dataConnect, getMerchantVars);

console.log(data.merchant);

// Or, you can use the `Promise` API.
getMerchant(getMerchantVars).then((response) => {
  const data = response.data;
  console.log(data.merchant);
});
```

### Using `GetMerchant`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMerchantRef, GetMerchantVariables } from '@dataconnect/default';

// The `GetMerchant` query requires an argument of type `GetMerchantVariables`:
const getMerchantVars: GetMerchantVariables = {
  id: ..., 
};

// Call the `getMerchantRef()` function to get a reference to the query.
const ref = getMerchantRef(getMerchantVars);
// Variables can be defined inline as well.
const ref = getMerchantRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMerchantRef(dataConnect, getMerchantVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.merchant);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.merchant);
});
```

## GetMerchantByName
You can execute the `GetMerchantByName` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getMerchantByName(vars: GetMerchantByNameVariables): QueryPromise<GetMerchantByNameData, GetMerchantByNameVariables>;

interface GetMerchantByNameRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMerchantByNameVariables): QueryRef<GetMerchantByNameData, GetMerchantByNameVariables>;
}
export const getMerchantByNameRef: GetMerchantByNameRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMerchantByName(dc: DataConnect, vars: GetMerchantByNameVariables): QueryPromise<GetMerchantByNameData, GetMerchantByNameVariables>;

interface GetMerchantByNameRef {
  ...
  (dc: DataConnect, vars: GetMerchantByNameVariables): QueryRef<GetMerchantByNameData, GetMerchantByNameVariables>;
}
export const getMerchantByNameRef: GetMerchantByNameRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMerchantByNameRef:
```typescript
const name = getMerchantByNameRef.operationName;
console.log(name);
```

### Variables
The `GetMerchantByName` query requires an argument of type `GetMerchantByNameVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetMerchantByNameVariables {
  name: string;
}
```
### Return Type
Recall that executing the `GetMerchantByName` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMerchantByNameData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMerchantByNameData {
  merchants: ({
    id: number;
    name: string;
    normalizedName: string;
    categoryId?: number | null;
    categoryRef?: {
      id: number;
      name: string;
      icon: string;
      color: string;
    } & Category_Key;
      transactionCount?: number | null;
      totalAmount?: number | null;
  } & Merchant_Key)[];
}
```
### Using `GetMerchantByName`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMerchantByName, GetMerchantByNameVariables } from '@dataconnect/default';

// The `GetMerchantByName` query requires an argument of type `GetMerchantByNameVariables`:
const getMerchantByNameVars: GetMerchantByNameVariables = {
  name: ..., 
};

// Call the `getMerchantByName()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMerchantByName(getMerchantByNameVars);
// Variables can be defined inline as well.
const { data } = await getMerchantByName({ name: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMerchantByName(dataConnect, getMerchantByNameVars);

console.log(data.merchants);

// Or, you can use the `Promise` API.
getMerchantByName(getMerchantByNameVars).then((response) => {
  const data = response.data;
  console.log(data.merchants);
});
```

### Using `GetMerchantByName`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMerchantByNameRef, GetMerchantByNameVariables } from '@dataconnect/default';

// The `GetMerchantByName` query requires an argument of type `GetMerchantByNameVariables`:
const getMerchantByNameVars: GetMerchantByNameVariables = {
  name: ..., 
};

// Call the `getMerchantByNameRef()` function to get a reference to the query.
const ref = getMerchantByNameRef(getMerchantByNameVars);
// Variables can be defined inline as well.
const ref = getMerchantByNameRef({ name: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMerchantByNameRef(dataConnect, getMerchantByNameVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.merchants);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.merchants);
});
```

## GetSpendingSummary
You can execute the `GetSpendingSummary` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getSpendingSummary(vars?: GetSpendingSummaryVariables): QueryPromise<GetSpendingSummaryData, GetSpendingSummaryVariables>;

interface GetSpendingSummaryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars?: GetSpendingSummaryVariables): QueryRef<GetSpendingSummaryData, GetSpendingSummaryVariables>;
}
export const getSpendingSummaryRef: GetSpendingSummaryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getSpendingSummary(dc: DataConnect, vars?: GetSpendingSummaryVariables): QueryPromise<GetSpendingSummaryData, GetSpendingSummaryVariables>;

interface GetSpendingSummaryRef {
  ...
  (dc: DataConnect, vars?: GetSpendingSummaryVariables): QueryRef<GetSpendingSummaryData, GetSpendingSummaryVariables>;
}
export const getSpendingSummaryRef: GetSpendingSummaryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getSpendingSummaryRef:
```typescript
const name = getSpendingSummaryRef.operationName;
console.log(name);
```

### Variables
The `GetSpendingSummary` query has an optional argument of type `GetSpendingSummaryVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetSpendingSummaryVariables {
  startDate?: DateString | null;
  endDate?: DateString | null;
}
```
### Return Type
Recall that executing the `GetSpendingSummary` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetSpendingSummaryData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetSpendingSummaryData {
  transactions: ({
    amount: number;
    txnDate: DateString;
    txnType: TxnType;
    provider: string;
  })[];
}
```
### Using `GetSpendingSummary`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getSpendingSummary, GetSpendingSummaryVariables } from '@dataconnect/default';

// The `GetSpendingSummary` query has an optional argument of type `GetSpendingSummaryVariables`:
const getSpendingSummaryVars: GetSpendingSummaryVariables = {
  startDate: ..., // optional
  endDate: ..., // optional
};

// Call the `getSpendingSummary()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getSpendingSummary(getSpendingSummaryVars);
// Variables can be defined inline as well.
const { data } = await getSpendingSummary({ startDate: ..., endDate: ..., });
// Since all variables are optional for this query, you can omit the `GetSpendingSummaryVariables` argument.
const { data } = await getSpendingSummary();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getSpendingSummary(dataConnect, getSpendingSummaryVars);

console.log(data.transactions);

// Or, you can use the `Promise` API.
getSpendingSummary(getSpendingSummaryVars).then((response) => {
  const data = response.data;
  console.log(data.transactions);
});
```

### Using `GetSpendingSummary`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getSpendingSummaryRef, GetSpendingSummaryVariables } from '@dataconnect/default';

// The `GetSpendingSummary` query has an optional argument of type `GetSpendingSummaryVariables`:
const getSpendingSummaryVars: GetSpendingSummaryVariables = {
  startDate: ..., // optional
  endDate: ..., // optional
};

// Call the `getSpendingSummaryRef()` function to get a reference to the query.
const ref = getSpendingSummaryRef(getSpendingSummaryVars);
// Variables can be defined inline as well.
const ref = getSpendingSummaryRef({ startDate: ..., endDate: ..., });
// Since all variables are optional for this query, you can omit the `GetSpendingSummaryVariables` argument.
const ref = getSpendingSummaryRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getSpendingSummaryRef(dataConnect, getSpendingSummaryVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.transactions);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.transactions);
});
```

## GetTopMerchants
You can execute the `GetTopMerchants` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getTopMerchants(vars?: GetTopMerchantsVariables): QueryPromise<GetTopMerchantsData, GetTopMerchantsVariables>;

interface GetTopMerchantsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars?: GetTopMerchantsVariables): QueryRef<GetTopMerchantsData, GetTopMerchantsVariables>;
}
export const getTopMerchantsRef: GetTopMerchantsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getTopMerchants(dc: DataConnect, vars?: GetTopMerchantsVariables): QueryPromise<GetTopMerchantsData, GetTopMerchantsVariables>;

interface GetTopMerchantsRef {
  ...
  (dc: DataConnect, vars?: GetTopMerchantsVariables): QueryRef<GetTopMerchantsData, GetTopMerchantsVariables>;
}
export const getTopMerchantsRef: GetTopMerchantsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getTopMerchantsRef:
```typescript
const name = getTopMerchantsRef.operationName;
console.log(name);
```

### Variables
The `GetTopMerchants` query has an optional argument of type `GetTopMerchantsVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetTopMerchantsVariables {
  limit?: number | null;
  startDate?: DateString | null;
  endDate?: DateString | null;
}
```
### Return Type
Recall that executing the `GetTopMerchants` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetTopMerchantsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetTopMerchantsData {
  merchants: ({
    id: number;
    name: string;
    categoryId?: number | null;
    categoryRef?: {
      id: number;
      name: string;
      icon: string;
      color: string;
    } & Category_Key;
      totalAmount?: number | null;
      transactionCount?: number | null;
  } & Merchant_Key)[];
}
```
### Using `GetTopMerchants`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getTopMerchants, GetTopMerchantsVariables } from '@dataconnect/default';

// The `GetTopMerchants` query has an optional argument of type `GetTopMerchantsVariables`:
const getTopMerchantsVars: GetTopMerchantsVariables = {
  limit: ..., // optional
  startDate: ..., // optional
  endDate: ..., // optional
};

// Call the `getTopMerchants()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getTopMerchants(getTopMerchantsVars);
// Variables can be defined inline as well.
const { data } = await getTopMerchants({ limit: ..., startDate: ..., endDate: ..., });
// Since all variables are optional for this query, you can omit the `GetTopMerchantsVariables` argument.
const { data } = await getTopMerchants();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getTopMerchants(dataConnect, getTopMerchantsVars);

console.log(data.merchants);

// Or, you can use the `Promise` API.
getTopMerchants(getTopMerchantsVars).then((response) => {
  const data = response.data;
  console.log(data.merchants);
});
```

### Using `GetTopMerchants`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getTopMerchantsRef, GetTopMerchantsVariables } from '@dataconnect/default';

// The `GetTopMerchants` query has an optional argument of type `GetTopMerchantsVariables`:
const getTopMerchantsVars: GetTopMerchantsVariables = {
  limit: ..., // optional
  startDate: ..., // optional
  endDate: ..., // optional
};

// Call the `getTopMerchantsRef()` function to get a reference to the query.
const ref = getTopMerchantsRef(getTopMerchantsVars);
// Variables can be defined inline as well.
const ref = getTopMerchantsRef({ limit: ..., startDate: ..., endDate: ..., });
// Since all variables are optional for this query, you can omit the `GetTopMerchantsVariables` argument.
const ref = getTopMerchantsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getTopMerchantsRef(dataConnect, getTopMerchantsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.merchants);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.merchants);
});
```

## GetSpendingByCategory
You can execute the `GetSpendingByCategory` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getSpendingByCategory(vars?: GetSpendingByCategoryVariables): QueryPromise<GetSpendingByCategoryData, GetSpendingByCategoryVariables>;

interface GetSpendingByCategoryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars?: GetSpendingByCategoryVariables): QueryRef<GetSpendingByCategoryData, GetSpendingByCategoryVariables>;
}
export const getSpendingByCategoryRef: GetSpendingByCategoryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getSpendingByCategory(dc: DataConnect, vars?: GetSpendingByCategoryVariables): QueryPromise<GetSpendingByCategoryData, GetSpendingByCategoryVariables>;

interface GetSpendingByCategoryRef {
  ...
  (dc: DataConnect, vars?: GetSpendingByCategoryVariables): QueryRef<GetSpendingByCategoryData, GetSpendingByCategoryVariables>;
}
export const getSpendingByCategoryRef: GetSpendingByCategoryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getSpendingByCategoryRef:
```typescript
const name = getSpendingByCategoryRef.operationName;
console.log(name);
```

### Variables
The `GetSpendingByCategory` query has an optional argument of type `GetSpendingByCategoryVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetSpendingByCategoryVariables {
  startDate?: DateString | null;
  endDate?: DateString | null;
}
```
### Return Type
Recall that executing the `GetSpendingByCategory` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetSpendingByCategoryData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetSpendingByCategoryData {
  merchants: ({
    id: number;
    categoryId?: number | null;
    categoryRef?: {
      id: number;
      name: string;
      icon: string;
      color: string;
    } & Category_Key;
      name: string;
      totalAmount?: number | null;
  } & Merchant_Key)[];
}
```
### Using `GetSpendingByCategory`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getSpendingByCategory, GetSpendingByCategoryVariables } from '@dataconnect/default';

// The `GetSpendingByCategory` query has an optional argument of type `GetSpendingByCategoryVariables`:
const getSpendingByCategoryVars: GetSpendingByCategoryVariables = {
  startDate: ..., // optional
  endDate: ..., // optional
};

// Call the `getSpendingByCategory()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getSpendingByCategory(getSpendingByCategoryVars);
// Variables can be defined inline as well.
const { data } = await getSpendingByCategory({ startDate: ..., endDate: ..., });
// Since all variables are optional for this query, you can omit the `GetSpendingByCategoryVariables` argument.
const { data } = await getSpendingByCategory();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getSpendingByCategory(dataConnect, getSpendingByCategoryVars);

console.log(data.merchants);

// Or, you can use the `Promise` API.
getSpendingByCategory(getSpendingByCategoryVars).then((response) => {
  const data = response.data;
  console.log(data.merchants);
});
```

### Using `GetSpendingByCategory`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getSpendingByCategoryRef, GetSpendingByCategoryVariables } from '@dataconnect/default';

// The `GetSpendingByCategory` query has an optional argument of type `GetSpendingByCategoryVariables`:
const getSpendingByCategoryVars: GetSpendingByCategoryVariables = {
  startDate: ..., // optional
  endDate: ..., // optional
};

// Call the `getSpendingByCategoryRef()` function to get a reference to the query.
const ref = getSpendingByCategoryRef(getSpendingByCategoryVars);
// Variables can be defined inline as well.
const ref = getSpendingByCategoryRef({ startDate: ..., endDate: ..., });
// Since all variables are optional for this query, you can omit the `GetSpendingByCategoryVariables` argument.
const ref = getSpendingByCategoryRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getSpendingByCategoryRef(dataConnect, getSpendingByCategoryVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.merchants);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.merchants);
});
```

## ListEmails
You can execute the `ListEmails` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listEmails(vars?: ListEmailsVariables): QueryPromise<ListEmailsData, ListEmailsVariables>;

interface ListEmailsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars?: ListEmailsVariables): QueryRef<ListEmailsData, ListEmailsVariables>;
}
export const listEmailsRef: ListEmailsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listEmails(dc: DataConnect, vars?: ListEmailsVariables): QueryPromise<ListEmailsData, ListEmailsVariables>;

interface ListEmailsRef {
  ...
  (dc: DataConnect, vars?: ListEmailsVariables): QueryRef<ListEmailsData, ListEmailsVariables>;
}
export const listEmailsRef: ListEmailsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listEmailsRef:
```typescript
const name = listEmailsRef.operationName;
console.log(name);
```

### Variables
The `ListEmails` query has an optional argument of type `ListEmailsVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListEmailsVariables {
  limit?: number | null;
  offset?: number | null;
  provider?: string | null;
  parsed?: boolean | null;
}
```
### Return Type
Recall that executing the `ListEmails` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListEmailsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListEmailsData {
  emails: ({
    id: number;
    gmailMessageId: string;
    senderEmail: string;
    senderName?: string | null;
    subject?: string | null;
    receivedAt: TimestampString;
    provider?: string | null;
    parsed?: boolean | null;
    labels?: string[] | null;
    createdAt: TimestampString;
  } & Email_Key)[];
}
```
### Using `ListEmails`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listEmails, ListEmailsVariables } from '@dataconnect/default';

// The `ListEmails` query has an optional argument of type `ListEmailsVariables`:
const listEmailsVars: ListEmailsVariables = {
  limit: ..., // optional
  offset: ..., // optional
  provider: ..., // optional
  parsed: ..., // optional
};

// Call the `listEmails()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listEmails(listEmailsVars);
// Variables can be defined inline as well.
const { data } = await listEmails({ limit: ..., offset: ..., provider: ..., parsed: ..., });
// Since all variables are optional for this query, you can omit the `ListEmailsVariables` argument.
const { data } = await listEmails();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listEmails(dataConnect, listEmailsVars);

console.log(data.emails);

// Or, you can use the `Promise` API.
listEmails(listEmailsVars).then((response) => {
  const data = response.data;
  console.log(data.emails);
});
```

### Using `ListEmails`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listEmailsRef, ListEmailsVariables } from '@dataconnect/default';

// The `ListEmails` query has an optional argument of type `ListEmailsVariables`:
const listEmailsVars: ListEmailsVariables = {
  limit: ..., // optional
  offset: ..., // optional
  provider: ..., // optional
  parsed: ..., // optional
};

// Call the `listEmailsRef()` function to get a reference to the query.
const ref = listEmailsRef(listEmailsVars);
// Variables can be defined inline as well.
const ref = listEmailsRef({ limit: ..., offset: ..., provider: ..., parsed: ..., });
// Since all variables are optional for this query, you can omit the `ListEmailsVariables` argument.
const ref = listEmailsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listEmailsRef(dataConnect, listEmailsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.emails);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.emails);
});
```

## GetEmail
You can execute the `GetEmail` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getEmail(vars: GetEmailVariables): QueryPromise<GetEmailData, GetEmailVariables>;

interface GetEmailRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetEmailVariables): QueryRef<GetEmailData, GetEmailVariables>;
}
export const getEmailRef: GetEmailRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getEmail(dc: DataConnect, vars: GetEmailVariables): QueryPromise<GetEmailData, GetEmailVariables>;

interface GetEmailRef {
  ...
  (dc: DataConnect, vars: GetEmailVariables): QueryRef<GetEmailData, GetEmailVariables>;
}
export const getEmailRef: GetEmailRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getEmailRef:
```typescript
const name = getEmailRef.operationName;
console.log(name);
```

### Variables
The `GetEmail` query requires an argument of type `GetEmailVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetEmailVariables {
  id: number;
}
```
### Return Type
Recall that executing the `GetEmail` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetEmailData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetEmailData {
  email?: {
    id: number;
    gmailMessageId: string;
    gmailHistoryId?: number | null;
    senderEmail: string;
    senderName?: string | null;
    subject?: string | null;
    receivedAt: TimestampString;
    bodyHash: string;
    labels?: string[] | null;
    provider?: string | null;
    parsed?: boolean | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Email_Key;
}
```
### Using `GetEmail`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getEmail, GetEmailVariables } from '@dataconnect/default';

// The `GetEmail` query requires an argument of type `GetEmailVariables`:
const getEmailVars: GetEmailVariables = {
  id: ..., 
};

// Call the `getEmail()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getEmail(getEmailVars);
// Variables can be defined inline as well.
const { data } = await getEmail({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getEmail(dataConnect, getEmailVars);

console.log(data.email);

// Or, you can use the `Promise` API.
getEmail(getEmailVars).then((response) => {
  const data = response.data;
  console.log(data.email);
});
```

### Using `GetEmail`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getEmailRef, GetEmailVariables } from '@dataconnect/default';

// The `GetEmail` query requires an argument of type `GetEmailVariables`:
const getEmailVars: GetEmailVariables = {
  id: ..., 
};

// Call the `getEmailRef()` function to get a reference to the query.
const ref = getEmailRef(getEmailVars);
// Variables can be defined inline as well.
const ref = getEmailRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getEmailRef(dataConnect, getEmailVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.email);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.email);
});
```

## SearchTransactions
You can execute the `SearchTransactions` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
searchTransactions(vars?: SearchTransactionsVariables): QueryPromise<SearchTransactionsData, SearchTransactionsVariables>;

interface SearchTransactionsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars?: SearchTransactionsVariables): QueryRef<SearchTransactionsData, SearchTransactionsVariables>;
}
export const searchTransactionsRef: SearchTransactionsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
searchTransactions(dc: DataConnect, vars?: SearchTransactionsVariables): QueryPromise<SearchTransactionsData, SearchTransactionsVariables>;

interface SearchTransactionsRef {
  ...
  (dc: DataConnect, vars?: SearchTransactionsVariables): QueryRef<SearchTransactionsData, SearchTransactionsVariables>;
}
export const searchTransactionsRef: SearchTransactionsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the searchTransactionsRef:
```typescript
const name = searchTransactionsRef.operationName;
console.log(name);
```

### Variables
The `SearchTransactions` query has an optional argument of type `SearchTransactionsVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface SearchTransactionsVariables {
  searchTerm?: string | null;
  limit?: number | null;
}
```
### Return Type
Recall that executing the `SearchTransactions` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `SearchTransactionsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface SearchTransactionsData {
  transactions: ({
    id: number;
    amount: number;
    currency?: string | null;
    txnType: TxnType;
    txnDate: DateString;
    merchantName?: string | null;
    description?: string | null;
    merchant?: {
      name: string;
      categoryId?: number | null;
      categoryRef?: {
        id: number;
        name: string;
        icon: string;
        color: string;
      } & Category_Key;
    };
  } & Transaction_Key)[];
}
```
### Using `SearchTransactions`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, searchTransactions, SearchTransactionsVariables } from '@dataconnect/default';

// The `SearchTransactions` query has an optional argument of type `SearchTransactionsVariables`:
const searchTransactionsVars: SearchTransactionsVariables = {
  searchTerm: ..., // optional
  limit: ..., // optional
};

// Call the `searchTransactions()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await searchTransactions(searchTransactionsVars);
// Variables can be defined inline as well.
const { data } = await searchTransactions({ searchTerm: ..., limit: ..., });
// Since all variables are optional for this query, you can omit the `SearchTransactionsVariables` argument.
const { data } = await searchTransactions();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await searchTransactions(dataConnect, searchTransactionsVars);

console.log(data.transactions);

// Or, you can use the `Promise` API.
searchTransactions(searchTransactionsVars).then((response) => {
  const data = response.data;
  console.log(data.transactions);
});
```

### Using `SearchTransactions`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, searchTransactionsRef, SearchTransactionsVariables } from '@dataconnect/default';

// The `SearchTransactions` query has an optional argument of type `SearchTransactionsVariables`:
const searchTransactionsVars: SearchTransactionsVariables = {
  searchTerm: ..., // optional
  limit: ..., // optional
};

// Call the `searchTransactionsRef()` function to get a reference to the query.
const ref = searchTransactionsRef(searchTransactionsVars);
// Variables can be defined inline as well.
const ref = searchTransactionsRef({ searchTerm: ..., limit: ..., });
// Since all variables are optional for this query, you can omit the `SearchTransactionsVariables` argument.
const ref = searchTransactionsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = searchTransactionsRef(dataConnect, searchTransactionsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.transactions);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.transactions);
});
```

## GetDailySpending
You can execute the `GetDailySpending` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getDailySpending(vars: GetDailySpendingVariables): QueryPromise<GetDailySpendingData, GetDailySpendingVariables>;

interface GetDailySpendingRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetDailySpendingVariables): QueryRef<GetDailySpendingData, GetDailySpendingVariables>;
}
export const getDailySpendingRef: GetDailySpendingRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getDailySpending(dc: DataConnect, vars: GetDailySpendingVariables): QueryPromise<GetDailySpendingData, GetDailySpendingVariables>;

interface GetDailySpendingRef {
  ...
  (dc: DataConnect, vars: GetDailySpendingVariables): QueryRef<GetDailySpendingData, GetDailySpendingVariables>;
}
export const getDailySpendingRef: GetDailySpendingRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getDailySpendingRef:
```typescript
const name = getDailySpendingRef.operationName;
console.log(name);
```

### Variables
The `GetDailySpending` query requires an argument of type `GetDailySpendingVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetDailySpendingVariables {
  startDate: DateString;
  endDate: DateString;
}
```
### Return Type
Recall that executing the `GetDailySpending` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetDailySpendingData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetDailySpendingData {
  transactions: ({
    txnDate: DateString;
    amount: number;
    txnType: TxnType;
  })[];
}
```
### Using `GetDailySpending`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getDailySpending, GetDailySpendingVariables } from '@dataconnect/default';

// The `GetDailySpending` query requires an argument of type `GetDailySpendingVariables`:
const getDailySpendingVars: GetDailySpendingVariables = {
  startDate: ..., 
  endDate: ..., 
};

// Call the `getDailySpending()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getDailySpending(getDailySpendingVars);
// Variables can be defined inline as well.
const { data } = await getDailySpending({ startDate: ..., endDate: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getDailySpending(dataConnect, getDailySpendingVars);

console.log(data.transactions);

// Or, you can use the `Promise` API.
getDailySpending(getDailySpendingVars).then((response) => {
  const data = response.data;
  console.log(data.transactions);
});
```

### Using `GetDailySpending`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getDailySpendingRef, GetDailySpendingVariables } from '@dataconnect/default';

// The `GetDailySpending` query requires an argument of type `GetDailySpendingVariables`:
const getDailySpendingVars: GetDailySpendingVariables = {
  startDate: ..., 
  endDate: ..., 
};

// Call the `getDailySpendingRef()` function to get a reference to the query.
const ref = getDailySpendingRef(getDailySpendingVars);
// Variables can be defined inline as well.
const ref = getDailySpendingRef({ startDate: ..., endDate: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getDailySpendingRef(dataConnect, getDailySpendingVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.transactions);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.transactions);
});
```

## GetGmailSyncState
You can execute the `GetGmailSyncState` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getGmailSyncState(): QueryPromise<GetGmailSyncStateData, undefined>;

interface GetGmailSyncStateRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetGmailSyncStateData, undefined>;
}
export const getGmailSyncStateRef: GetGmailSyncStateRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getGmailSyncState(dc: DataConnect): QueryPromise<GetGmailSyncStateData, undefined>;

interface GetGmailSyncStateRef {
  ...
  (dc: DataConnect): QueryRef<GetGmailSyncStateData, undefined>;
}
export const getGmailSyncStateRef: GetGmailSyncStateRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getGmailSyncStateRef:
```typescript
const name = getGmailSyncStateRef.operationName;
console.log(name);
```

### Variables
The `GetGmailSyncState` query has no variables.
### Return Type
Recall that executing the `GetGmailSyncState` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetGmailSyncStateData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetGmailSyncStateData {
  gmailSyncState?: {
    id: number;
    lastHistoryId: number;
    lastSyncedAt: TimestampString;
    watchExpiration?: TimestampString | null;
    updatedAt: TimestampString;
  } & GmailSyncState_Key;
}
```
### Using `GetGmailSyncState`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getGmailSyncState } from '@dataconnect/default';


// Call the `getGmailSyncState()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getGmailSyncState();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getGmailSyncState(dataConnect);

console.log(data.gmailSyncState);

// Or, you can use the `Promise` API.
getGmailSyncState().then((response) => {
  const data = response.data;
  console.log(data.gmailSyncState);
});
```

### Using `GetGmailSyncState`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getGmailSyncStateRef } from '@dataconnect/default';


// Call the `getGmailSyncStateRef()` function to get a reference to the query.
const ref = getGmailSyncStateRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getGmailSyncStateRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.gmailSyncState);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.gmailSyncState);
});
```

## GetTransactionsByMerchant
You can execute the `GetTransactionsByMerchant` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getTransactionsByMerchant(vars: GetTransactionsByMerchantVariables): QueryPromise<GetTransactionsByMerchantData, GetTransactionsByMerchantVariables>;

interface GetTransactionsByMerchantRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetTransactionsByMerchantVariables): QueryRef<GetTransactionsByMerchantData, GetTransactionsByMerchantVariables>;
}
export const getTransactionsByMerchantRef: GetTransactionsByMerchantRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getTransactionsByMerchant(dc: DataConnect, vars: GetTransactionsByMerchantVariables): QueryPromise<GetTransactionsByMerchantData, GetTransactionsByMerchantVariables>;

interface GetTransactionsByMerchantRef {
  ...
  (dc: DataConnect, vars: GetTransactionsByMerchantVariables): QueryRef<GetTransactionsByMerchantData, GetTransactionsByMerchantVariables>;
}
export const getTransactionsByMerchantRef: GetTransactionsByMerchantRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getTransactionsByMerchantRef:
```typescript
const name = getTransactionsByMerchantRef.operationName;
console.log(name);
```

### Variables
The `GetTransactionsByMerchant` query requires an argument of type `GetTransactionsByMerchantVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetTransactionsByMerchantVariables {
  merchantId: number;
}
```
### Return Type
Recall that executing the `GetTransactionsByMerchant` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetTransactionsByMerchantData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetTransactionsByMerchantData {
  transactions: ({
    id: number;
    merchantId?: number | null;
  } & Transaction_Key)[];
}
```
### Using `GetTransactionsByMerchant`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getTransactionsByMerchant, GetTransactionsByMerchantVariables } from '@dataconnect/default';

// The `GetTransactionsByMerchant` query requires an argument of type `GetTransactionsByMerchantVariables`:
const getTransactionsByMerchantVars: GetTransactionsByMerchantVariables = {
  merchantId: ..., 
};

// Call the `getTransactionsByMerchant()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getTransactionsByMerchant(getTransactionsByMerchantVars);
// Variables can be defined inline as well.
const { data } = await getTransactionsByMerchant({ merchantId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getTransactionsByMerchant(dataConnect, getTransactionsByMerchantVars);

console.log(data.transactions);

// Or, you can use the `Promise` API.
getTransactionsByMerchant(getTransactionsByMerchantVars).then((response) => {
  const data = response.data;
  console.log(data.transactions);
});
```

### Using `GetTransactionsByMerchant`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getTransactionsByMerchantRef, GetTransactionsByMerchantVariables } from '@dataconnect/default';

// The `GetTransactionsByMerchant` query requires an argument of type `GetTransactionsByMerchantVariables`:
const getTransactionsByMerchantVars: GetTransactionsByMerchantVariables = {
  merchantId: ..., 
};

// Call the `getTransactionsByMerchantRef()` function to get a reference to the query.
const ref = getTransactionsByMerchantRef(getTransactionsByMerchantVars);
// Variables can be defined inline as well.
const ref = getTransactionsByMerchantRef({ merchantId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getTransactionsByMerchantRef(dataConnect, getTransactionsByMerchantVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.transactions);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.transactions);
});
```

## ListCategories
You can execute the `ListCategories` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listCategories(): QueryPromise<ListCategoriesData, undefined>;

interface ListCategoriesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCategoriesData, undefined>;
}
export const listCategoriesRef: ListCategoriesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listCategories(dc: DataConnect): QueryPromise<ListCategoriesData, undefined>;

interface ListCategoriesRef {
  ...
  (dc: DataConnect): QueryRef<ListCategoriesData, undefined>;
}
export const listCategoriesRef: ListCategoriesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listCategoriesRef:
```typescript
const name = listCategoriesRef.operationName;
console.log(name);
```

### Variables
The `ListCategories` query has no variables.
### Return Type
Recall that executing the `ListCategories` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListCategoriesData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListCategoriesData {
  categories: ({
    id: number;
    name: string;
    icon: string;
    color: string;
    description?: string | null;
    isDefault?: boolean | null;
    createdAt: TimestampString;
  } & Category_Key)[];
}
```
### Using `ListCategories`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listCategories } from '@dataconnect/default';


// Call the `listCategories()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listCategories();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listCategories(dataConnect);

console.log(data.categories);

// Or, you can use the `Promise` API.
listCategories().then((response) => {
  const data = response.data;
  console.log(data.categories);
});
```

### Using `ListCategories`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listCategoriesRef } from '@dataconnect/default';


// Call the `listCategoriesRef()` function to get a reference to the query.
const ref = listCategoriesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listCategoriesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.categories);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.categories);
});
```

## GetCategory
You can execute the `GetCategory` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getCategory(vars: GetCategoryVariables): QueryPromise<GetCategoryData, GetCategoryVariables>;

interface GetCategoryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetCategoryVariables): QueryRef<GetCategoryData, GetCategoryVariables>;
}
export const getCategoryRef: GetCategoryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getCategory(dc: DataConnect, vars: GetCategoryVariables): QueryPromise<GetCategoryData, GetCategoryVariables>;

interface GetCategoryRef {
  ...
  (dc: DataConnect, vars: GetCategoryVariables): QueryRef<GetCategoryData, GetCategoryVariables>;
}
export const getCategoryRef: GetCategoryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getCategoryRef:
```typescript
const name = getCategoryRef.operationName;
console.log(name);
```

### Variables
The `GetCategory` query requires an argument of type `GetCategoryVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetCategoryVariables {
  id: number;
}
```
### Return Type
Recall that executing the `GetCategory` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetCategoryData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetCategoryData {
  category?: {
    id: number;
    name: string;
    icon: string;
    color: string;
    description?: string | null;
    isDefault?: boolean | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Category_Key;
}
```
### Using `GetCategory`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getCategory, GetCategoryVariables } from '@dataconnect/default';

// The `GetCategory` query requires an argument of type `GetCategoryVariables`:
const getCategoryVars: GetCategoryVariables = {
  id: ..., 
};

// Call the `getCategory()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getCategory(getCategoryVars);
// Variables can be defined inline as well.
const { data } = await getCategory({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getCategory(dataConnect, getCategoryVars);

console.log(data.category);

// Or, you can use the `Promise` API.
getCategory(getCategoryVars).then((response) => {
  const data = response.data;
  console.log(data.category);
});
```

### Using `GetCategory`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getCategoryRef, GetCategoryVariables } from '@dataconnect/default';

// The `GetCategory` query requires an argument of type `GetCategoryVariables`:
const getCategoryVars: GetCategoryVariables = {
  id: ..., 
};

// Call the `getCategoryRef()` function to get a reference to the query.
const ref = getCategoryRef(getCategoryVars);
// Variables can be defined inline as well.
const ref = getCategoryRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getCategoryRef(dataConnect, getCategoryVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.category);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.category);
});
```

## GetCategoryByName
You can execute the `GetCategoryByName` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getCategoryByName(vars: GetCategoryByNameVariables): QueryPromise<GetCategoryByNameData, GetCategoryByNameVariables>;

interface GetCategoryByNameRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetCategoryByNameVariables): QueryRef<GetCategoryByNameData, GetCategoryByNameVariables>;
}
export const getCategoryByNameRef: GetCategoryByNameRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getCategoryByName(dc: DataConnect, vars: GetCategoryByNameVariables): QueryPromise<GetCategoryByNameData, GetCategoryByNameVariables>;

interface GetCategoryByNameRef {
  ...
  (dc: DataConnect, vars: GetCategoryByNameVariables): QueryRef<GetCategoryByNameData, GetCategoryByNameVariables>;
}
export const getCategoryByNameRef: GetCategoryByNameRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getCategoryByNameRef:
```typescript
const name = getCategoryByNameRef.operationName;
console.log(name);
```

### Variables
The `GetCategoryByName` query requires an argument of type `GetCategoryByNameVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetCategoryByNameVariables {
  name: string;
}
```
### Return Type
Recall that executing the `GetCategoryByName` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetCategoryByNameData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetCategoryByNameData {
  categories: ({
    id: number;
    name: string;
    icon: string;
    color: string;
    description?: string | null;
    isDefault?: boolean | null;
  } & Category_Key)[];
}
```
### Using `GetCategoryByName`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getCategoryByName, GetCategoryByNameVariables } from '@dataconnect/default';

// The `GetCategoryByName` query requires an argument of type `GetCategoryByNameVariables`:
const getCategoryByNameVars: GetCategoryByNameVariables = {
  name: ..., 
};

// Call the `getCategoryByName()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getCategoryByName(getCategoryByNameVars);
// Variables can be defined inline as well.
const { data } = await getCategoryByName({ name: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getCategoryByName(dataConnect, getCategoryByNameVars);

console.log(data.categories);

// Or, you can use the `Promise` API.
getCategoryByName(getCategoryByNameVars).then((response) => {
  const data = response.data;
  console.log(data.categories);
});
```

### Using `GetCategoryByName`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getCategoryByNameRef, GetCategoryByNameVariables } from '@dataconnect/default';

// The `GetCategoryByName` query requires an argument of type `GetCategoryByNameVariables`:
const getCategoryByNameVars: GetCategoryByNameVariables = {
  name: ..., 
};

// Call the `getCategoryByNameRef()` function to get a reference to the query.
const ref = getCategoryByNameRef(getCategoryByNameVars);
// Variables can be defined inline as well.
const ref = getCategoryByNameRef({ name: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getCategoryByNameRef(dataConnect, getCategoryByNameVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.categories);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.categories);
});
```

## GetRecentEmailsForMonitoring
You can execute the `GetRecentEmailsForMonitoring` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getRecentEmailsForMonitoring(vars?: GetRecentEmailsForMonitoringVariables): QueryPromise<GetRecentEmailsForMonitoringData, GetRecentEmailsForMonitoringVariables>;

interface GetRecentEmailsForMonitoringRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars?: GetRecentEmailsForMonitoringVariables): QueryRef<GetRecentEmailsForMonitoringData, GetRecentEmailsForMonitoringVariables>;
}
export const getRecentEmailsForMonitoringRef: GetRecentEmailsForMonitoringRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getRecentEmailsForMonitoring(dc: DataConnect, vars?: GetRecentEmailsForMonitoringVariables): QueryPromise<GetRecentEmailsForMonitoringData, GetRecentEmailsForMonitoringVariables>;

interface GetRecentEmailsForMonitoringRef {
  ...
  (dc: DataConnect, vars?: GetRecentEmailsForMonitoringVariables): QueryRef<GetRecentEmailsForMonitoringData, GetRecentEmailsForMonitoringVariables>;
}
export const getRecentEmailsForMonitoringRef: GetRecentEmailsForMonitoringRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getRecentEmailsForMonitoringRef:
```typescript
const name = getRecentEmailsForMonitoringRef.operationName;
console.log(name);
```

### Variables
The `GetRecentEmailsForMonitoring` query has an optional argument of type `GetRecentEmailsForMonitoringVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetRecentEmailsForMonitoringVariables {
  limit?: number | null;
}
```
### Return Type
Recall that executing the `GetRecentEmailsForMonitoring` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetRecentEmailsForMonitoringData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetRecentEmailsForMonitoringData {
  emails: ({
    id: number;
    gmailMessageId: string;
    senderEmail: string;
    senderName?: string | null;
    subject?: string | null;
    receivedAt: TimestampString;
    provider?: string | null;
    parsed?: boolean | null;
    createdAt: TimestampString;
  } & Email_Key)[];
}
```
### Using `GetRecentEmailsForMonitoring`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getRecentEmailsForMonitoring, GetRecentEmailsForMonitoringVariables } from '@dataconnect/default';

// The `GetRecentEmailsForMonitoring` query has an optional argument of type `GetRecentEmailsForMonitoringVariables`:
const getRecentEmailsForMonitoringVars: GetRecentEmailsForMonitoringVariables = {
  limit: ..., // optional
};

// Call the `getRecentEmailsForMonitoring()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getRecentEmailsForMonitoring(getRecentEmailsForMonitoringVars);
// Variables can be defined inline as well.
const { data } = await getRecentEmailsForMonitoring({ limit: ..., });
// Since all variables are optional for this query, you can omit the `GetRecentEmailsForMonitoringVariables` argument.
const { data } = await getRecentEmailsForMonitoring();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getRecentEmailsForMonitoring(dataConnect, getRecentEmailsForMonitoringVars);

console.log(data.emails);

// Or, you can use the `Promise` API.
getRecentEmailsForMonitoring(getRecentEmailsForMonitoringVars).then((response) => {
  const data = response.data;
  console.log(data.emails);
});
```

### Using `GetRecentEmailsForMonitoring`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getRecentEmailsForMonitoringRef, GetRecentEmailsForMonitoringVariables } from '@dataconnect/default';

// The `GetRecentEmailsForMonitoring` query has an optional argument of type `GetRecentEmailsForMonitoringVariables`:
const getRecentEmailsForMonitoringVars: GetRecentEmailsForMonitoringVariables = {
  limit: ..., // optional
};

// Call the `getRecentEmailsForMonitoringRef()` function to get a reference to the query.
const ref = getRecentEmailsForMonitoringRef(getRecentEmailsForMonitoringVars);
// Variables can be defined inline as well.
const ref = getRecentEmailsForMonitoringRef({ limit: ..., });
// Since all variables are optional for this query, you can omit the `GetRecentEmailsForMonitoringVariables` argument.
const ref = getRecentEmailsForMonitoringRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getRecentEmailsForMonitoringRef(dataConnect, getRecentEmailsForMonitoringVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.emails);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.emails);
});
```

## GetRecentTransactionsForMonitoring
You can execute the `GetRecentTransactionsForMonitoring` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getRecentTransactionsForMonitoring(vars?: GetRecentTransactionsForMonitoringVariables): QueryPromise<GetRecentTransactionsForMonitoringData, GetRecentTransactionsForMonitoringVariables>;

interface GetRecentTransactionsForMonitoringRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars?: GetRecentTransactionsForMonitoringVariables): QueryRef<GetRecentTransactionsForMonitoringData, GetRecentTransactionsForMonitoringVariables>;
}
export const getRecentTransactionsForMonitoringRef: GetRecentTransactionsForMonitoringRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getRecentTransactionsForMonitoring(dc: DataConnect, vars?: GetRecentTransactionsForMonitoringVariables): QueryPromise<GetRecentTransactionsForMonitoringData, GetRecentTransactionsForMonitoringVariables>;

interface GetRecentTransactionsForMonitoringRef {
  ...
  (dc: DataConnect, vars?: GetRecentTransactionsForMonitoringVariables): QueryRef<GetRecentTransactionsForMonitoringData, GetRecentTransactionsForMonitoringVariables>;
}
export const getRecentTransactionsForMonitoringRef: GetRecentTransactionsForMonitoringRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getRecentTransactionsForMonitoringRef:
```typescript
const name = getRecentTransactionsForMonitoringRef.operationName;
console.log(name);
```

### Variables
The `GetRecentTransactionsForMonitoring` query has an optional argument of type `GetRecentTransactionsForMonitoringVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetRecentTransactionsForMonitoringVariables {
  limit?: number | null;
}
```
### Return Type
Recall that executing the `GetRecentTransactionsForMonitoring` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetRecentTransactionsForMonitoringData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetRecentTransactionsForMonitoringData {
  transactions: ({
    id: number;
    amount: number;
    merchantName?: string | null;
    provider: string;
    txnDate: DateString;
    createdAt: TimestampString;
  } & Transaction_Key)[];
}
```
### Using `GetRecentTransactionsForMonitoring`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getRecentTransactionsForMonitoring, GetRecentTransactionsForMonitoringVariables } from '@dataconnect/default';

// The `GetRecentTransactionsForMonitoring` query has an optional argument of type `GetRecentTransactionsForMonitoringVariables`:
const getRecentTransactionsForMonitoringVars: GetRecentTransactionsForMonitoringVariables = {
  limit: ..., // optional
};

// Call the `getRecentTransactionsForMonitoring()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getRecentTransactionsForMonitoring(getRecentTransactionsForMonitoringVars);
// Variables can be defined inline as well.
const { data } = await getRecentTransactionsForMonitoring({ limit: ..., });
// Since all variables are optional for this query, you can omit the `GetRecentTransactionsForMonitoringVariables` argument.
const { data } = await getRecentTransactionsForMonitoring();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getRecentTransactionsForMonitoring(dataConnect, getRecentTransactionsForMonitoringVars);

console.log(data.transactions);

// Or, you can use the `Promise` API.
getRecentTransactionsForMonitoring(getRecentTransactionsForMonitoringVars).then((response) => {
  const data = response.data;
  console.log(data.transactions);
});
```

### Using `GetRecentTransactionsForMonitoring`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getRecentTransactionsForMonitoringRef, GetRecentTransactionsForMonitoringVariables } from '@dataconnect/default';

// The `GetRecentTransactionsForMonitoring` query has an optional argument of type `GetRecentTransactionsForMonitoringVariables`:
const getRecentTransactionsForMonitoringVars: GetRecentTransactionsForMonitoringVariables = {
  limit: ..., // optional
};

// Call the `getRecentTransactionsForMonitoringRef()` function to get a reference to the query.
const ref = getRecentTransactionsForMonitoringRef(getRecentTransactionsForMonitoringVars);
// Variables can be defined inline as well.
const ref = getRecentTransactionsForMonitoringRef({ limit: ..., });
// Since all variables are optional for this query, you can omit the `GetRecentTransactionsForMonitoringVariables` argument.
const ref = getRecentTransactionsForMonitoringRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getRecentTransactionsForMonitoringRef(dataConnect, getRecentTransactionsForMonitoringVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.transactions);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.transactions);
});
```

## GetAllEmails
You can execute the `GetAllEmails` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getAllEmails(): QueryPromise<GetAllEmailsData, undefined>;

interface GetAllEmailsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetAllEmailsData, undefined>;
}
export const getAllEmailsRef: GetAllEmailsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getAllEmails(dc: DataConnect): QueryPromise<GetAllEmailsData, undefined>;

interface GetAllEmailsRef {
  ...
  (dc: DataConnect): QueryRef<GetAllEmailsData, undefined>;
}
export const getAllEmailsRef: GetAllEmailsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getAllEmailsRef:
```typescript
const name = getAllEmailsRef.operationName;
console.log(name);
```

### Variables
The `GetAllEmails` query has no variables.
### Return Type
Recall that executing the `GetAllEmails` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetAllEmailsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetAllEmailsData {
  emails: ({
    id: number;
    receivedAt: TimestampString;
  } & Email_Key)[];
}
```
### Using `GetAllEmails`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getAllEmails } from '@dataconnect/default';


// Call the `getAllEmails()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getAllEmails();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getAllEmails(dataConnect);

console.log(data.emails);

// Or, you can use the `Promise` API.
getAllEmails().then((response) => {
  const data = response.data;
  console.log(data.emails);
});
```

### Using `GetAllEmails`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getAllEmailsRef } from '@dataconnect/default';


// Call the `getAllEmailsRef()` function to get a reference to the query.
const ref = getAllEmailsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getAllEmailsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.emails);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.emails);
});
```

## GetEmailsAfterDate
You can execute the `GetEmailsAfterDate` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getEmailsAfterDate(vars: GetEmailsAfterDateVariables): QueryPromise<GetEmailsAfterDateData, GetEmailsAfterDateVariables>;

interface GetEmailsAfterDateRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetEmailsAfterDateVariables): QueryRef<GetEmailsAfterDateData, GetEmailsAfterDateVariables>;
}
export const getEmailsAfterDateRef: GetEmailsAfterDateRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getEmailsAfterDate(dc: DataConnect, vars: GetEmailsAfterDateVariables): QueryPromise<GetEmailsAfterDateData, GetEmailsAfterDateVariables>;

interface GetEmailsAfterDateRef {
  ...
  (dc: DataConnect, vars: GetEmailsAfterDateVariables): QueryRef<GetEmailsAfterDateData, GetEmailsAfterDateVariables>;
}
export const getEmailsAfterDateRef: GetEmailsAfterDateRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getEmailsAfterDateRef:
```typescript
const name = getEmailsAfterDateRef.operationName;
console.log(name);
```

### Variables
The `GetEmailsAfterDate` query requires an argument of type `GetEmailsAfterDateVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetEmailsAfterDateVariables {
  minDate: TimestampString;
}
```
### Return Type
Recall that executing the `GetEmailsAfterDate` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetEmailsAfterDateData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetEmailsAfterDateData {
  emails: ({
    id: number;
    receivedAt: TimestampString;
  } & Email_Key)[];
}
```
### Using `GetEmailsAfterDate`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getEmailsAfterDate, GetEmailsAfterDateVariables } from '@dataconnect/default';

// The `GetEmailsAfterDate` query requires an argument of type `GetEmailsAfterDateVariables`:
const getEmailsAfterDateVars: GetEmailsAfterDateVariables = {
  minDate: ..., 
};

// Call the `getEmailsAfterDate()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getEmailsAfterDate(getEmailsAfterDateVars);
// Variables can be defined inline as well.
const { data } = await getEmailsAfterDate({ minDate: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getEmailsAfterDate(dataConnect, getEmailsAfterDateVars);

console.log(data.emails);

// Or, you can use the `Promise` API.
getEmailsAfterDate(getEmailsAfterDateVars).then((response) => {
  const data = response.data;
  console.log(data.emails);
});
```

### Using `GetEmailsAfterDate`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getEmailsAfterDateRef, GetEmailsAfterDateVariables } from '@dataconnect/default';

// The `GetEmailsAfterDate` query requires an argument of type `GetEmailsAfterDateVariables`:
const getEmailsAfterDateVars: GetEmailsAfterDateVariables = {
  minDate: ..., 
};

// Call the `getEmailsAfterDateRef()` function to get a reference to the query.
const ref = getEmailsAfterDateRef(getEmailsAfterDateVars);
// Variables can be defined inline as well.
const ref = getEmailsAfterDateRef({ minDate: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getEmailsAfterDateRef(dataConnect, getEmailsAfterDateVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.emails);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.emails);
});
```

## GetLatestEmail
You can execute the `GetLatestEmail` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getLatestEmail(): QueryPromise<GetLatestEmailData, undefined>;

interface GetLatestEmailRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetLatestEmailData, undefined>;
}
export const getLatestEmailRef: GetLatestEmailRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getLatestEmail(dc: DataConnect): QueryPromise<GetLatestEmailData, undefined>;

interface GetLatestEmailRef {
  ...
  (dc: DataConnect): QueryRef<GetLatestEmailData, undefined>;
}
export const getLatestEmailRef: GetLatestEmailRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getLatestEmailRef:
```typescript
const name = getLatestEmailRef.operationName;
console.log(name);
```

### Variables
The `GetLatestEmail` query has no variables.
### Return Type
Recall that executing the `GetLatestEmail` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetLatestEmailData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetLatestEmailData {
  emails: ({
    id: number;
    receivedAt: TimestampString;
  } & Email_Key)[];
}
```
### Using `GetLatestEmail`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getLatestEmail } from '@dataconnect/default';


// Call the `getLatestEmail()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getLatestEmail();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getLatestEmail(dataConnect);

console.log(data.emails);

// Or, you can use the `Promise` API.
getLatestEmail().then((response) => {
  const data = response.data;
  console.log(data.emails);
});
```

### Using `GetLatestEmail`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getLatestEmailRef } from '@dataconnect/default';


// Call the `getLatestEmailRef()` function to get a reference to the query.
const ref = getLatestEmailRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getLatestEmailRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.emails);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.emails);
});
```

## GetAllTransactions
You can execute the `GetAllTransactions` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getAllTransactions(): QueryPromise<GetAllTransactionsData, undefined>;

interface GetAllTransactionsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetAllTransactionsData, undefined>;
}
export const getAllTransactionsRef: GetAllTransactionsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getAllTransactions(dc: DataConnect): QueryPromise<GetAllTransactionsData, undefined>;

interface GetAllTransactionsRef {
  ...
  (dc: DataConnect): QueryRef<GetAllTransactionsData, undefined>;
}
export const getAllTransactionsRef: GetAllTransactionsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getAllTransactionsRef:
```typescript
const name = getAllTransactionsRef.operationName;
console.log(name);
```

### Variables
The `GetAllTransactions` query has no variables.
### Return Type
Recall that executing the `GetAllTransactions` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetAllTransactionsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetAllTransactionsData {
  transactions: ({
    id: number;
    txnDate: DateString;
  } & Transaction_Key)[];
}
```
### Using `GetAllTransactions`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getAllTransactions } from '@dataconnect/default';


// Call the `getAllTransactions()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getAllTransactions();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getAllTransactions(dataConnect);

console.log(data.transactions);

// Or, you can use the `Promise` API.
getAllTransactions().then((response) => {
  const data = response.data;
  console.log(data.transactions);
});
```

### Using `GetAllTransactions`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getAllTransactionsRef } from '@dataconnect/default';


// Call the `getAllTransactionsRef()` function to get a reference to the query.
const ref = getAllTransactionsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getAllTransactionsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.transactions);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.transactions);
});
```

## GetTransactionsAfterDate
You can execute the `GetTransactionsAfterDate` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getTransactionsAfterDate(vars: GetTransactionsAfterDateVariables): QueryPromise<GetTransactionsAfterDateData, GetTransactionsAfterDateVariables>;

interface GetTransactionsAfterDateRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetTransactionsAfterDateVariables): QueryRef<GetTransactionsAfterDateData, GetTransactionsAfterDateVariables>;
}
export const getTransactionsAfterDateRef: GetTransactionsAfterDateRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getTransactionsAfterDate(dc: DataConnect, vars: GetTransactionsAfterDateVariables): QueryPromise<GetTransactionsAfterDateData, GetTransactionsAfterDateVariables>;

interface GetTransactionsAfterDateRef {
  ...
  (dc: DataConnect, vars: GetTransactionsAfterDateVariables): QueryRef<GetTransactionsAfterDateData, GetTransactionsAfterDateVariables>;
}
export const getTransactionsAfterDateRef: GetTransactionsAfterDateRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getTransactionsAfterDateRef:
```typescript
const name = getTransactionsAfterDateRef.operationName;
console.log(name);
```

### Variables
The `GetTransactionsAfterDate` query requires an argument of type `GetTransactionsAfterDateVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetTransactionsAfterDateVariables {
  minDate: DateString;
}
```
### Return Type
Recall that executing the `GetTransactionsAfterDate` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetTransactionsAfterDateData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetTransactionsAfterDateData {
  transactions: ({
    id: number;
    txnDate: DateString;
  } & Transaction_Key)[];
}
```
### Using `GetTransactionsAfterDate`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getTransactionsAfterDate, GetTransactionsAfterDateVariables } from '@dataconnect/default';

// The `GetTransactionsAfterDate` query requires an argument of type `GetTransactionsAfterDateVariables`:
const getTransactionsAfterDateVars: GetTransactionsAfterDateVariables = {
  minDate: ..., 
};

// Call the `getTransactionsAfterDate()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getTransactionsAfterDate(getTransactionsAfterDateVars);
// Variables can be defined inline as well.
const { data } = await getTransactionsAfterDate({ minDate: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getTransactionsAfterDate(dataConnect, getTransactionsAfterDateVars);

console.log(data.transactions);

// Or, you can use the `Promise` API.
getTransactionsAfterDate(getTransactionsAfterDateVars).then((response) => {
  const data = response.data;
  console.log(data.transactions);
});
```

### Using `GetTransactionsAfterDate`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getTransactionsAfterDateRef, GetTransactionsAfterDateVariables } from '@dataconnect/default';

// The `GetTransactionsAfterDate` query requires an argument of type `GetTransactionsAfterDateVariables`:
const getTransactionsAfterDateVars: GetTransactionsAfterDateVariables = {
  minDate: ..., 
};

// Call the `getTransactionsAfterDateRef()` function to get a reference to the query.
const ref = getTransactionsAfterDateRef(getTransactionsAfterDateVars);
// Variables can be defined inline as well.
const ref = getTransactionsAfterDateRef({ minDate: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getTransactionsAfterDateRef(dataConnect, getTransactionsAfterDateVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.transactions);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.transactions);
});
```

## GetLatestTransaction
You can execute the `GetLatestTransaction` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getLatestTransaction(): QueryPromise<GetLatestTransactionData, undefined>;

interface GetLatestTransactionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetLatestTransactionData, undefined>;
}
export const getLatestTransactionRef: GetLatestTransactionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getLatestTransaction(dc: DataConnect): QueryPromise<GetLatestTransactionData, undefined>;

interface GetLatestTransactionRef {
  ...
  (dc: DataConnect): QueryRef<GetLatestTransactionData, undefined>;
}
export const getLatestTransactionRef: GetLatestTransactionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getLatestTransactionRef:
```typescript
const name = getLatestTransactionRef.operationName;
console.log(name);
```

### Variables
The `GetLatestTransaction` query has no variables.
### Return Type
Recall that executing the `GetLatestTransaction` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetLatestTransactionData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetLatestTransactionData {
  transactions: ({
    id: number;
    txnDate: DateString;
  } & Transaction_Key)[];
}
```
### Using `GetLatestTransaction`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getLatestTransaction } from '@dataconnect/default';


// Call the `getLatestTransaction()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getLatestTransaction();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getLatestTransaction(dataConnect);

console.log(data.transactions);

// Or, you can use the `Promise` API.
getLatestTransaction().then((response) => {
  const data = response.data;
  console.log(data.transactions);
});
```

### Using `GetLatestTransaction`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getLatestTransactionRef } from '@dataconnect/default';


// Call the `getLatestTransactionRef()` function to get a reference to the query.
const ref = getLatestTransactionRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getLatestTransactionRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.transactions);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.transactions);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `default` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateEmail
You can execute the `CreateEmail` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
createEmail(vars: CreateEmailVariables): MutationPromise<CreateEmailData, CreateEmailVariables>;

interface CreateEmailRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateEmailVariables): MutationRef<CreateEmailData, CreateEmailVariables>;
}
export const createEmailRef: CreateEmailRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createEmail(dc: DataConnect, vars: CreateEmailVariables): MutationPromise<CreateEmailData, CreateEmailVariables>;

interface CreateEmailRef {
  ...
  (dc: DataConnect, vars: CreateEmailVariables): MutationRef<CreateEmailData, CreateEmailVariables>;
}
export const createEmailRef: CreateEmailRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createEmailRef:
```typescript
const name = createEmailRef.operationName;
console.log(name);
```

### Variables
The `CreateEmail` mutation requires an argument of type `CreateEmailVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateEmailVariables {
  id: number;
  gmailMessageId: string;
  gmailHistoryId?: number | null;
  senderEmail: string;
  senderName?: string | null;
  subject?: string | null;
  receivedAt: TimestampString;
  bodyHash: string;
  labels?: string[] | null;
  provider?: string | null;
  parsed?: boolean | null;
}
```
### Return Type
Recall that executing the `CreateEmail` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateEmailData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateEmailData {
  email_insert: Email_Key;
}
```
### Using `CreateEmail`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createEmail, CreateEmailVariables } from '@dataconnect/default';

// The `CreateEmail` mutation requires an argument of type `CreateEmailVariables`:
const createEmailVars: CreateEmailVariables = {
  id: ..., 
  gmailMessageId: ..., 
  gmailHistoryId: ..., // optional
  senderEmail: ..., 
  senderName: ..., // optional
  subject: ..., // optional
  receivedAt: ..., 
  bodyHash: ..., 
  labels: ..., // optional
  provider: ..., // optional
  parsed: ..., // optional
};

// Call the `createEmail()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createEmail(createEmailVars);
// Variables can be defined inline as well.
const { data } = await createEmail({ id: ..., gmailMessageId: ..., gmailHistoryId: ..., senderEmail: ..., senderName: ..., subject: ..., receivedAt: ..., bodyHash: ..., labels: ..., provider: ..., parsed: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createEmail(dataConnect, createEmailVars);

console.log(data.email_insert);

// Or, you can use the `Promise` API.
createEmail(createEmailVars).then((response) => {
  const data = response.data;
  console.log(data.email_insert);
});
```

### Using `CreateEmail`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createEmailRef, CreateEmailVariables } from '@dataconnect/default';

// The `CreateEmail` mutation requires an argument of type `CreateEmailVariables`:
const createEmailVars: CreateEmailVariables = {
  id: ..., 
  gmailMessageId: ..., 
  gmailHistoryId: ..., // optional
  senderEmail: ..., 
  senderName: ..., // optional
  subject: ..., // optional
  receivedAt: ..., 
  bodyHash: ..., 
  labels: ..., // optional
  provider: ..., // optional
  parsed: ..., // optional
};

// Call the `createEmailRef()` function to get a reference to the mutation.
const ref = createEmailRef(createEmailVars);
// Variables can be defined inline as well.
const ref = createEmailRef({ id: ..., gmailMessageId: ..., gmailHistoryId: ..., senderEmail: ..., senderName: ..., subject: ..., receivedAt: ..., bodyHash: ..., labels: ..., provider: ..., parsed: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createEmailRef(dataConnect, createEmailVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.email_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.email_insert);
});
```

## UpdateEmailParsed
You can execute the `UpdateEmailParsed` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
updateEmailParsed(vars: UpdateEmailParsedVariables): MutationPromise<UpdateEmailParsedData, UpdateEmailParsedVariables>;

interface UpdateEmailParsedRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateEmailParsedVariables): MutationRef<UpdateEmailParsedData, UpdateEmailParsedVariables>;
}
export const updateEmailParsedRef: UpdateEmailParsedRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateEmailParsed(dc: DataConnect, vars: UpdateEmailParsedVariables): MutationPromise<UpdateEmailParsedData, UpdateEmailParsedVariables>;

interface UpdateEmailParsedRef {
  ...
  (dc: DataConnect, vars: UpdateEmailParsedVariables): MutationRef<UpdateEmailParsedData, UpdateEmailParsedVariables>;
}
export const updateEmailParsedRef: UpdateEmailParsedRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateEmailParsedRef:
```typescript
const name = updateEmailParsedRef.operationName;
console.log(name);
```

### Variables
The `UpdateEmailParsed` mutation requires an argument of type `UpdateEmailParsedVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateEmailParsedVariables {
  id: number;
  parsed: boolean;
}
```
### Return Type
Recall that executing the `UpdateEmailParsed` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateEmailParsedData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateEmailParsedData {
  email_update?: Email_Key | null;
}
```
### Using `UpdateEmailParsed`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateEmailParsed, UpdateEmailParsedVariables } from '@dataconnect/default';

// The `UpdateEmailParsed` mutation requires an argument of type `UpdateEmailParsedVariables`:
const updateEmailParsedVars: UpdateEmailParsedVariables = {
  id: ..., 
  parsed: ..., 
};

// Call the `updateEmailParsed()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateEmailParsed(updateEmailParsedVars);
// Variables can be defined inline as well.
const { data } = await updateEmailParsed({ id: ..., parsed: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateEmailParsed(dataConnect, updateEmailParsedVars);

console.log(data.email_update);

// Or, you can use the `Promise` API.
updateEmailParsed(updateEmailParsedVars).then((response) => {
  const data = response.data;
  console.log(data.email_update);
});
```

### Using `UpdateEmailParsed`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateEmailParsedRef, UpdateEmailParsedVariables } from '@dataconnect/default';

// The `UpdateEmailParsed` mutation requires an argument of type `UpdateEmailParsedVariables`:
const updateEmailParsedVars: UpdateEmailParsedVariables = {
  id: ..., 
  parsed: ..., 
};

// Call the `updateEmailParsedRef()` function to get a reference to the mutation.
const ref = updateEmailParsedRef(updateEmailParsedVars);
// Variables can be defined inline as well.
const ref = updateEmailParsedRef({ id: ..., parsed: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateEmailParsedRef(dataConnect, updateEmailParsedVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.email_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.email_update);
});
```

## CreateMerchant
You can execute the `CreateMerchant` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
createMerchant(vars: CreateMerchantVariables): MutationPromise<CreateMerchantData, CreateMerchantVariables>;

interface CreateMerchantRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMerchantVariables): MutationRef<CreateMerchantData, CreateMerchantVariables>;
}
export const createMerchantRef: CreateMerchantRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createMerchant(dc: DataConnect, vars: CreateMerchantVariables): MutationPromise<CreateMerchantData, CreateMerchantVariables>;

interface CreateMerchantRef {
  ...
  (dc: DataConnect, vars: CreateMerchantVariables): MutationRef<CreateMerchantData, CreateMerchantVariables>;
}
export const createMerchantRef: CreateMerchantRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createMerchantRef:
```typescript
const name = createMerchantRef.operationName;
console.log(name);
```

### Variables
The `CreateMerchant` mutation requires an argument of type `CreateMerchantVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateMerchantVariables {
  id: number;
  name: string;
  normalizedName: string;
  categoryId?: number | null;
}
```
### Return Type
Recall that executing the `CreateMerchant` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateMerchantData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateMerchantData {
  merchant_insert: Merchant_Key;
}
```
### Using `CreateMerchant`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createMerchant, CreateMerchantVariables } from '@dataconnect/default';

// The `CreateMerchant` mutation requires an argument of type `CreateMerchantVariables`:
const createMerchantVars: CreateMerchantVariables = {
  id: ..., 
  name: ..., 
  normalizedName: ..., 
  categoryId: ..., // optional
};

// Call the `createMerchant()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createMerchant(createMerchantVars);
// Variables can be defined inline as well.
const { data } = await createMerchant({ id: ..., name: ..., normalizedName: ..., categoryId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createMerchant(dataConnect, createMerchantVars);

console.log(data.merchant_insert);

// Or, you can use the `Promise` API.
createMerchant(createMerchantVars).then((response) => {
  const data = response.data;
  console.log(data.merchant_insert);
});
```

### Using `CreateMerchant`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createMerchantRef, CreateMerchantVariables } from '@dataconnect/default';

// The `CreateMerchant` mutation requires an argument of type `CreateMerchantVariables`:
const createMerchantVars: CreateMerchantVariables = {
  id: ..., 
  name: ..., 
  normalizedName: ..., 
  categoryId: ..., // optional
};

// Call the `createMerchantRef()` function to get a reference to the mutation.
const ref = createMerchantRef(createMerchantVars);
// Variables can be defined inline as well.
const ref = createMerchantRef({ id: ..., name: ..., normalizedName: ..., categoryId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createMerchantRef(dataConnect, createMerchantVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.merchant_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.merchant_insert);
});
```

## CreateTransaction
You can execute the `CreateTransaction` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
createTransaction(vars: CreateTransactionVariables): MutationPromise<CreateTransactionData, CreateTransactionVariables>;

interface CreateTransactionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateTransactionVariables): MutationRef<CreateTransactionData, CreateTransactionVariables>;
}
export const createTransactionRef: CreateTransactionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createTransaction(dc: DataConnect, vars: CreateTransactionVariables): MutationPromise<CreateTransactionData, CreateTransactionVariables>;

interface CreateTransactionRef {
  ...
  (dc: DataConnect, vars: CreateTransactionVariables): MutationRef<CreateTransactionData, CreateTransactionVariables>;
}
export const createTransactionRef: CreateTransactionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createTransactionRef:
```typescript
const name = createTransactionRef.operationName;
console.log(name);
```

### Variables
The `CreateTransaction` mutation requires an argument of type `CreateTransactionVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateTransactionVariables {
  id: number;
  emailId: number;
  merchantId?: number | null;
  txnType: TxnType;
  channel: ChannelType;
  amount: number;
  currency?: string | null;
  merchantName?: string | null;
  merchantRaw?: string | null;
  txnDate: DateString;
  txnTimestamp?: TimestampString | null;
  cardLast4?: string | null;
  accountLast4?: string | null;
  provider: string;
  referenceNumber?: string | null;
  description?: string | null;
  notes?: string | null;
  idempotencyKey: string;
}
```
### Return Type
Recall that executing the `CreateTransaction` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateTransactionData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateTransactionData {
  transaction_insert: Transaction_Key;
}
```
### Using `CreateTransaction`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createTransaction, CreateTransactionVariables } from '@dataconnect/default';

// The `CreateTransaction` mutation requires an argument of type `CreateTransactionVariables`:
const createTransactionVars: CreateTransactionVariables = {
  id: ..., 
  emailId: ..., 
  merchantId: ..., // optional
  txnType: ..., 
  channel: ..., 
  amount: ..., 
  currency: ..., // optional
  merchantName: ..., // optional
  merchantRaw: ..., // optional
  txnDate: ..., 
  txnTimestamp: ..., // optional
  cardLast4: ..., // optional
  accountLast4: ..., // optional
  provider: ..., 
  referenceNumber: ..., // optional
  description: ..., // optional
  notes: ..., // optional
  idempotencyKey: ..., 
};

// Call the `createTransaction()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createTransaction(createTransactionVars);
// Variables can be defined inline as well.
const { data } = await createTransaction({ id: ..., emailId: ..., merchantId: ..., txnType: ..., channel: ..., amount: ..., currency: ..., merchantName: ..., merchantRaw: ..., txnDate: ..., txnTimestamp: ..., cardLast4: ..., accountLast4: ..., provider: ..., referenceNumber: ..., description: ..., notes: ..., idempotencyKey: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createTransaction(dataConnect, createTransactionVars);

console.log(data.transaction_insert);

// Or, you can use the `Promise` API.
createTransaction(createTransactionVars).then((response) => {
  const data = response.data;
  console.log(data.transaction_insert);
});
```

### Using `CreateTransaction`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createTransactionRef, CreateTransactionVariables } from '@dataconnect/default';

// The `CreateTransaction` mutation requires an argument of type `CreateTransactionVariables`:
const createTransactionVars: CreateTransactionVariables = {
  id: ..., 
  emailId: ..., 
  merchantId: ..., // optional
  txnType: ..., 
  channel: ..., 
  amount: ..., 
  currency: ..., // optional
  merchantName: ..., // optional
  merchantRaw: ..., // optional
  txnDate: ..., 
  txnTimestamp: ..., // optional
  cardLast4: ..., // optional
  accountLast4: ..., // optional
  provider: ..., 
  referenceNumber: ..., // optional
  description: ..., // optional
  notes: ..., // optional
  idempotencyKey: ..., 
};

// Call the `createTransactionRef()` function to get a reference to the mutation.
const ref = createTransactionRef(createTransactionVars);
// Variables can be defined inline as well.
const ref = createTransactionRef({ id: ..., emailId: ..., merchantId: ..., txnType: ..., channel: ..., amount: ..., currency: ..., merchantName: ..., merchantRaw: ..., txnDate: ..., txnTimestamp: ..., cardLast4: ..., accountLast4: ..., provider: ..., referenceNumber: ..., description: ..., notes: ..., idempotencyKey: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createTransactionRef(dataConnect, createTransactionVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.transaction_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.transaction_insert);
});
```

## UpdateTransactionMerchant
You can execute the `UpdateTransactionMerchant` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
updateTransactionMerchant(vars: UpdateTransactionMerchantVariables): MutationPromise<UpdateTransactionMerchantData, UpdateTransactionMerchantVariables>;

interface UpdateTransactionMerchantRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateTransactionMerchantVariables): MutationRef<UpdateTransactionMerchantData, UpdateTransactionMerchantVariables>;
}
export const updateTransactionMerchantRef: UpdateTransactionMerchantRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateTransactionMerchant(dc: DataConnect, vars: UpdateTransactionMerchantVariables): MutationPromise<UpdateTransactionMerchantData, UpdateTransactionMerchantVariables>;

interface UpdateTransactionMerchantRef {
  ...
  (dc: DataConnect, vars: UpdateTransactionMerchantVariables): MutationRef<UpdateTransactionMerchantData, UpdateTransactionMerchantVariables>;
}
export const updateTransactionMerchantRef: UpdateTransactionMerchantRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateTransactionMerchantRef:
```typescript
const name = updateTransactionMerchantRef.operationName;
console.log(name);
```

### Variables
The `UpdateTransactionMerchant` mutation requires an argument of type `UpdateTransactionMerchantVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateTransactionMerchantVariables {
  id: number;
  merchantId: number;
}
```
### Return Type
Recall that executing the `UpdateTransactionMerchant` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateTransactionMerchantData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateTransactionMerchantData {
  transaction_update?: Transaction_Key | null;
}
```
### Using `UpdateTransactionMerchant`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateTransactionMerchant, UpdateTransactionMerchantVariables } from '@dataconnect/default';

// The `UpdateTransactionMerchant` mutation requires an argument of type `UpdateTransactionMerchantVariables`:
const updateTransactionMerchantVars: UpdateTransactionMerchantVariables = {
  id: ..., 
  merchantId: ..., 
};

// Call the `updateTransactionMerchant()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateTransactionMerchant(updateTransactionMerchantVars);
// Variables can be defined inline as well.
const { data } = await updateTransactionMerchant({ id: ..., merchantId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateTransactionMerchant(dataConnect, updateTransactionMerchantVars);

console.log(data.transaction_update);

// Or, you can use the `Promise` API.
updateTransactionMerchant(updateTransactionMerchantVars).then((response) => {
  const data = response.data;
  console.log(data.transaction_update);
});
```

### Using `UpdateTransactionMerchant`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateTransactionMerchantRef, UpdateTransactionMerchantVariables } from '@dataconnect/default';

// The `UpdateTransactionMerchant` mutation requires an argument of type `UpdateTransactionMerchantVariables`:
const updateTransactionMerchantVars: UpdateTransactionMerchantVariables = {
  id: ..., 
  merchantId: ..., 
};

// Call the `updateTransactionMerchantRef()` function to get a reference to the mutation.
const ref = updateTransactionMerchantRef(updateTransactionMerchantVars);
// Variables can be defined inline as well.
const ref = updateTransactionMerchantRef({ id: ..., merchantId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateTransactionMerchantRef(dataConnect, updateTransactionMerchantVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.transaction_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.transaction_update);
});
```

## UpdateTransactionNotes
You can execute the `UpdateTransactionNotes` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
updateTransactionNotes(vars: UpdateTransactionNotesVariables): MutationPromise<UpdateTransactionNotesData, UpdateTransactionNotesVariables>;

interface UpdateTransactionNotesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateTransactionNotesVariables): MutationRef<UpdateTransactionNotesData, UpdateTransactionNotesVariables>;
}
export const updateTransactionNotesRef: UpdateTransactionNotesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateTransactionNotes(dc: DataConnect, vars: UpdateTransactionNotesVariables): MutationPromise<UpdateTransactionNotesData, UpdateTransactionNotesVariables>;

interface UpdateTransactionNotesRef {
  ...
  (dc: DataConnect, vars: UpdateTransactionNotesVariables): MutationRef<UpdateTransactionNotesData, UpdateTransactionNotesVariables>;
}
export const updateTransactionNotesRef: UpdateTransactionNotesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateTransactionNotesRef:
```typescript
const name = updateTransactionNotesRef.operationName;
console.log(name);
```

### Variables
The `UpdateTransactionNotes` mutation requires an argument of type `UpdateTransactionNotesVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateTransactionNotesVariables {
  id: number;
  notes: string;
}
```
### Return Type
Recall that executing the `UpdateTransactionNotes` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateTransactionNotesData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateTransactionNotesData {
  transaction_update?: Transaction_Key | null;
}
```
### Using `UpdateTransactionNotes`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateTransactionNotes, UpdateTransactionNotesVariables } from '@dataconnect/default';

// The `UpdateTransactionNotes` mutation requires an argument of type `UpdateTransactionNotesVariables`:
const updateTransactionNotesVars: UpdateTransactionNotesVariables = {
  id: ..., 
  notes: ..., 
};

// Call the `updateTransactionNotes()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateTransactionNotes(updateTransactionNotesVars);
// Variables can be defined inline as well.
const { data } = await updateTransactionNotes({ id: ..., notes: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateTransactionNotes(dataConnect, updateTransactionNotesVars);

console.log(data.transaction_update);

// Or, you can use the `Promise` API.
updateTransactionNotes(updateTransactionNotesVars).then((response) => {
  const data = response.data;
  console.log(data.transaction_update);
});
```

### Using `UpdateTransactionNotes`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateTransactionNotesRef, UpdateTransactionNotesVariables } from '@dataconnect/default';

// The `UpdateTransactionNotes` mutation requires an argument of type `UpdateTransactionNotesVariables`:
const updateTransactionNotesVars: UpdateTransactionNotesVariables = {
  id: ..., 
  notes: ..., 
};

// Call the `updateTransactionNotesRef()` function to get a reference to the mutation.
const ref = updateTransactionNotesRef(updateTransactionNotesVars);
// Variables can be defined inline as well.
const ref = updateTransactionNotesRef({ id: ..., notes: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateTransactionNotesRef(dataConnect, updateTransactionNotesVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.transaction_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.transaction_update);
});
```

## DeleteTransaction
You can execute the `DeleteTransaction` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
deleteTransaction(vars: DeleteTransactionVariables): MutationPromise<DeleteTransactionData, DeleteTransactionVariables>;

interface DeleteTransactionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteTransactionVariables): MutationRef<DeleteTransactionData, DeleteTransactionVariables>;
}
export const deleteTransactionRef: DeleteTransactionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteTransaction(dc: DataConnect, vars: DeleteTransactionVariables): MutationPromise<DeleteTransactionData, DeleteTransactionVariables>;

interface DeleteTransactionRef {
  ...
  (dc: DataConnect, vars: DeleteTransactionVariables): MutationRef<DeleteTransactionData, DeleteTransactionVariables>;
}
export const deleteTransactionRef: DeleteTransactionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteTransactionRef:
```typescript
const name = deleteTransactionRef.operationName;
console.log(name);
```

### Variables
The `DeleteTransaction` mutation requires an argument of type `DeleteTransactionVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteTransactionVariables {
  id: number;
}
```
### Return Type
Recall that executing the `DeleteTransaction` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteTransactionData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteTransactionData {
  transaction_delete?: Transaction_Key | null;
}
```
### Using `DeleteTransaction`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteTransaction, DeleteTransactionVariables } from '@dataconnect/default';

// The `DeleteTransaction` mutation requires an argument of type `DeleteTransactionVariables`:
const deleteTransactionVars: DeleteTransactionVariables = {
  id: ..., 
};

// Call the `deleteTransaction()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteTransaction(deleteTransactionVars);
// Variables can be defined inline as well.
const { data } = await deleteTransaction({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteTransaction(dataConnect, deleteTransactionVars);

console.log(data.transaction_delete);

// Or, you can use the `Promise` API.
deleteTransaction(deleteTransactionVars).then((response) => {
  const data = response.data;
  console.log(data.transaction_delete);
});
```

### Using `DeleteTransaction`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteTransactionRef, DeleteTransactionVariables } from '@dataconnect/default';

// The `DeleteTransaction` mutation requires an argument of type `DeleteTransactionVariables`:
const deleteTransactionVars: DeleteTransactionVariables = {
  id: ..., 
};

// Call the `deleteTransactionRef()` function to get a reference to the mutation.
const ref = deleteTransactionRef(deleteTransactionVars);
// Variables can be defined inline as well.
const ref = deleteTransactionRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteTransactionRef(dataConnect, deleteTransactionVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.transaction_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.transaction_delete);
});
```

## DeleteEmail
You can execute the `DeleteEmail` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
deleteEmail(vars: DeleteEmailVariables): MutationPromise<DeleteEmailData, DeleteEmailVariables>;

interface DeleteEmailRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteEmailVariables): MutationRef<DeleteEmailData, DeleteEmailVariables>;
}
export const deleteEmailRef: DeleteEmailRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteEmail(dc: DataConnect, vars: DeleteEmailVariables): MutationPromise<DeleteEmailData, DeleteEmailVariables>;

interface DeleteEmailRef {
  ...
  (dc: DataConnect, vars: DeleteEmailVariables): MutationRef<DeleteEmailData, DeleteEmailVariables>;
}
export const deleteEmailRef: DeleteEmailRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteEmailRef:
```typescript
const name = deleteEmailRef.operationName;
console.log(name);
```

### Variables
The `DeleteEmail` mutation requires an argument of type `DeleteEmailVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteEmailVariables {
  id: number;
}
```
### Return Type
Recall that executing the `DeleteEmail` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteEmailData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteEmailData {
  email_delete?: Email_Key | null;
}
```
### Using `DeleteEmail`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteEmail, DeleteEmailVariables } from '@dataconnect/default';

// The `DeleteEmail` mutation requires an argument of type `DeleteEmailVariables`:
const deleteEmailVars: DeleteEmailVariables = {
  id: ..., 
};

// Call the `deleteEmail()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteEmail(deleteEmailVars);
// Variables can be defined inline as well.
const { data } = await deleteEmail({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteEmail(dataConnect, deleteEmailVars);

console.log(data.email_delete);

// Or, you can use the `Promise` API.
deleteEmail(deleteEmailVars).then((response) => {
  const data = response.data;
  console.log(data.email_delete);
});
```

### Using `DeleteEmail`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteEmailRef, DeleteEmailVariables } from '@dataconnect/default';

// The `DeleteEmail` mutation requires an argument of type `DeleteEmailVariables`:
const deleteEmailVars: DeleteEmailVariables = {
  id: ..., 
};

// Call the `deleteEmailRef()` function to get a reference to the mutation.
const ref = deleteEmailRef(deleteEmailVars);
// Variables can be defined inline as well.
const ref = deleteEmailRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteEmailRef(dataConnect, deleteEmailVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.email_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.email_delete);
});
```

## UpdateGmailSyncState
You can execute the `UpdateGmailSyncState` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
updateGmailSyncState(vars: UpdateGmailSyncStateVariables): MutationPromise<UpdateGmailSyncStateData, UpdateGmailSyncStateVariables>;

interface UpdateGmailSyncStateRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateGmailSyncStateVariables): MutationRef<UpdateGmailSyncStateData, UpdateGmailSyncStateVariables>;
}
export const updateGmailSyncStateRef: UpdateGmailSyncStateRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateGmailSyncState(dc: DataConnect, vars: UpdateGmailSyncStateVariables): MutationPromise<UpdateGmailSyncStateData, UpdateGmailSyncStateVariables>;

interface UpdateGmailSyncStateRef {
  ...
  (dc: DataConnect, vars: UpdateGmailSyncStateVariables): MutationRef<UpdateGmailSyncStateData, UpdateGmailSyncStateVariables>;
}
export const updateGmailSyncStateRef: UpdateGmailSyncStateRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateGmailSyncStateRef:
```typescript
const name = updateGmailSyncStateRef.operationName;
console.log(name);
```

### Variables
The `UpdateGmailSyncState` mutation requires an argument of type `UpdateGmailSyncStateVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateGmailSyncStateVariables {
  lastHistoryId: number;
  lastSyncedAt: TimestampString;
  watchExpiration?: TimestampString | null;
}
```
### Return Type
Recall that executing the `UpdateGmailSyncState` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateGmailSyncStateData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateGmailSyncStateData {
  gmailSyncState_update?: GmailSyncState_Key | null;
}
```
### Using `UpdateGmailSyncState`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateGmailSyncState, UpdateGmailSyncStateVariables } from '@dataconnect/default';

// The `UpdateGmailSyncState` mutation requires an argument of type `UpdateGmailSyncStateVariables`:
const updateGmailSyncStateVars: UpdateGmailSyncStateVariables = {
  lastHistoryId: ..., 
  lastSyncedAt: ..., 
  watchExpiration: ..., // optional
};

// Call the `updateGmailSyncState()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateGmailSyncState(updateGmailSyncStateVars);
// Variables can be defined inline as well.
const { data } = await updateGmailSyncState({ lastHistoryId: ..., lastSyncedAt: ..., watchExpiration: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateGmailSyncState(dataConnect, updateGmailSyncStateVars);

console.log(data.gmailSyncState_update);

// Or, you can use the `Promise` API.
updateGmailSyncState(updateGmailSyncStateVars).then((response) => {
  const data = response.data;
  console.log(data.gmailSyncState_update);
});
```

### Using `UpdateGmailSyncState`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateGmailSyncStateRef, UpdateGmailSyncStateVariables } from '@dataconnect/default';

// The `UpdateGmailSyncState` mutation requires an argument of type `UpdateGmailSyncStateVariables`:
const updateGmailSyncStateVars: UpdateGmailSyncStateVariables = {
  lastHistoryId: ..., 
  lastSyncedAt: ..., 
  watchExpiration: ..., // optional
};

// Call the `updateGmailSyncStateRef()` function to get a reference to the mutation.
const ref = updateGmailSyncStateRef(updateGmailSyncStateVars);
// Variables can be defined inline as well.
const ref = updateGmailSyncStateRef({ lastHistoryId: ..., lastSyncedAt: ..., watchExpiration: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateGmailSyncStateRef(dataConnect, updateGmailSyncStateVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.gmailSyncState_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.gmailSyncState_update);
});
```

## DeleteMerchant
You can execute the `DeleteMerchant` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
deleteMerchant(vars: DeleteMerchantVariables): MutationPromise<DeleteMerchantData, DeleteMerchantVariables>;

interface DeleteMerchantRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteMerchantVariables): MutationRef<DeleteMerchantData, DeleteMerchantVariables>;
}
export const deleteMerchantRef: DeleteMerchantRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteMerchant(dc: DataConnect, vars: DeleteMerchantVariables): MutationPromise<DeleteMerchantData, DeleteMerchantVariables>;

interface DeleteMerchantRef {
  ...
  (dc: DataConnect, vars: DeleteMerchantVariables): MutationRef<DeleteMerchantData, DeleteMerchantVariables>;
}
export const deleteMerchantRef: DeleteMerchantRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteMerchantRef:
```typescript
const name = deleteMerchantRef.operationName;
console.log(name);
```

### Variables
The `DeleteMerchant` mutation requires an argument of type `DeleteMerchantVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteMerchantVariables {
  id: number;
}
```
### Return Type
Recall that executing the `DeleteMerchant` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteMerchantData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteMerchantData {
  merchant_delete?: Merchant_Key | null;
}
```
### Using `DeleteMerchant`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteMerchant, DeleteMerchantVariables } from '@dataconnect/default';

// The `DeleteMerchant` mutation requires an argument of type `DeleteMerchantVariables`:
const deleteMerchantVars: DeleteMerchantVariables = {
  id: ..., 
};

// Call the `deleteMerchant()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteMerchant(deleteMerchantVars);
// Variables can be defined inline as well.
const { data } = await deleteMerchant({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteMerchant(dataConnect, deleteMerchantVars);

console.log(data.merchant_delete);

// Or, you can use the `Promise` API.
deleteMerchant(deleteMerchantVars).then((response) => {
  const data = response.data;
  console.log(data.merchant_delete);
});
```

### Using `DeleteMerchant`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteMerchantRef, DeleteMerchantVariables } from '@dataconnect/default';

// The `DeleteMerchant` mutation requires an argument of type `DeleteMerchantVariables`:
const deleteMerchantVars: DeleteMerchantVariables = {
  id: ..., 
};

// Call the `deleteMerchantRef()` function to get a reference to the mutation.
const ref = deleteMerchantRef(deleteMerchantVars);
// Variables can be defined inline as well.
const ref = deleteMerchantRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteMerchantRef(dataConnect, deleteMerchantVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.merchant_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.merchant_delete);
});
```

## CreateCategory
You can execute the `CreateCategory` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
createCategory(vars: CreateCategoryVariables): MutationPromise<CreateCategoryData, CreateCategoryVariables>;

interface CreateCategoryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateCategoryVariables): MutationRef<CreateCategoryData, CreateCategoryVariables>;
}
export const createCategoryRef: CreateCategoryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createCategory(dc: DataConnect, vars: CreateCategoryVariables): MutationPromise<CreateCategoryData, CreateCategoryVariables>;

interface CreateCategoryRef {
  ...
  (dc: DataConnect, vars: CreateCategoryVariables): MutationRef<CreateCategoryData, CreateCategoryVariables>;
}
export const createCategoryRef: CreateCategoryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createCategoryRef:
```typescript
const name = createCategoryRef.operationName;
console.log(name);
```

### Variables
The `CreateCategory` mutation requires an argument of type `CreateCategoryVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateCategoryVariables {
  id: number;
  name: string;
  icon: string;
  color: string;
  description?: string | null;
  isDefault?: boolean | null;
}
```
### Return Type
Recall that executing the `CreateCategory` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateCategoryData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateCategoryData {
  category_insert: Category_Key;
}
```
### Using `CreateCategory`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createCategory, CreateCategoryVariables } from '@dataconnect/default';

// The `CreateCategory` mutation requires an argument of type `CreateCategoryVariables`:
const createCategoryVars: CreateCategoryVariables = {
  id: ..., 
  name: ..., 
  icon: ..., 
  color: ..., 
  description: ..., // optional
  isDefault: ..., // optional
};

// Call the `createCategory()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createCategory(createCategoryVars);
// Variables can be defined inline as well.
const { data } = await createCategory({ id: ..., name: ..., icon: ..., color: ..., description: ..., isDefault: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createCategory(dataConnect, createCategoryVars);

console.log(data.category_insert);

// Or, you can use the `Promise` API.
createCategory(createCategoryVars).then((response) => {
  const data = response.data;
  console.log(data.category_insert);
});
```

### Using `CreateCategory`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createCategoryRef, CreateCategoryVariables } from '@dataconnect/default';

// The `CreateCategory` mutation requires an argument of type `CreateCategoryVariables`:
const createCategoryVars: CreateCategoryVariables = {
  id: ..., 
  name: ..., 
  icon: ..., 
  color: ..., 
  description: ..., // optional
  isDefault: ..., // optional
};

// Call the `createCategoryRef()` function to get a reference to the mutation.
const ref = createCategoryRef(createCategoryVars);
// Variables can be defined inline as well.
const ref = createCategoryRef({ id: ..., name: ..., icon: ..., color: ..., description: ..., isDefault: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createCategoryRef(dataConnect, createCategoryVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.category_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.category_insert);
});
```

## UpdateCategory
You can execute the `UpdateCategory` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
updateCategory(vars: UpdateCategoryVariables): MutationPromise<UpdateCategoryData, UpdateCategoryVariables>;

interface UpdateCategoryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateCategoryVariables): MutationRef<UpdateCategoryData, UpdateCategoryVariables>;
}
export const updateCategoryRef: UpdateCategoryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateCategory(dc: DataConnect, vars: UpdateCategoryVariables): MutationPromise<UpdateCategoryData, UpdateCategoryVariables>;

interface UpdateCategoryRef {
  ...
  (dc: DataConnect, vars: UpdateCategoryVariables): MutationRef<UpdateCategoryData, UpdateCategoryVariables>;
}
export const updateCategoryRef: UpdateCategoryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateCategoryRef:
```typescript
const name = updateCategoryRef.operationName;
console.log(name);
```

### Variables
The `UpdateCategory` mutation requires an argument of type `UpdateCategoryVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateCategoryVariables {
  id: number;
  name?: string | null;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
}
```
### Return Type
Recall that executing the `UpdateCategory` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateCategoryData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateCategoryData {
  category_update?: Category_Key | null;
}
```
### Using `UpdateCategory`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateCategory, UpdateCategoryVariables } from '@dataconnect/default';

// The `UpdateCategory` mutation requires an argument of type `UpdateCategoryVariables`:
const updateCategoryVars: UpdateCategoryVariables = {
  id: ..., 
  name: ..., // optional
  icon: ..., // optional
  color: ..., // optional
  description: ..., // optional
};

// Call the `updateCategory()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateCategory(updateCategoryVars);
// Variables can be defined inline as well.
const { data } = await updateCategory({ id: ..., name: ..., icon: ..., color: ..., description: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateCategory(dataConnect, updateCategoryVars);

console.log(data.category_update);

// Or, you can use the `Promise` API.
updateCategory(updateCategoryVars).then((response) => {
  const data = response.data;
  console.log(data.category_update);
});
```

### Using `UpdateCategory`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateCategoryRef, UpdateCategoryVariables } from '@dataconnect/default';

// The `UpdateCategory` mutation requires an argument of type `UpdateCategoryVariables`:
const updateCategoryVars: UpdateCategoryVariables = {
  id: ..., 
  name: ..., // optional
  icon: ..., // optional
  color: ..., // optional
  description: ..., // optional
};

// Call the `updateCategoryRef()` function to get a reference to the mutation.
const ref = updateCategoryRef(updateCategoryVars);
// Variables can be defined inline as well.
const ref = updateCategoryRef({ id: ..., name: ..., icon: ..., color: ..., description: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateCategoryRef(dataConnect, updateCategoryVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.category_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.category_update);
});
```

## DeleteCategory
You can execute the `DeleteCategory` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
deleteCategory(vars: DeleteCategoryVariables): MutationPromise<DeleteCategoryData, DeleteCategoryVariables>;

interface DeleteCategoryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteCategoryVariables): MutationRef<DeleteCategoryData, DeleteCategoryVariables>;
}
export const deleteCategoryRef: DeleteCategoryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteCategory(dc: DataConnect, vars: DeleteCategoryVariables): MutationPromise<DeleteCategoryData, DeleteCategoryVariables>;

interface DeleteCategoryRef {
  ...
  (dc: DataConnect, vars: DeleteCategoryVariables): MutationRef<DeleteCategoryData, DeleteCategoryVariables>;
}
export const deleteCategoryRef: DeleteCategoryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteCategoryRef:
```typescript
const name = deleteCategoryRef.operationName;
console.log(name);
```

### Variables
The `DeleteCategory` mutation requires an argument of type `DeleteCategoryVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteCategoryVariables {
  id: number;
}
```
### Return Type
Recall that executing the `DeleteCategory` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteCategoryData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteCategoryData {
  category_delete?: Category_Key | null;
}
```
### Using `DeleteCategory`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteCategory, DeleteCategoryVariables } from '@dataconnect/default';

// The `DeleteCategory` mutation requires an argument of type `DeleteCategoryVariables`:
const deleteCategoryVars: DeleteCategoryVariables = {
  id: ..., 
};

// Call the `deleteCategory()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteCategory(deleteCategoryVars);
// Variables can be defined inline as well.
const { data } = await deleteCategory({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteCategory(dataConnect, deleteCategoryVars);

console.log(data.category_delete);

// Or, you can use the `Promise` API.
deleteCategory(deleteCategoryVars).then((response) => {
  const data = response.data;
  console.log(data.category_delete);
});
```

### Using `DeleteCategory`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteCategoryRef, DeleteCategoryVariables } from '@dataconnect/default';

// The `DeleteCategory` mutation requires an argument of type `DeleteCategoryVariables`:
const deleteCategoryVars: DeleteCategoryVariables = {
  id: ..., 
};

// Call the `deleteCategoryRef()` function to get a reference to the mutation.
const ref = deleteCategoryRef(deleteCategoryVars);
// Variables can be defined inline as well.
const ref = deleteCategoryRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteCategoryRef(dataConnect, deleteCategoryVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.category_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.category_delete);
});
```

## UpdateMerchantCategoryId
You can execute the `UpdateMerchantCategoryId` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
updateMerchantCategoryId(vars: UpdateMerchantCategoryIdVariables): MutationPromise<UpdateMerchantCategoryIdData, UpdateMerchantCategoryIdVariables>;

interface UpdateMerchantCategoryIdRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateMerchantCategoryIdVariables): MutationRef<UpdateMerchantCategoryIdData, UpdateMerchantCategoryIdVariables>;
}
export const updateMerchantCategoryIdRef: UpdateMerchantCategoryIdRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateMerchantCategoryId(dc: DataConnect, vars: UpdateMerchantCategoryIdVariables): MutationPromise<UpdateMerchantCategoryIdData, UpdateMerchantCategoryIdVariables>;

interface UpdateMerchantCategoryIdRef {
  ...
  (dc: DataConnect, vars: UpdateMerchantCategoryIdVariables): MutationRef<UpdateMerchantCategoryIdData, UpdateMerchantCategoryIdVariables>;
}
export const updateMerchantCategoryIdRef: UpdateMerchantCategoryIdRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateMerchantCategoryIdRef:
```typescript
const name = updateMerchantCategoryIdRef.operationName;
console.log(name);
```

### Variables
The `UpdateMerchantCategoryId` mutation requires an argument of type `UpdateMerchantCategoryIdVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateMerchantCategoryIdVariables {
  id: number;
  categoryId?: number | null;
}
```
### Return Type
Recall that executing the `UpdateMerchantCategoryId` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateMerchantCategoryIdData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateMerchantCategoryIdData {
  merchant_update?: Merchant_Key | null;
}
```
### Using `UpdateMerchantCategoryId`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateMerchantCategoryId, UpdateMerchantCategoryIdVariables } from '@dataconnect/default';

// The `UpdateMerchantCategoryId` mutation requires an argument of type `UpdateMerchantCategoryIdVariables`:
const updateMerchantCategoryIdVars: UpdateMerchantCategoryIdVariables = {
  id: ..., 
  categoryId: ..., // optional
};

// Call the `updateMerchantCategoryId()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateMerchantCategoryId(updateMerchantCategoryIdVars);
// Variables can be defined inline as well.
const { data } = await updateMerchantCategoryId({ id: ..., categoryId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateMerchantCategoryId(dataConnect, updateMerchantCategoryIdVars);

console.log(data.merchant_update);

// Or, you can use the `Promise` API.
updateMerchantCategoryId(updateMerchantCategoryIdVars).then((response) => {
  const data = response.data;
  console.log(data.merchant_update);
});
```

### Using `UpdateMerchantCategoryId`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateMerchantCategoryIdRef, UpdateMerchantCategoryIdVariables } from '@dataconnect/default';

// The `UpdateMerchantCategoryId` mutation requires an argument of type `UpdateMerchantCategoryIdVariables`:
const updateMerchantCategoryIdVars: UpdateMerchantCategoryIdVariables = {
  id: ..., 
  categoryId: ..., // optional
};

// Call the `updateMerchantCategoryIdRef()` function to get a reference to the mutation.
const ref = updateMerchantCategoryIdRef(updateMerchantCategoryIdVars);
// Variables can be defined inline as well.
const ref = updateMerchantCategoryIdRef({ id: ..., categoryId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateMerchantCategoryIdRef(dataConnect, updateMerchantCategoryIdVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.merchant_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.merchant_update);
});
```

## UpdateMerchantNormalizedName
You can execute the `UpdateMerchantNormalizedName` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
updateMerchantNormalizedName(vars: UpdateMerchantNormalizedNameVariables): MutationPromise<UpdateMerchantNormalizedNameData, UpdateMerchantNormalizedNameVariables>;

interface UpdateMerchantNormalizedNameRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateMerchantNormalizedNameVariables): MutationRef<UpdateMerchantNormalizedNameData, UpdateMerchantNormalizedNameVariables>;
}
export const updateMerchantNormalizedNameRef: UpdateMerchantNormalizedNameRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateMerchantNormalizedName(dc: DataConnect, vars: UpdateMerchantNormalizedNameVariables): MutationPromise<UpdateMerchantNormalizedNameData, UpdateMerchantNormalizedNameVariables>;

interface UpdateMerchantNormalizedNameRef {
  ...
  (dc: DataConnect, vars: UpdateMerchantNormalizedNameVariables): MutationRef<UpdateMerchantNormalizedNameData, UpdateMerchantNormalizedNameVariables>;
}
export const updateMerchantNormalizedNameRef: UpdateMerchantNormalizedNameRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateMerchantNormalizedNameRef:
```typescript
const name = updateMerchantNormalizedNameRef.operationName;
console.log(name);
```

### Variables
The `UpdateMerchantNormalizedName` mutation requires an argument of type `UpdateMerchantNormalizedNameVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateMerchantNormalizedNameVariables {
  id: number;
  normalizedName: string;
}
```
### Return Type
Recall that executing the `UpdateMerchantNormalizedName` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateMerchantNormalizedNameData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateMerchantNormalizedNameData {
  merchant_update?: Merchant_Key | null;
}
```
### Using `UpdateMerchantNormalizedName`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateMerchantNormalizedName, UpdateMerchantNormalizedNameVariables } from '@dataconnect/default';

// The `UpdateMerchantNormalizedName` mutation requires an argument of type `UpdateMerchantNormalizedNameVariables`:
const updateMerchantNormalizedNameVars: UpdateMerchantNormalizedNameVariables = {
  id: ..., 
  normalizedName: ..., 
};

// Call the `updateMerchantNormalizedName()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateMerchantNormalizedName(updateMerchantNormalizedNameVars);
// Variables can be defined inline as well.
const { data } = await updateMerchantNormalizedName({ id: ..., normalizedName: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateMerchantNormalizedName(dataConnect, updateMerchantNormalizedNameVars);

console.log(data.merchant_update);

// Or, you can use the `Promise` API.
updateMerchantNormalizedName(updateMerchantNormalizedNameVars).then((response) => {
  const data = response.data;
  console.log(data.merchant_update);
});
```

### Using `UpdateMerchantNormalizedName`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateMerchantNormalizedNameRef, UpdateMerchantNormalizedNameVariables } from '@dataconnect/default';

// The `UpdateMerchantNormalizedName` mutation requires an argument of type `UpdateMerchantNormalizedNameVariables`:
const updateMerchantNormalizedNameVars: UpdateMerchantNormalizedNameVariables = {
  id: ..., 
  normalizedName: ..., 
};

// Call the `updateMerchantNormalizedNameRef()` function to get a reference to the mutation.
const ref = updateMerchantNormalizedNameRef(updateMerchantNormalizedNameVars);
// Variables can be defined inline as well.
const ref = updateMerchantNormalizedNameRef({ id: ..., normalizedName: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateMerchantNormalizedNameRef(dataConnect, updateMerchantNormalizedNameVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.merchant_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.merchant_update);
});
```

