---
translationKey: android-homelab-article
title: Building an Android-Based Homelab Server with Termux, Go, and Cloudflare Tunnel
description: An experiment in building a resource-efficient self-hosted server using a Samsung Galaxy J2 Prime, Termux, Go, SQLite, Nginx, and Cloudflare Tunnel.
category: Infrastructure & Self-Hosting
tags:
  - Homelab
  - Android
  - Termux
  - Linux
  - Go
  - SQLite
  - Nginx
  - Cloudflare Tunnel
  - SSH
  - Monitoring
publishedAt: 2026-11-04
draft: false
relatedProject: android-homelab
---

## Introduction

Can an old Android smartphone still be put to use as a genuinely useful server?

That question was the starting point for an experiment in building a homelab with a Samsung Galaxy J2 Prime. A device with these hardware limitations was used as a self-hosted server to run a web server, system monitoring, and services that can be reached over the internet.

Rather than using a conventional Linux server or an additional VPS, this project explores using Android as a server environment through Termux.

The goal was not merely to get services running, but to build infrastructure that is lightweight, measurable, maintainable, and has secure remote access.

## 1. Hardware and system environment

The device used:

| Component | Specification |
|---|---|
| Device | Samsung Galaxy J2 Prime SM-J250F |
| Operating System | Android 7.1.1 |
| Processor | Qualcomm Snapdragon 425 |
| CPU | 4-core ARM Cortex-A53 |
| Architecture | ARMv7, 32-bit |
| RAM | Around 1.3 GiB |
| Environment | Termux |
| Kernel | Linux 3.18.31 |

The device's limitations were a primary consideration when choosing technologies.

Excessive services, heavy runtimes, and unnecessary background processes had to be avoided.

## 2. Homelab architecture

The infrastructure is built from several components, each with a different responsibility.

### Main components

- **Termux:** provides a Linux-like environment on Android.
- **Nginx:** handles HTTP requests and serves the static website.
- **Go:** runs the monitoring API.
- **SQLite:** stores resource usage history.
- **runit:** manages the service lifecycle.
- **Cloudflare Tunnel:** provides public access without opening inbound ports on the router.
- **OpenSSH:** provides remote administrative access.

### Architecture overview

```text
                  INTERNET
                     |
                     v
             CLOUDFLARE EDGE
                     |
                     v
              CLOUDFLARE TUNNEL
                     |
                     v
          SAMSUNG GALAXY J2 PRIME
                     |
              TERMUX ENVIRONMENT
                     |
          +----------+----------+
          |          |          |
          v          v          v
        Nginx       Go       OpenSSH
        :8080     Monitor      :8022
                     |
                     v
                  SQLite
                     |
                     v
             monitor_history
```

Cloudflare Tunnel is used to connect internal services to the Cloudflare network over an outbound connection. With this approach, no router port forwarding is required for public access.

## 3. Using Go for system monitoring

One of the main challenges was building a monitoring system light enough for a device with limited RAM.

The initial implementation used the Python standard library. After evaluating resource usage and long-term needs, the monitoring was later migrated to Go.

Go was chosen because it:
- Produces a self-contained binary.
- Does not require an interpreter runtime when executed.
- Has concurrency support.
- Is well suited to building lightweight HTTP APIs.
- Can be compiled for Android on ARMv7.

The monitoring API provides several endpoints:

| Endpoint | Function |
|---|---|
| `/health` | Service health check |
| `/api/status` | System condition information |
| `/api/history` | Resource usage history |
| `/api/version` | Application version information |

The data collected includes:
- CPU usage.
- Memory usage.
- Swap usage.
- Disk usage.
- Load average.
- System uptime.
- Service status.

The API uses JSON so it is easy to consume from a web dashboard or other monitoring applications.

## 4. SQLite as history storage

To avoid depending on a heavier database server, this project uses SQLite.

Monitoring history is stored in the `monitor_history` table with this structure:

```sql
CREATE TABLE monitor_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    cpu REAL,
    ram REAL,
    swap REAL,
    disk REAL
);
```

History is collected periodically every 60 seconds.

