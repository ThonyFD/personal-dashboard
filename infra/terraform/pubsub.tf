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
