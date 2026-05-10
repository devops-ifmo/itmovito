variable "sa_key_path" {
  type = string
}
variable "project" {
  type = string
}

variable "zone" {
  type = string
  default = "ru-central1-b"
}

variable "network_name" {
  type = string
  default = "mynetwork"
}

variable "subnet_name" {
  type = string
  default = "mysubnet"
}

variable "subnet_cidr" {
  type = string
  default = "192.168.0.0/16"
}

variable "vm_name" {
  type = string
  default = "myvm"
}

variable "service_account" {
  type = string
  default = "itmovito-service"
}