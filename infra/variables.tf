variable "sa_key_path" {
  type = string
}
variable "project" {
  type = string
}

variable "zone" {
  type    = string
  default = "ru-central1-b"
}

variable "network_name" {
  type    = string
  default = "mynetwork"
}

variable "subnet_name" {
  type    = string
  default = "mysubnet"
}

variable "subnet_cidr" {
  type    = string
  default = "192.168.0.0/16"
}

variable "vm_name" {
  type    = string
  default = "myvm"
}

variable "service_account" {
  type    = string
  default = "itmovito-service"
}

variable "mk8s_cluster_name" {
  type    = string
  default = "itmovito-mk8s"
}

variable "mk8s_display_name" {
  type    = string
  default = "itmovito-mk8s"
}

variable "mk8s_description" {
  type    = string
  default = "Managed Kubernetes cluster for itmovito"
}

variable "mk8s_pods_cidr" {
  type    = string
  default = "10.22.0.0/18"
}

variable "mk8s_services_cidr" {
  type    = string
  default = "10.22.64.0/18"
}

variable "mk8s_release_channel" {
  type    = string
  default = "stable"
}

variable "mk8s_version" {
  type    = string
  default = "v1.34.1-mws.1"
}
