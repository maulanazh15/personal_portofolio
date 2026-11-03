---
translationKey: arduino-lighting-article
title: Installing a Scheduled Automatic Lighting System with Arduino
description: A practical note on building an automated lighting system with an Arduino Uno, an RTC DS1302 module, and relay modules—covering the initial problem, hardware preparation, programming, and the challenges that came up.
category: Technology / IoT
tags:
  - Arduino
  - IoT
  - Automation
  - PlatformIO
publishedAt: 2026-11-01
relatedProject: arduino-lighting
---

Outdoor lights usually get switched on and off by hand every day. That routine
is easy to skip, especially when other work takes priority. The question that
started this project was simple: can lighting control be handed over to a
schedule?

This note summarises the process of building a scheduled lighting system with
an Arduino Uno and an RTC DS1302 module, from preparation through testing.

## The problem

Outdoor lighting needs to be controlled regularly. While it stays manual, that
consistency depends on the owner remembering and having the time. The goal was
not a complicated system, just enough automation to make the on/off schedule
run more reliably.

## Hardware

The system is built from parts that are relatively easy to find:

- An Arduino Uno as the main controller.
- An RTC DS1302 module as the real-time clock source.
- Relay modules to connect and disconnect power to the lights.
- Two outdoor lights as the controlled load.

The program was developed in C++ using PlatformIO.

## How it works

The RTC module keeps track of time. The program reads that time and compares it
with a configured schedule. When the current time falls inside the scheduled
window, the relay is activated and the light turns on. Outside that window, the
relay is switched off again.

With this pattern, the decision to turn the lights on and off no longer depends
on a manual action but on time data the program reads periodically.

## Development process

Work started by designing the program flow and assembling the hardware
components for initial testing. The circuit and the program were tested at a
small scale before being connected to the real load.

Once the circuit and program behaved as expected, the system was deployed to
control two outdoor lights automatically.

## The challenge: keeping time aligned

The part that demanded the most attention was not the relay wiring but
synchronising the RTC module with the actual time. A time offset meant the
lights did not switch on and off at the intended schedule.

Resolving it required additional testing and adjustments to the program. Those
iterations are what eventually made the schedule behave as planned.

## Result

The time-based lighting automation system was implemented successfully and is
used to control two outdoor lights. The code and project notes are available in
a public repository.

## What I took away

This small project showed that automation does not always require a large
system. One clock module, a few relays, and a clear program are enough to
replace a repetitive daily routine—as long as the hardest part, time accuracy,
is actually tested.
