# PostgreSQL Expert Research

## Overview
This document provides comprehensive research for creating a PostgreSQL database expert agent. The research covers advanced PostgreSQL features, performance optimization, troubleshooting patterns, and best practices for database administration.

## Scope Definition
**One-sentence scope**: "PostgreSQL optimization, query performance, schema design, advanced features, connection management, and database administration"

## Recurring Problems (Frequency × Complexity)

### High Frequency, High Complexity
1. **Query performance optimization and execution plan analysis**
   - EXPLAIN ANALYZE interpretation
   - Index strategy optimization
   - Query rewriting for performance
   
2. **Index strategy design and maintenance**
   - Choosing appropriate index types (B-tree, GIN, GiST, BRIN, Hash)
   - Composite vs. single-column indexes
   - Partial and expression indexes

3. **Database schema design and normalization**
   - Table partitioning strategies
   - Foreign key and constraint design
   - Data type selection optimization

### High Frequency, Medium Complexity
4. **Connection pooling configuration and limits**
   - max_connections tuning
   - Connection pool sizing
   - Connection state management

5. **Database migration and schema versioning**
   - Safe migration strategies
   - Zero-downtime deployments
   - Version control for database schemas

6. **Autovacuum tuning and maintenance**
   - Vacuum threshold configuration
   - Analyzing autovacuum logs
   - Manual vacuum strategies

### Medium Frequency, High Complexity
7. **JSON/JSONB operations and indexing**
   - GIN index optimization for JSONB
   - JSONPath query optimization
   - Choosing between JSON and JSONB

8. **Transaction isolation and concurrency**
   - Deadlock resolution
   - Lock contention analysis
   - Transaction timeout configuration

9. **Full-text search implementation**
   - tsvector and tsquery optimization
   - GIN index configuration
   - Custom dictionaries and configurations

10. **Performance monitoring and alerting**
    - pg_stat_statements analysis
    - Key performance indicators
    - Resource utilization monitoring

### Medium Frequency, Medium Complexity
11. **PostgreSQL extension usage**
    - Common extension installation (pg_stat_statements, pgcrypto)
    - Extension compatibility and updates
    - Custom extension development

12. **Backup and recovery strategies**
    - pg_dump vs. physical backups
    - Point-in-time recovery (PITR)
    - Backup verification and testing

### Low Frequency, High Complexity
13. **Replication and high availability**
    - Streaming replication setup
    - Logical replication configuration
    - Failover and switchover procedures

14. **Security configuration and access control**
    - pg_hba.conf optimization
    - Role-based access control
    - SSL/TLS configuration

15. **Advanced partitioning strategies**
    - Range, list, and hash partitioning
    - Partition pruning optimization
    - Partition maintenance automation

## Topic Categories

### Category 1: Query Optimization & Performance
- **EXPLAIN ANALYZE interpretation**: Understanding execution plans, cost analysis, and bottleneck identification
- **Index strategies**: Choosing optimal index types, composite indexing, and maintenance
- **Query rewriting**: Optimization techniques, subquery vs. join analysis
- **Statistics and planner tuning**: ANALYZE command, planner cost constants

### Category 2: Schema Design & Data Types
- **Normalization and denormalization**: Balancing performance and maintainability
- **Data type selection**: Optimal type choices for performance and storage
- **Constraint design**: Primary keys, foreign keys, check constraints
- **Table partitioning**: Range, list, hash partitioning strategies

### Category 3: JSON/JSONB & Advanced Features
- **JSONB indexing**: GIN index optimization with jsonb_ops and jsonb_path_ops
- **JSONPath queries**: Advanced path expressions and performance optimization
- **Full-text search**: tsvector, tsquery, and GIN index configuration
- **Extension ecosystem**: pg_stat_statements, pgcrypto, PostGIS usage

### Category 4: Connection Management & Transactions
- **Connection pooling**: PgBouncer, connection limits, pool sizing
- **Transaction isolation**: MVCC, isolation levels, deadlock resolution
- **Lock analysis**: Lock contention identification and resolution
- **Connection state management**: Prepared statements, connection lifecycle

### Category 5: Administration & Monitoring
- **Autovacuum tuning**: Threshold configuration, cost-based delays
- **Performance monitoring**: Key metrics, pg_stat views analysis
- **Maintenance operations**: VACUUM, ANALYZE, REINDEX strategies
- **Backup and recovery**: Physical vs. logical backups, PITR setup

