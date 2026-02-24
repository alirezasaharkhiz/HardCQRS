# Megatron Data Transformation Service – NestJS ☕️

A NestJS-based data pipeline that consumes Kafka CDC (Debezium/MySQL), **orchestrates data actions** in Use Cases (as *Data Action Containers*), and emits transformed records.

> **Boot & Orchestration:** This service is started by **Cybertron** (`AllSpark.sh`). Run and manage the whole stack from **Cybertron**.

---

## Architecture Overview

```
Kafka Topics ⟺ Use Cases (Data Action Containers) ⟺ Applications (small, separated application concerns) ⟺ Repositories
```

### Layer Responsibilities

- **Kafka Layer** – Consume/produce events; map topics to handlers (UseCases).
- **Use Cases (Data Action Containers)** – Orchestrate the event data flow (parse input, react to Debezium ops `u|c|d|r`, uses Applications, Use Cases must never call repositories directly. Use Cases → Application layer only; no direct repository access , emit/tombstone, push back transformed data to kafka using proper topic or topics).
- **Applications** – Domain/application logic and deterministic transformations (pure & testable).
- **Repositories** – Data access (e.g., MySQL reads).

> **Why this split?** Keep handlers thin & idempotent for event processing; keep logic in Applications for easy testing and reuse.

---

## Project Structure

```
src/
├─ app.module.ts
├─ main.ts
├─ database/
│  └─ database.mysql.module.ts
├─ core/
│  ├─ helpers/
│  │  └─ applications/
│  │     └─ transformer.application.helper.ts
│  └─ contracts/
│     ├─ usecases/
│     │  └─ transformer/
│     │     └─ base-transform.use-case.ts
│     ├─ services/                      # (reserved)
│     └─ repositories/                  # (reserved)
├─ integration/                         # HTTP & event-driven wiring
│  ├─ event/
│  │  ├─ decorators/
│  │  │  └─ topic.decorator.ts
│  │  ├─ drivers/
│  │  │  └─ kafka/
│  │  │     ├─ kafka-consumer.application.ts
│  │  │     ├─ kafka-producer.application.ts
│  │  │     ├─ kafka-topic-router.application.ts
│  │  │     └─ kafka.module.ts
│  │  ├─ event.module.ts
│  │  └─ topic-discovery.application.ts
│  └─ http/
│     └─ controllers/
│        ├─ health.controller.ts
│        └─ prometheus.controller.ts
└─ domains/
   └─ <domain>/
      ├─ <domain>.module.ts
      ├─ usecases/                      # Data Action Containers (event orchestrators)
      │  └─ transformer/
      │     └─ transform-*.use-case.ts  # thin: parse → call Application → emit/tombstone
      ├─ applications/                  # Domain/Application logic (pure, testable)
      │  └─ *.application.ts
      └─ repositories/                  # Data access (e.g., SQL adapters)
         └─ sql/
            └─ *.sql.repository.ts
```

> **Notes about the current tree**
> - Kafka driver classes are **`*.application.ts`** (producer/consumer/router).
> - Base Use Case lives in **`core/contracts/usecases/transformer/base-transform.use-case.ts`**.
> - Transformer helpers live in **`core/helpers/applications/transformer.application.helper.ts`**.
> - Domain modules are named like `attraction.module.ts`, `hotel.module.ts`, etc.
> - Repositories are under `repositories/sql/*.sql.repository.ts` per domain.

---

## Features

- **Kafka Integration:** Debezium CDC in; optional downstream topics out.
- **Orchestrated Data Actions:** Use Cases register via `@TopicHandler` and coordinate I/O and emission.
- **Application Logic Isolation:** All transformation rules live in `applications/`.
- **Lean Data Access:** Purpose-built SQL repositories per table.
- **Observability:** `/health`, `/metrics`, structured logs.
- **Safety:** Idempotent handlers; tombstones for deletes and unpublished states.

---

## Data Flow

1. **Kafka Consumer (integration/event/drivers/kafka)** reads from a source topic.
2. **Topic Router** dispatches to the matching **Use Case** registered via `@TopicHandler`.
3. **Use Case (Data Action Container)** parses the event, delegates logic to **Applications**, and requests enrichment via **Repositories** if needed.
4. **Application** performs deterministic mapping/rules and returns the output DTO.
5. **Kafka Producer (integration/event/drivers/kafka)** final step: the Use Case emits one or more messages to the target topic | topics, or tombstone messages for deletes.

---

## Naming & Conventions

- **Use Case files:** `transform-<entity>-*.use-case.ts` (CDC handlers)
- **Application files:** `<entity>.application.ts` (mapping/rules)
- **Repository files:** `<table>.sql.repository.ts`
- **Message key policy:** Use the source record’s canonical id (e.g., `doc._id`)
- **Topic naming tip:** Prefixes (`spot_*`, `content_*`) select the target DB; no prefix = default DB.
  Examples: `users` (default), `spot_users`, `content_users`.

---

## Contributing

- Keep **Use Cases thin** (no business rules). They wire inputs/outputs and call the Application.
- Put **all logic** (mappers, rules, invariants) into **`applications/`**.
- Register handlers with `@TopicHandler('bare_topic_name')` exposing `execute(key, value)`.
- Prefer pure functions; add unit tests for each Application.
- Repositories are for data access only.

---

## License

Internal — Lastsecond ☕