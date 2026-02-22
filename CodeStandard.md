# Coding Standard — .NET Projects

This document defines coding standards for .NET (C#) services, libraries, APIs, and background workers. The goal is consistency, readability, safety, and maintainability.

---

## 1) General Principles

- **Clarity over cleverness.** Prefer straightforward code.
- **Small units.** Keep methods short and focused; extract helpers.
- **Make invalid states unrepresentable** when practical (types, enums, value objects).
- **Fail fast** with clear messages for programmer errors; handle expected failures gracefully.
- **Prefer immutability** for domain/state objects where possible.
- **Keep business logic out of controllers** and infrastructure.

---

## 2) Language Version & Settings

- Use the repo’s standardized SDK via `global.json` when present.
- Enable **nullable reference types** (`<Nullable>enable</Nullable>`).
- Treat warnings as errors in CI (`<TreatWarningsAsErrors>true</TreatWarningsAsErrors>`), with targeted suppressions only.

---

## 3) Formatting & Style

### 3.1 C# style
- Follow `.editorconfig` (mandatory). If no `.editorconfig` exists, add one.
- **Braces always** (even for single-line `if/foreach/for`).
- Max line length: **120** (soft limit). Break long method calls/linq chains.

### 3.2 Using directives
- Prefer `global using` in a shared file for common usings.
- Sort usings: `System.*`, then others alphabetically.

### 3.3 Files
- **One public type per file**.
- File name should match the primary type name.

### 3.4 Dead / commented code
- **Remove commented-out code** before merging.
- Use version control for history; avoid keeping old code in comments.

---

## 4) Naming Conventions

- **Namespaces:** `Company.Product.Area`
- **Classes/Records/Structs/Enums:** `PascalCase`
- **Methods/Properties:** `PascalCase`
- **Parameters/locals:** `camelCase`
- **Private fields:** `_camelCase`
- **Constants:** `PascalCase` (or `UPPER_SNAKE_CASE` only if your team already standardizes on it—pick one and keep it consistent)
- **Interfaces:** `IThing`
- **Async methods:** suffix with `Async` (e.g., `GetUserAsync`)
- Avoid abbreviations unless widely recognized (`Id`, `Http`, `Url`).

---

## 5) Project Structure

### 5.1 Layering (typical)
- `Api` (Controllers, endpoints, request/response models)
- `Application` (use-cases, commands/queries, validators)
- `Domain` (entities, value objects, domain services, interfaces)
- `Infrastructure` (EF Core, HTTP clients, messaging, external integrations)

Rules:
- API depends on Application.
- Application depends on Domain.
- Infrastructure depends on Application + Domain.
- Domain depends on nothing.

### 5.2 Internal visibility
- Prefer `internal` by default; expose `public` only when required.
- Use `InternalsVisibleTo` for tests if needed.

---

## 6) Nullability & Option Types

- Avoid `null` as a “normal” value. Prefer:
  - empty collections
  - `Try...` pattern
  - `Result` types (see below)
- Never suppress nullability warnings with `!` unless you can *prove* it’s safe. Add a comment explaining why.

---

## 7) Exceptions & Error Handling

### 7.1 When to throw
- Throw exceptions for **programmer errors** or truly exceptional conditions.
- Do **not** use exceptions for normal control flow.

### 7.2 Prefer Result types for expected failures
For expected/validated outcomes, return a result object, e.g.:
- `Result<T>` / `OneOf<TSuccess, TError>` / `ErrorOr<T>` (pick one per repo).

### 7.3 Exception details
- Include actionable context in exception messages.
- Preserve original exceptions with `throw;` (not `throw ex;`).

---

## 8) Async & Concurrency

- Use async all the way; avoid `.Result` / `.Wait()`.
- Always accept and pass `CancellationToken` for:
  - I/O operations
  - background jobs/handlers
  - HTTP calls
  - DB calls
- Avoid `async void` except event handlers.
- Use `ConfigureAwait(false)` only in library code where appropriate.

---

## 9) Dependency Injection & Configuration

- Prefer constructor injection.
- Keep DI registrations centralized (e.g., `ServiceCollectionExtensions`).
- Use typed options via `IOptions<T>`/`IOptionsMonitor<T>` for configuration sections.
- Do not read environment variables directly in business logic; bind configuration once.

---

## 10) Logging & Observability

- Use `ILogger<T>`; do not use `Console.WriteLine`.
- Use **structured logging**:
  - ✅ `logger.LogInformation("Processed {MessageId} in {Ms}ms", messageId, elapsedMs);`
  - ❌ string interpolation with concatenation for log payloads
- Do not log secrets or personal data.
- Include correlation identifiers where applicable (request id, message id, job id).
- Prefer metrics (OpenTelemetry/counters) for high-volume signals; logs for investigation.

---

## 11) HTTP & External Calls

- Use `HttpClientFactory` (`IHttpClientFactory`) and typed clients.
- Set timeouts deliberately; avoid infinite timeouts.
- Handle transient failures (retry/backoff) using Polly or equivalent policy (consistent per repo).
- Validate and sanitize external inputs.

---

## 12) Data Access (EF Core / SQL)

- Prefer async EF methods (`ToListAsync`, `SingleOrDefaultAsync`, etc.).
- Avoid N+1 query patterns; use `Include`/projection as needed.
- Use projection (`Select`) for read models; don’t load entire aggregates when you only need a subset.
- Keep migrations reviewed and deterministic.
- Always create indexes for high-cardinality lookup columns used in filters/joins (validate with query plans where needed).

---

## 13) LINQ Guidelines

- Keep LINQ readable; break complex queries into steps.
- Avoid multiple enumerations of an `IEnumerable` when expensive—materialize to a list where appropriate.
- Prefer `Any()` over `Count() > 0`.
- Be mindful of EF translation vs in-memory evaluation.

---

## 14) Tests

### 14.1 Required tests
- New behavior must include tests:
  - unit tests for business logic
  - integration tests for data access or external contracts where appropriate

### 14.2 Test style
- Use **Arrange / Act / Assert**.
- Name tests: `Method_Scenario_ExpectedResult`.
- Tests must be deterministic (no reliance on current time/random/network). Inject time and randomness.

### 14.3 What to avoid
- Avoid mocking everything. Prefer testing behavior over implementation details.
- Use fakes/stubs for external dependencies when feasible.

---

## 15) Security

- Never commit secrets (keys, tokens, connection strings).
- Validate inputs at boundaries (API endpoints, message handlers).
- Prefer allow-lists for known enums/values.
- Use least-privilege for service identities.
- Ensure authorization checks are explicit and tested.

---

## 16) Performance & Memory

- Avoid unnecessary allocations in hot paths (large loops, high-throughput handlers).
- Prefer `StringBuilder` for large concatenations.
- Use streaming where possible for large payloads.
- Add benchmarks only when you have a performance claim or regression concern.

---

## 17) Documentation

- Public APIs and non-obvious code require XML comments.
- Add README updates for new services, env vars, and operational steps.
- Complex logic: add a short comment explaining “why”, not “what”.

---

## 18) PR Guidelines (Reviewer Checklist)

PR description must include:
- **What** changed
- **Why** it changed
- **How** it works
- **Testing** performed (unit/integration/manual)
- **Risk / rollout / rollback** (especially for hotfixes)
- Links to tickets/incidents if applicable

Reviewers should check:
- Correctness, edge cases, and error handling
- Security and data handling (PII/secrets)
- Logging and observability
- Tests: present and meaningful
- Breaking changes: versioning/migrations/backward compatibility

---

## 19) Rule Enforcement

- `.editorconfig` + `dotnet format` should be used where possible.
- CI should run:
  - build
  - tests
  - analyzers / format check
  - lint rules (if configured)

---

## 20) Exceptions to These Standards

Exceptions are allowed only when:
- there is a clear technical reason, AND
- the reason is documented in code comments or PR discussion, AND
- the exception is narrowly scoped (not a new “standard”).

---