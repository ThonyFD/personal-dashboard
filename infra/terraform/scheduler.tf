resource "google_cloud_scheduler_job" "gmail_watch_renewal" {
  name             = "gmail-watch-renewal"
  description      = "Renews Gmail watch every day"
  schedule         = "0 0 * * *"
  time_zone        = "America/Panama"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = "${var.renewal_url}/renew"
    
    oidc_token {
      service_account_email = "finance-agent-sa@${var.project_id}.iam.gserviceaccount.com"
    }
  }
}