Old data is cleaned up automatically once it passes the seven-day retention period.

This approach provides enough history to observe resource usage trends without adding excessive storage load.

## 5. Migrating monitoring from Python to Go

The migration was carried out in stages to reduce the risk of downtime.

The stages performed:

1. Implement the monitoring API in Go.
2. Keep the existing SQLite database structure.
3. Move the history writing process to Go.
4. Stop the Python monitoring service.
5. Update the Nginx configuration to forward the API to the Go port.
6. Re-check all running services.

Verification results after the migration showed:
- The Go Monitoring API responds to health checks.
- Nginx successfully forwards requests to the backend.
- SQLite history remains available.
- The four main services remain running.
- No active references to the old Python service were found in the configuration audit performed.

This migration became an important part of simplifying the infrastructure.

## 6. Service supervision with runit

Android has different characteristics from a conventional Linux server, particularly in how background processes are managed.

To keep services running, Termux Services based on runit are used.

The services managed include:
- Nginx.
- SSHD.
- Cloudflared.
- Go Monitoring API.

Termux:Boot integration is used to help start services when the device boots up.

This approach reduces the need to launch each application manually.

## 7. Remote access using Cloudflare Tunnel and SSH

Server administration is not always done from the same local network.

For remote access needs, an integration of OpenSSH with Cloudflare Tunnel and Cloudflare Access was designed.

The intended architecture:

```text
REMOTE WINDOWS / LINUX
        |
        v
 OpenSSH Client
        |
        v
   cloudflared
        |
        v
 Cloudflare Access
        |
        v
 Existing Tunnel
        |
        v
 Termux SSHD :8022
```

The advantages of this approach:
- No need to open an SSH port on the router.
- No need for a dedicated public IP.
- Access can be restricted by user identity.
- SSH authentication still uses public keys.
- The existing tunnel infrastructure can be reused.

This remote SSH configuration is treated as part of developing secure access and needs to be tested from an external network before being declared complete.

## 8. Technical challenges

Several challenges were encountered during development:

### ARM 32-bit limitations

Not all Linux binaries can be used directly in an Android ARMv7 environment.

The solution was to cross-compile using the Android ARM target:

```bash
GOOS=android \
GOARCH=arm \
GOARM=7 \
CGO_ENABLED=1 \
CC=clang \
go build -o monitor .
```

### Process management

Replacing a running binary can cause problems such as `Text file busy`.

The solution was to stop the service first, prepare the replacement binary, then swap the binary safely.

### Reverse proxy integration

Nginx has to forward requests to the correct backend. Choosing the wrong virtual host or upstream port can result in HTTP 502.

Validation was done by testing directly against the backend and through Nginx.

### Resource efficiency

With limited RAM and storage, technology choices and data collection frequency had to be matched to the device's capabilities.

## 9. Results and lessons learned

This project shows that an old Android device can be used as a self-hosted platform for certain needs.

Several results have been verified:
- Nginx runs as a web server.
- The Go Monitoring API runs on ARMv7.
- SQLite stores monitoring history.
- runit manages the main services.
- Cloudflare Tunnel provides a public access path.
- Python monitoring was successfully migrated to Go without losing the database history.

The most important thing is not simply succeeding at running a server on an old device, but the process of understanding system limitations, optimising resources, managing services, and building maintainable architecture.

## 10. Next development

Several development plans:

- Refine the monitoring dashboard.
- Develop resource condition notifications.
- Refine remote SSH with Cloudflare Access.
- Add automatic database backups.
- Integrate CI/CD for web applications.
- Develop documentation and observability.
- Optimise RAM and storage consumption.

## Closing

This homelab is a real experiment in combining software engineering and infrastructure engineering.

By making use of hardware that was already available, the project became a means of learning about the Linux environment, backend development, networking, databases, service management, security, and deployment.

The project also shows that good engineering solutions do not always require expensive hardware. Choosing the right architecture and understanding system limitations are often far more important.

---

**Technologies:** Android · Termux · Go · SQLite · Nginx · runit · Cloudflare Tunnel · OpenSSH · Linux ARMv7
