# Service Account for the Finance Agent
resource "google_service_account" "finance_agent_sa" {
  account_id   = "finance-agent-sa"
  display_name = "Finance Agent Service Account"
}

# Pub/Sub Service Account (Google Managed)
data "google_project" "project" {
}

locals {
  pubsub_sa_email = "service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# Grant Pub/Sub SA permission to publish to DLQ
resource "google_pubsub_topic_iam_member" "dlq_publisher" {
  topic  = google_pubsub_topic.gmail_dlq.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${local.pubsub_sa_email}"
}

resource "google_pubsub_subscription_iam_member" "dlq_subscriber" {
  subscription = google_pubsub_subscription.gmail_ingestor_sub.name
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:${local.pubsub_sa_email}"
}
