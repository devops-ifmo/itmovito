resource "mws_vpc_network" "network" {
  network = var.network_name
}

resource "mws_vpc_subnet" "subnet" {
  subnet  = var.subnet_name
  network = mws_vpc_network.network.network
  cidr    = var.subnet_cidr
}

resource "mws_vpc_egress_nat" "egress_nat" {
  egress_nat = "${var.mk8s_cluster_name}-egress-nat"
  network    = mws_vpc_network.network.network

  metadata = {
    description  = "Egress NAT for Managed Kubernetes nodes"
    display_name = "${var.mk8s_cluster_name}-egress-nat"
  }

  external = {
    addresses = [
      {
        spec = {}
      }
    ]
  }

  internal = {
    subnets = [mws_vpc_subnet.subnet.metadata.id]
  }
}

resource "mws_vpc_address" "mk8s_primary_endpoint_address" {
  network = mws_vpc_network.network.network
  subnet  = mws_vpc_subnet.subnet.metadata.id
  address = "${var.mk8s_cluster_name}-primary-endpoint"
}

resource "mws_vpc_external_address" "mk8s_public_endpoint_address" {
  external_address = "${var.mk8s_cluster_name}-public-endpoint"
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
        "${mws_vpc_address.mk8s_primary_endpoint_address.status.ip_address}/32"
      ]
    }
  }

  proto_ports = ["TCP:6443"]
  active      = true
}

resource "mws_vpc_firewall_rule" "frontend_load_balancer" {
  firewall_rule = "allow-frontend-load-balancer"
  network       = mws_vpc_network.network.network

  priority  = 1001
  direction = "INGRESS"
  action    = "ALLOW"

  source = {
    spec = {
      cidrs = ["0.0.0.0/0"]
    }
  }

  destination = {
    spec = {
      cidrs = [var.subnet_cidr]
    }
  }

  proto_ports = ["TCP:30080"]
  active      = true
}

resource "mws_vpc_firewall_rule" "argocd_load_balancer" {
  firewall_rule = "allow-argocd-load-balancer"
  network       = mws_vpc_network.network.network

  priority  = 1002
  direction = "INGRESS"
  action    = "ALLOW"

  source = {
    spec = {
      cidrs = ["0.0.0.0/0"]
    }
  }

  destination = {
    spec = {
      cidrs = [var.subnet_cidr]
    }
  }

  proto_ports = ["TCP:30443"]
  active      = true
}

resource "mws_vpc_firewall_rule" "grafana_load_balancer" {
  firewall_rule = "allow-grafana-load-balancer"
  network       = mws_vpc_network.network.network

  priority  = 1003
  direction = "INGRESS"
  action    = "ALLOW"

  source = {
    spec = {
      cidrs = ["0.0.0.0/0"]
    }
  }

  destination = {
    spec = {
      cidrs = [var.subnet_cidr]
    }
  }

  proto_ports = ["TCP:30280"]
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

resource "mws_mk8s_node_group" "node_group" {
  cluster_name    = mws_mk8s_cluster.cluster.cluster_name
  node_group_name = var.mk8s_node_group_name

  service_account = {
    ref = "projects/${var.project}/serviceAccounts/${var.service_account}"
  }

  subnet = {
    ref = mws_vpc_subnet.subnet.metadata.id
  }

  vm_type = {
    ref = "compute/vmTypes/${var.mk8s_node_vm_type}"
  }

  scale = {
    autoscaling = {
      min = var.mk8s_node_min_count
      max = var.mk8s_node_max_count
    }
  }

  rollout_strategy = {
    max_surge       = 1
    max_unavailable = 0
  }

  version_control = {
    auto_update = true
    version     = var.mk8s_version

    maintenance_window = {
      weekly = {
        days     = ["MONDAY"]
        hour     = 1
        duration = "4h"
      }
    }
  }

  image_storage_iops = 10000
  image_storage_size = var.mk8s_node_image_storage_size
  taints             = []
  zone               = var.zone
}
