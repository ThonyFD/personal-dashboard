resource "google_pubsub_topic" "gmail_notifications" {
  name = "gmail-notifications"
}

resource "google_pubsub_topic" "gmail_dlq" {
  name = "gmail-notifications-dlq"
}

resource "google_pubsub_subscription" "gmail_dlq_sub" {
  name  = "gmail-dlq-sub"
  topic = google_pubsub_topic.gmail_dlq.name
}

resource "google_pubsub_subscription" "gmail_ingestor_sub" {
  name  = "gmail-ingestor-sub"
  topic = google_pubsub_topic.gmail_notifications.name

  push_config {
    push_endpoint = "${var.ingestor_url}/pubsub"
  }

  ack_deadline_seconds = 60

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.gmail_dlq.id
    max_delivery_attempts = 5
  }
}
