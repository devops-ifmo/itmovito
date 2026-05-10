terraform {
  required_providers {
    mws = {
      source = "mws-cloud/mws"
    }
  }
  required_version = ">= 1.11"
}

provider "mws" {
  service_account_authorized_key_path = var.sa_key_path
  project = var.project
  zone = var.zone
}
