---
translationKey: android-homelab
title: Android-Based Self-Hosted Homelab
subtitle: Repurposing an Android smartphone as a lightweight self-hosted server
summary: Building a lightweight self-hosted infrastructure using an old Android smartphone, Termux, Go, SQLite, Nginx, and Cloudflare Tunnel.
category: Infrastructure Engineering
focus: Infrastructure & Self-Hosting
status: In Progress
order: 3
stack:
  - Android
  - Termux
  - Go
  - SQLite
  - Nginx
  - runit
  - Cloudflare Tunnel
  - OpenSSH
  - Linux ARMv7
tags:
  - Homelab
  - Self-Hosting
  - Android
  - Termux
  - Go
  - Infrastructure
docsPending: false
overview: An experimental self-hosted infrastructure project that transforms a Samsung Galaxy J2 Prime into a lightweight server using Termux. The system provides web serving, resource monitoring, persistent metrics storage, service supervision, and secure remote access architecture.
areas:
  - Android 7.1.1 running Termux.
  - Go Monitoring API listening on localhost.
  - SQLite for historical system metrics.
  - Nginx as web server and reverse proxy.
  - runit for service supervision.
  - Cloudflare Tunnel for external access.
  - OpenSSH for server administration.
objectives:
  - Repurpose legacy Android hardware as a self-hosted server.
  - Build a lightweight monitoring API using Go.
  - Store system metrics using SQLite.
  - Serve web applications through Nginx.
  - Supervise background services using runit.
  - Provide public access through Cloudflare Tunnel.
  - Develop secure remote SSH access without exposing inbound SSH ports.
process: Migrated the monitoring implementation from Python to Go, cross-compiled Go binaries for Android ARMv7, preserved the existing SQLite monitoring history during migration, implemented periodic metric collection and retention, configured Nginx as a reverse proxy for the monitoring API, integrated service startup with Termux Services and Termux:Boot, and designed remote SSH access using Cloudflare Access and Tunnel.
results: The Go monitoring service successfully runs on the ARMv7 Android device, Nginx serves and proxies requests, and SQLite retains historical monitoring data.
outcomes: The infrastructure provides a practical foundation for further self-hosted application deployments.
---

## Future Improvements

- Complete external SSH access verification.
- Add automated database backups.
- Improve dashboard visualization.
- Add resource threshold notifications.
- Integrate automated deployment workflows.

## Related Article

Read the technical implementation: [Building an Android-Based Homelab Server with Termux, Go, and Cloudflare Tunnel](/en/blog/building-android-homelab-server-termux-go-cloudflare/)
