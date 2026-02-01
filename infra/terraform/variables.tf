variable "project_id" {
  description = "The Google Cloud Project ID"
  type        = string
}

variable "region" {
  description = "The Google Cloud region"
  type        = string
  default     = "us-central1"
}

variable "ingestor_url" {
  description = "The URL of the Ingestor Cloud Run service"
  type        = string
}

variable "renewal_url" {
  description = "The URL of the Renewal Cloud Run service"
  type        = string
}
