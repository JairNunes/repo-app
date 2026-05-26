output "namespace" {
  description = "Kubernetes namespace"
  value       = kubernetes_namespace.app.metadata[0].name
}

output "api_service_name" {
  description = "API service name"
  value       = kubernetes_service.app.metadata[0].name
}

output "postgres_service_name" {
  description = "PostgreSQL service name"
  value       = kubernetes_service.postgres.metadata[0].name
}
