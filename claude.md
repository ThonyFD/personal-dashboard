# AI Finance Agent - Technical Specification

## 1. Overview
**Objective:** Build a serverless AI agent that listens to Gmail (including label 'financial'), extracts key data, stores it in Firebase Data Connect (Postgres), and powers a React dashboard.  
**Chosen architecture:** Gmail Push Notifications → Pub/Sub → Cloud Run (Gen2) → Data Connect → React App.  
**Time zone:** America/Panama.

---

## 2. Repository Structure
```
ai-finance-agent/
├─ infra/
│  ├─ terraform/
│  └─ gcloud/
├─ services/
│  ├─ ingestor/
│  └─ renewal/
├─ packages/sql/
├─ web/dashboard/
├─ tests/
└─ ops/
```

---

## 3. Gmail Ingestion Strategy
**Option chosen:** Gmail push notifications + Pub/Sub → Cloud Run.  
**Reason:** near-real-time, reliable, and fits in free tier.  
**Renewal:** Daily via Cloud Scheduler to comply with Gmail's 7-day watch expiration.

---

## 4. Security & Secrets
- Store OAuth credentials (client_id, client_secret, refresh_token) in Google Secret Manager.  
- Access tokens refreshed automatically.  
- Use Workload Identity to avoid long-lived keys.  
- Use Gmail readonly scope.  
- Hash email bodies to avoid storing PII.

---

## 5. Database Schema (DDL)
```sql
CREATE TABLE emails (...);
CREATE TABLE merchants (...);
CREATE TABLE transactions (...);
-- Includes enums txn_type, channel_type, indexes, and unique constraints for idempotency.
```

---

## 6. Parsing & Normalization
**Pipeline:**
1. Provider detection (by sender/subject/body).  
2. Regex extraction for vendor, amount, date, etc.  
3. Optional LLM fallback (JSON schema enforced).  
4. Normalize to America/Panama timezone, USD currency.  
5. Compute SHA256 hash for body + idempotency key.

---

## 7. React Dashboard Plan
**Pages:**
- Overview: KPIs, daily spend, top merchants.
- Transactions: Table + filters + CSV export.
- Merchants, Categories (optional).

Uses Firebase Data Connect REST/GraphQL queries.

---

## 8. Error Handling & Observability
- Pub/Sub retry for transient failures.  
- DLQ for parse/DB errors.  
- Structured logs `{event, provider, stage, duration_ms}`.  
- Alerts via Cloud Monitoring (unacked msgs, DLQ>0, error rate>1%).

---

## 9. Build Roadmap
- M1: Infra + Pub/Sub + Cloud Run health check.  
- M2: Gmail sync + email persistence.  
- M3: Parsing + transactions table.  
- M4: Idempotency + backfill tool.  
- M5: Dashboard React app + queries.  
- M6: Renewal + alerts.

---

## 10. Cost Estimate
| Component | Cost | Notes |
|------------|------|-------|
| Cloud Run, Pub/Sub, Scheduler | $0 | Free tier |
| Data Connect (Postgres) | ~$9/mo | After 3-month free trial |
| LLM Fallback | $0–$10 | Optional |
| **Total** | **≈ $10/mo** | After free tier |

---

## 11. Risks & Mitigations
| Risk | Mitigation |
|------|-------------|
| Watch expiry | Daily renewal + alert if no notifications in 6h |
| Provider format drift | Versioned regex + LLM fallback |
| Duplicates | Unique constraints + idempotency key |
| API quota | Exponential backoff |

---

## 12. Next Actions
1. Create Pub/Sub topic + subscription.  
2. Deploy Cloud Run 'ingestor' endpoint.  
3. Implement Gmail sync, parser, and DB upsert.  
4. Set up daily watch renewal via Scheduler.  
5. Build dashboard using Data Connect.
