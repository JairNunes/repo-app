variable "kubeconfig_path" {
  description = "Path to the kubeconfig file"
  type        = string
  default     = "~/.kube/config"
}

variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
  default     = "auto-repair-shop"
}

variable "app_image" {
  description = "Docker image for the application"
  type        = string
  default     = "auto-repair-shop-api:latest"
}

variable "db_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
  default     = "postgres"
}

variable "jwt_secret" {
  description = "JWT secret key"
  type        = string
  sensitive   = true
  default     = "8f3b2a1c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a"
}

variable "app_replicas" {
  description = "Number of application replicas"
  type        = number
  default     = 2
}
