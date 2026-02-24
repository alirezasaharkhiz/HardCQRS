# 🤖 Megatron & Cybertron

## Overview

Megatron and Cybertron together form a distributed, event-driven Hard
CQRS data pipeline powered by Debezium and Kafka.

The system captures MySQL database changes in real-time, streams them
through Kafka, transforms relational data into document models using
NestJS, and materializes optimized read models inside MongoDB.

------------------------------------------------------------------------

# ⚡ Cybertron -- Infrastructure Orchestration Layer

Cybertron is responsible for bootstrapping and managing the
infrastructure stack.

## Responsibilities

-   Provision Kafka brokers and topics
-   Configure Debezium MySQL CDC connectors
-   Manage MongoDB connections
-   Control topic routing and transformation rules
-   Bootstrap infrastructure via `allspark.sh`

## What It Does

1.  Captures MySQL binlog changes via Debezium
2.  Publishes change events into Kafka topics
3.  Manages topic-to-collection mapping configuration
4.  Controls how transformed data is written into MongoDB

Cybertron acts as the infrastructure brain of the ecosystem.

------------------------------------------------------------------------

# 🤖 Megatron -- CQRS Transformation Engine

Megatron is a NestJS-based high-performance transformation engine
implementing a Hard CQRS architecture.

## Responsibilities

1.  Subscribes to configured Kafka topics
2.  Listens to Debezium-emitted MySQL change events
3.  Transforms relational data into document-based models
4.  Publishes processed events back to Kafka
5.  Updates MongoDB collections according to Cybertron configuration

------------------------------------------------------------------------

# 🏗️ Architecture Flow

MySQL\
↓\
Debezium (CDC)\
↓\
Kafka (Raw Change Events)\
↓\
Megatron (NestJS Transformer)\
↓\
Kafka (Processed Events)\
↓\
MongoDB (Read Model)

------------------------------------------------------------------------

# 🧠 Architectural Principles

-   Hard CQRS (separate write and read models)
-   Event-driven architecture
-   Near real-time data synchronization
-   Config-driven transformation rules
-   Infrastructure as code via allspark.sh
-   Idempotent event processing

------------------------------------------------------------------------

# 🚀 Key Technologies

-   MySQL (Write Model / Source of Truth)
-   MongoDB (Read Model / Projection Store)
-   Apache Kafka (Event Streaming Backbone)
-   Debezium (Change Data Capture)
-   NestJS (Transformation Microservice Engine)

------------------------------------------------------------------------

# 🔥 Key Features

-   Reliable CDC using Debezium
-   Distributed event streaming with Kafka
-   Relational-to-document transformation pipeline
-   Configurable data routing
-   Automated infrastructure bootstrapping
-   Scalable microservice-based architecture

------------------------------------------------------------------------

# 🧩 Summary

Megatron and Cybertron together provide a production-grade, distributed
Hard CQRS system that transforms relational database changes into
optimized document projections in near real-time using an event-driven
pipeline.
