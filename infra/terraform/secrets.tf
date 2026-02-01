resource "google_secret_manager_secret" "gmail_oauth_client_id" {
  secret_id = "gmail-oauth-client-id"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "gmail_oauth_client_secret" {
  secret_id = "gmail-oauth-client-secret"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "gmail_oauth_refresh_token" {
  secret_id = "gmail-oauth-refresh-token"
  replication {
    auto {}
  }
}