### Category 6: Replication & High Availability
- **Streaming replication**: Primary/standby setup, lag monitoring
- **Logical replication**: Publication/subscription model
- **Failover procedures**: Automatic and manual failover strategies
- **Monitoring replication**: pg_stat_replication, slot management

## Environment Detection

### PostgreSQL Version Detection
```sql
SELECT version();
-- or from command line
psql --version
```

### Configuration Analysis
```sql
-- Show current configuration
SHOW all;

-- Check important settings
SHOW shared_buffers;
SHOW effective_cache_size;
SHOW work_mem;
SHOW maintenance_work_mem;
SHOW checkpoint_segments; -- PostgreSQL < 9.5
SHOW max_wal_size; -- PostgreSQL >= 9.5
```

### Extension Discovery
```sql
-- List installed extensions
SELECT * FROM pg_extension;

-- Available extensions
SELECT * FROM pg_available_extensions;
```

### Database Statistics
```sql
-- Database activity overview
SELECT * FROM pg_stat_activity;

-- Table and index statistics
SELECT * FROM pg_stat_user_tables;
SELECT * FROM pg_stat_user_indexes;
```

### Connection Information
```sql
-- Current connection info
SELECT 
    datname as database,
    usename as user,
    client_addr,
    client_port,
    application_name,
    state
FROM pg_stat_activity 
WHERE pid = pg_backend_pid();
```

## Key Performance Indicators

### Query Performance Metrics
- **Query execution time**: Track slow queries via pg_stat_statements
- **Index usage**: Monitor index scans vs. sequential scans
- **Cache hit ratio**: Buffer cache effectiveness
- **Lock wait time**: Concurrency bottlenecks

### System Resource Metrics
- **Connection count**: Active vs. maximum connections
- **Memory usage**: shared_buffers, work_mem utilization
- **Disk I/O**: Read/write rates, WAL generation
- **CPU usage**: Query processing overhead

### Database Health Metrics
- **Autovacuum activity**: Dead tuple accumulation
- **Replication lag**: Standby synchronization status
- **Checkpoint frequency**: WAL processing efficiency
- **Table bloat**: Space utilization optimization

## Advanced PostgreSQL Features

### Index Types and Use Cases

#### B-tree Indexes (Default)
```sql
CREATE INDEX idx_btree ON table_name (column_name);
-- Best for: Equality, range queries, sorting
-- Supports: <, <=, =, >=, >, BETWEEN, IN, IS NULL
```

#### GIN Indexes (Generalized Inverted)
```sql
-- For JSONB data
CREATE INDEX idx_gin_jsonb ON table_name USING GIN (jsonb_column);

-- For full-text search
CREATE INDEX idx_gin_fts ON table_name USING GIN (to_tsvector('english', text_column));

-- For arrays
CREATE INDEX idx_gin_array ON table_name USING GIN (array_column);
```

#### GiST Indexes (Generalized Search Tree)
```sql
-- For geometric data
CREATE INDEX idx_gist_geom ON table_name USING GiST (geometry_column);

-- For ltree (hierarchical data)
CREATE INDEX idx_gist_ltree ON table_name USING GiST (path_column);
```

#### BRIN Indexes (Block Range)
```sql
-- For large tables with natural ordering
CREATE INDEX idx_brin_timestamp ON large_table USING BRIN (created_at);
-- Best for: Time-series data, sequential data
```

#### Hash Indexes
```sql
CREATE INDEX idx_hash ON table_name USING HASH (column_name);
-- Best for: Equality comparisons only
-- Note: Not WAL-logged in older versions
```

### JSONB Optimization Strategies

#### Index Operator Classes
```sql
-- Default jsonb_ops (supports more operators)
CREATE INDEX idx_jsonb_default ON api USING GIN (jdoc);

-- jsonb_path_ops (smaller, faster for containment)
CREATE INDEX idx_jsonb_path ON api USING GIN (jdoc jsonb_path_ops);

-- Expression indexes for specific paths
CREATE INDEX idx_jsonb_tags ON api USING GIN ((jdoc -> 'tags'));
```

#### Common JSONB Query Patterns
```sql
-- Containment queries (uses GIN index)
SELECT * FROM api WHERE jdoc @> '{"company": "Magnafone"}';

-- Key existence (uses GIN index)
SELECT * FROM api WHERE jdoc ? 'key_name';

-- JSONPath queries (PostgreSQL 12+)
SELECT * FROM api WHERE jdoc @? '$.tags[*] ? (@ == "qui")';
```

### Partitioning Strategies

