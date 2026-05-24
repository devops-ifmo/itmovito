resource "mws_vpc_network" "network" {
  network = var.network_name
}

resource "mws_vpc_subnet" "subnet" {
  subnet  = var.subnet_name
  network = mws_vpc_network.network.network
  cidr    = var.subnet_cidr
}

data "mws_compute_image" "image" {
  image   = "mws-ubuntu-2204-lts-v20250529"
  project = "mws-ubuntu"
}

resource "mws_vpc_address" "vm_primary_network_interface_address" {
  network = mws_vpc_network.network.network
  subnet  = mws_vpc_subnet.subnet.metadata.id
  address = "vm-address"
}

resource "mws_vpc_external_address" "vm_external_address" {
  external_address = "vm-external-address"
}

resource "mws_vpc_address" "mk8s_primary_endpoint_address" {
  network = mws_vpc_network.network.network
  subnet  = mws_vpc_subnet.subnet.metadata.id
  address = "${var.mk8s_cluster_name}-primary-endpoint"
}

resource "mws_vpc_external_address" "mk8s_public_endpoint_address" {
  external_address = "${var.mk8s_cluster_name}-public-endpoint"
}

resource "mws_compute_disk" "disk" {
  disk      = "mydisk"
  disk_type = "diskTypes/nbs-pl2"
  iops      = 1000
  size      = "10GB"

  source = {
    image = data.mws_compute_image.image.metadata.id
  }
}

resource "mws_compute_virtual_machine" "vm" {
  virtual_machine = var.vm_name
  vm_type         = "vmTypes/gen-2-4"

  hardware = {
    power = "ON"
  }

  os = {
    hostname     = "ubuntu"
    local_domain = "local"

    metadata = {
      attributes = {
        user-data = templatefile("./cloud-init.yaml", {})
      }
    }
  }

  storage = {
    disks = [
      {
        name = "boot"
        boot = true
        disk = {
          ref = mws_compute_disk.disk.metadata.id
        }
      }
    ]
  }

  network = {
    network_interfaces = [
      {
        name    = "primary"
        primary = true

        addresses = [
          {
            address = {
              ref = mws_vpc_address.vm_primary_network_interface_address.metadata.id
            }

            one_to_one_nat = {
              external = {
                address = {
                  ref = mws_vpc_external_address.vm_external_address.metadata.id
                }
              }
            }
          }
        ]
      }
    ]
  }
}

resource "mws_vpc_firewall_rule" "firewall_rule" {
  firewall_rule = "allow-ssh"
  network       = mws_vpc_network.network.network

  priority  = 1000
  direction = "INGRESS"
  action    = "ALLOW"

  source = {
    spec = {
      cidrs = ["0.0.0.0/0"]
    }
  }

  destination = {
    spec = {
      cidrs = [
        "${mws_vpc_address.vm_primary_network_interface_address.status.ip_address}/32",
        "${mws_vpc_address.mk8s_primary_endpoint_address.status.ip_address}/32"
      ]
    }
  }

  proto_ports = ["TCP:22", "TCP:80", "TCP:3000", "TCP:6443"]
  active      = true
}

resource "mws_mk8s_cluster" "cluster" {
  availability = {
    standalone = {
      zone = var.zone
    }
  }

  cluster_name = var.mk8s_cluster_name

  metadata = {
    description  = var.mk8s_description
    display_name = var.mk8s_display_name
  }

  network = {
    pods_cidr     = var.mk8s_pods_cidr
    services_cidr = var.mk8s_services_cidr

    primary_endpoint = {
      ref = mws_vpc_address.mk8s_primary_endpoint_address.metadata.id
    }

    public_endpoint = {
      ref = mws_vpc_external_address.mk8s_public_endpoint_address.metadata.id
    }
  }

  version_control = {
    release_channel = var.mk8s_release_channel
    version         = var.mk8s_version
  }
}