#### Range Partitioning
```sql
-- Parent table
CREATE TABLE measurement (
    id SERIAL,
    logdate DATE NOT NULL,
    data TEXT
) PARTITION BY RANGE (logdate);

-- Partitions
CREATE TABLE measurement_y2024m01 PARTITION OF measurement
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

#### List Partitioning
```sql
CREATE TABLE sales (
    id SERIAL,
    region TEXT,
    amount DECIMAL
) PARTITION BY LIST (region);

CREATE TABLE sales_north PARTITION OF sales
    FOR VALUES IN ('north', 'northeast', 'northwest');
```

#### Hash Partitioning
```sql
CREATE TABLE orders (
    id SERIAL,
    customer_id INTEGER,
    order_date DATE
) PARTITION BY HASH (customer_id);

CREATE TABLE orders_0 PARTITION OF orders
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);
```

## Performance Tuning Guidelines

### Memory Configuration
```sql
-- Shared buffers (25% of RAM for dedicated DB server)
shared_buffers = '2GB'

-- Effective cache size (estimate of OS cache + shared_buffers)
effective_cache_size = '6GB'

-- Work memory (per sort/hash operation)
work_mem = '256MB'

-- Maintenance work memory (VACUUM, CREATE INDEX)
maintenance_work_mem = '512MB'
```

### Checkpoint and WAL Tuning
```sql
-- WAL configuration (PostgreSQL 9.5+)
max_wal_size = '2GB'
min_wal_size = '512MB'

-- Checkpoint completion target
checkpoint_completion_target = 0.9

-- WAL writer delay
wal_writer_delay = '200ms'
```

### Autovacuum Configuration
```sql
-- Enable autovacuum (should be on)
autovacuum = on

-- Autovacuum workers
autovacuum_max_workers = 3

-- Vacuum thresholds
autovacuum_vacuum_threshold = 50
autovacuum_vacuum_scale_factor = 0.2

-- Analyze thresholds  
autovacuum_analyze_threshold = 50
autovacuum_analyze_scale_factor = 0.1
```

### Query Optimization Techniques

#### Using EXPLAIN ANALYZE
```sql
-- Basic query plan
EXPLAIN SELECT * FROM orders WHERE customer_id = 123;

-- Detailed execution statistics
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 123;

-- Include buffer usage
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE customer_id = 123;
```

#### Index Strategy Analysis
```sql
-- Identify unused indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE idx_scan = 0
ORDER BY schemaname, tablename, indexname;

-- Find duplicate indexes
SELECT 
    t.schemaname,
    t.tablename,
    a.indexname as index1,
    b.indexname as index2,
    a.indexdef,
    b.indexdef
FROM pg_indexes a
JOIN pg_indexes b ON (a.tablename = b.tablename 
                     AND a.schemaname = b.schemaname 
                     AND a.indexname > b.indexname)
JOIN pg_tables t ON (t.tablename = a.tablename 
                    AND t.schemaname = a.schemaname)
WHERE a.indexdef = b.indexdef;
```

## Connection Management Best Practices

### Connection Pooling with PgBouncer
```ini
# pgbouncer.ini
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = md5
auth_file = users.txt
pool_mode = transaction
max_client_conn = 200
default_pool_size = 25
```

### Connection Monitoring
```sql
-- Current connections
SELECT 
    state,
    count(*) as connections
FROM pg_stat_activity 
GROUP BY state;

-- Long-running queries
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
ORDER BY duration DESC;
```

## Monitoring and Diagnostics

### Essential Monitoring Queries

#### Database Performance Overview
```sql
SELECT 
    datname,
    numbackends as connections,
    xact_commit,
    xact_rollback,
    blks_read,
    blks_hit,
    tup_returned,
    tup_fetched,
    tup_inserted,
    tup_updated,
    tup_deleted
FROM pg_stat_database 
WHERE datname = current_database();
```

#### Top Slow Queries (requires pg_stat_statements)
```sql
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / 
        nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
```

#### Index Usage Analysis
```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
```

### Replication Monitoring

#### Replication Status
```sql
-- On primary server
SELECT 
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    write_lag,
    flush_lag,
    replay_lag
FROM pg_stat_replication;
```

#### Replication Slot Information
```sql
SELECT 
    slot_name,
    plugin,
    slot_type,
    database,
    active,
    restart_lsn,
    confirmed_flush_lsn
FROM pg_replication_slots;
```

## Backup and Recovery Strategies

### Physical Backups (pg_basebackup)
```bash
# Full cluster backup
pg_basebackup -D /backup/base -Ft -z -P -U replication_user -h primary_host

# Continuous archiving setup
# In postgresql.conf:
wal_level = replica
archive_mode = on
archive_command = 'cp %p /archive/%f'
```

### Logical Backups (pg_dump/pg_dumpall)
```bash
# Single database dump
pg_dump -h localhost -U postgres -d mydb -f mydb_backup.sql

# All databases
pg_dumpall -h localhost -U postgres -f all_databases.sql

# Custom format (compressed, allows selective restore)
pg_dump -h localhost -U postgres -d mydb -Fc -f mydb_backup.dump
```

### Point-in-Time Recovery (PITR)
```bash
# Recovery configuration (recovery.conf or postgresql.conf in v12+)
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2024-01-15 14:30:00'
recovery_target_action = 'promote'
```

## Security Best Practices

### Authentication Configuration (pg_hba.conf)
```bash
# TYPE  DATABASE    USER        ADDRESS         METHOD
local   all         postgres                    peer
local   all         all                         md5
host    all         all         127.0.0.1/32    md5
host    all         all         ::1/128         md5
hostssl all         all         0.0.0.0/0       md5
```

### Role-Based Access Control
```sql
-- Create roles
CREATE ROLE app_read;
CREATE ROLE app_write;
CREATE ROLE app_admin;

-- Grant privileges
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_read;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_write;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_admin;

-- Create users and assign roles
CREATE USER app_user PASSWORD 'secure_password';
GRANT app_read TO app_user;
```

### SSL/TLS Configuration
```bash
# In postgresql.conf
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
ssl_ca_file = 'ca.crt'
ssl_crl_file = 'server.crl'
```

## Common Troubleshooting Patterns

### Performance Issues
1. **Slow queries**: Use EXPLAIN ANALYZE, check for missing indexes
2. **High CPU usage**: Identify expensive queries in pg_stat_statements
3. **Memory issues**: Check work_mem, shared_buffers configuration
4. **I/O bottlenecks**: Monitor pg_stat_io, consider index optimization

### Connection Issues
1. **Too many connections**: Check max_connections, implement connection pooling
2. **Connection timeouts**: Adjust statement_timeout, idle_in_transaction_session_timeout
3. **Authentication failures**: Review pg_hba.conf, check user roles

### Maintenance Issues
1. **Table bloat**: Monitor autovacuum effectiveness, manual VACUUM if needed
2. **Index bloat**: REINDEX heavily updated indexes
3. **Transaction ID wraparound**: Monitor age(datfrozenxid), emergency VACUUM

## Source Material Priorities

1. **PostgreSQL Official Documentation** - Primary source for all features and best practices
2. **Performance Tuning Guides** - Query optimization, configuration tuning
3. **PostgreSQL Wiki** - Community best practices and troubleshooting
4. **pg_stat_statements Extension** - Query performance analysis
5. **PostgreSQL Mailing Lists** - Real-world problem patterns
6. **Stack Overflow PostgreSQL Tag** - Common issues and solutions

## Content Matrix Structure

The content matrix will include columns for:
- **Category**: Performance, Schema, JSON/JSONB, etc.
- **Symptom/Error**: Observable problem or error message
- **Root Cause**: Underlying technical reason
- **Fix 1 (Minimal)**: Quick mitigation
- **Fix 2 (Better)**: Proper solution
- **Fix 3 (Complete)**: Comprehensive resolution with optimization
- **Diagnostic Command**: SQL or command to investigate
- **Validation Step**: How to verify the fix worked
- **Official Link**: PostgreSQL documentation reference

## Template Requirements

### Proactive Usage
"Use PROACTIVELY for PostgreSQL performance issues, query optimization, and database administration"

### Step 0 - Delegation Logic
When to recommend:
- **database-expert**: General PostgreSQL questions, schema design
- **performance-expert**: System-wide performance issues, hardware optimization  
- **security-expert**: Authentication, authorization, encryption issues

### Validation Flow
1. **Connection test**: Verify database connectivity and version
2. **Query performance analysis**: Check current performance metrics
3. **Schema validation**: Review table structure and indexing
4. **Configuration review**: Assess PostgreSQL settings

### Safety Rules
- Always backup before schema changes
- Test queries on non-production environments first
- Use transactions for multi-statement operations
- Monitor resource usage during maintenance operations

### Runtime Caveats
- PostgreSQL version differences in syntax and features
- Extension dependencies and compatibility
- Replication lag considerations for read queries
- Lock contention during maintenance windows

This research provides the foundation for creating a comprehensive PostgreSQL expert agent that can handle complex database optimization, troubleshooting, and administration tasks.