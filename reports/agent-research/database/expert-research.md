# Database Expert Research Document

## 1. SCOPE AND BOUNDARIES

**One-sentence scope**: "Database optimization, schema design, query performance, transaction management, and connection handling for relational and NoSQL databases."

### 15 Recurring Problems (by frequency × complexity):

1. **Query performance and optimization issues** (High freq, High complexity)
   - Slow SELECT statements, missing indexes, full table scans
   - N+1 query problems in ORMs
   - Inefficient JOIN operations and subqueries

2. **Database connection pooling and management** (High freq, Medium complexity)
   - Connection pool exhaustion, especially in PostgreSQL
   - Improper client reuse in Prisma/TypeORM
   - Memory leaks from unclosed connections

3. **Schema design and normalization challenges** (Medium freq, High complexity)
   - Over-normalization vs under-normalization balance
   - Complex JOIN queries from over-normalized schemas
   - Data redundancy and update anomalies

4. **Transaction handling and isolation problems** (Medium freq, High complexity)
   - Deadlock detection and resolution
   - Isolation level misunderstandings
   - Race conditions in concurrent operations

5. **Index strategy and maintenance issues** (Medium freq, Medium complexity)
   - Missing indexes on frequently queried columns
   - Over-indexing slowing write operations
   - Composite index order optimization

6. **Database migration and versioning conflicts** (High freq, Medium complexity)
   - Schema migration failures in production
   - Data migration performance issues
   - Version rollback complications

7. **Connection timeout and retry logic** (High freq, Low complexity)
   - Improper timeout configurations
   - Missing exponential backoff strategies
   - Connection leak detection

8. **Data consistency and integrity violations** (Medium freq, High complexity)
   - Foreign key constraint violations
   - ACID property violations
   - Eventual consistency issues in distributed systems

9. **Database backup and recovery procedures** (Low freq, High complexity)
   - Point-in-time recovery setup
   - Backup verification and testing
   - Disaster recovery planning

10. **ORM configuration and query generation issues** (High freq, Medium complexity)
    - Inefficient ORM-generated queries
    - Lazy vs eager loading decisions
    - ORM relationship configuration errors

11. **Database security and access control** (Medium freq, Medium complexity)
    - SQL injection vulnerabilities
    - Privilege escalation through improper permissions
    - Sensitive data exposure

12. **Replication and clustering setup** (Low freq, High complexity)
    - Master-slave replication lag
    - Split-brain scenarios in clustering
    - Read replica consistency issues

13. **Database monitoring and alerting gaps** (Medium freq, Medium complexity)
    - Missing performance metrics collection
    - Inadequate slow query logging
    - Resource usage monitoring blind spots

14. **Data type conversion and validation errors** (High freq, Low complexity)
    - Type mismatch errors in migrations
    - Character encoding issues
    - Date/time zone handling problems

15. **Bulk operations and batch processing optimization** (Medium freq, Medium complexity)
    - Inefficient bulk insert patterns
    - Large dataset processing memory issues
    - Batch size optimization for performance

### Sub-domain Mapping Recommendations:
- **postgres-expert**: PostgreSQL-specific optimization, MVCC, advanced indexing
- **mongodb-expert**: Document database design, aggregation pipelines, sharding
- **redis-expert**: Caching strategies, session management, pub/sub patterns
- **prisma-expert**: ORM-specific optimization, schema management, type safety

## 2. TOPIC MAP - 6 CATEGORIES

### Category 1: Query Performance & Optimization

**Error messages/symptoms:**
- "Seq Scan" in PostgreSQL EXPLAIN output
- "Using filesort" or "Using temporary" in MySQL EXPLAIN
- Slow query logs showing high execution times
- High CPU usage during query execution
- Application timeouts on database operations

**Root causes:**
- Missing or inappropriate indexes
- Inefficient query structure (subqueries vs JOINs)
- Large result sets without proper pagination
- Statistics out of date for query planner
- N+1 query patterns in ORM usage

**Fix 1 (minimal):**
- Add indexes on frequently queried columns
- Use LIMIT for pagination
- Update table statistics with ANALYZE

**Fix 2 (better):**
- Rewrite subqueries as JOINs where appropriate
- Implement proper ORM relationship loading strategies
- Use composite indexes for multi-column queries
- Configure query timeout limits

**Fix 3 (complete):**
- Implement query performance monitoring with tools like pg_stat_statements
- Set up automated query optimization with index recommendations
- Implement query result caching at application level
- Design database partitioning for large tables

**Diagnostic commands:**
```sql
-- PostgreSQL
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;
SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC;
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- MySQL  
EXPLAIN FORMAT=JSON SELECT ...;
SHOW PROCESSLIST;
SELECT * FROM performance_schema.events_statements_summary_by_digest;
```

**Validation steps:**
- Compare execution times before/after optimization
- Verify index usage in query plans
- Monitor query execution statistics over time
- Check for regression in related queries

**Official links:**
- [PostgreSQL Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html)
- [MySQL Optimization Guide](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)
- [Prisma Performance Guide](https://www.prisma.io/docs/guides/performance-and-optimization)

### Category 2: Schema Design & Migrations

**Error messages/symptoms:**
- "Duplicate entry" or "unique constraint violation"
- "Foreign key constraint fails"
- Migration timeouts on large tables
- "Column cannot be null" during ALTER TABLE
- Performance degradation after schema changes

**Root causes:**
- Inadequate constraint definitions
- Missing or incorrect foreign key relationships
- Large table modifications blocking operations
- Insufficient normalization or over-normalization
- Missing default values for new NOT NULL columns

**Fix 1 (minimal):**
- Add proper constraints (PRIMARY KEY, FOREIGN KEY, UNIQUE)
- Use default values for new columns
- Break large migrations into smaller chunks

**Fix 2 (better):**
- Implement database design patterns (1NF, 2NF, 3NF)
- Use proper data types with appropriate sizes
- Add indexes before foreign key constraints
- Test migrations on staging environment with production-sized data

**Fix 3 (complete):**
- Implement zero-downtime migration strategies
- Use database versioning and rollback procedures
- Set up automated schema validation
- Document schema design decisions and trade-offs

**Diagnostic commands:**
```sql
-- PostgreSQL
\d table_name  -- Describe table structure
SELECT conname, contype, conkey FROM pg_constraint WHERE conrelid = 'table_name'::regclass;
SELECT * FROM information_schema.table_constraints;

-- MySQL
DESCRIBE table_name;
SHOW CREATE TABLE table_name;
SELECT * FROM information_schema.referential_constraints;
```

**Validation steps:**
- Validate referential integrity after migrations
- Check constraint enforcement
- Verify data types and sizes meet requirements
- Test rollback procedures

**Official links:**
- [PostgreSQL DDL](https://www.postgresql.org/docs/current/ddl.html)
- [MySQL Data Types](https://dev.mysql.com/doc/refman/8.0/en/data-types.html)
- [Database Design Best Practices](https://vertabelo.com/blog/database-design-patterns/)

### Category 3: Connections & Transactions

**Error messages/symptoms:**
- "Too many connections" errors
- "Connection pool exhausted" messages
- "Deadlock detected" errors
- Transaction timeout errors
- "Connection reset by peer" or "Connection refused"

**Root causes:**
- Insufficient connection pool sizing
- PostgreSQL's process-per-connection overhead (9MB per connection)
- Improper transaction isolation level usage
- Long-running transactions holding locks
- Missing connection pooling middleware

**Fix 1 (minimal):**
- Increase max_connections setting
- Implement basic connection timeouts
- Use single PrismaClient instance across application

**Fix 2 (better):**
- Implement connection pooling with PgBouncer (PostgreSQL) or ProxySQL (MySQL)
- Configure appropriate pool sizes (typically 5-10 connections per CPU core)
- Use transaction-level connection pooling where possible
- Implement retry logic with exponential backoff

**Fix 3 (complete):**
- Deploy connection pooler as sidecar container in Kubernetes
- Implement comprehensive connection monitoring and alerting
- Use read replicas for read-heavy workloads
- Configure automatic failover and connection recovery

**Diagnostic commands:**
```sql
-- PostgreSQL
SELECT count(*) FROM pg_stat_activity;
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
SELECT * FROM pg_locks WHERE NOT granted;

-- MySQL
SHOW PROCESSLIST;
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Max_used_connections';
```

**Validation steps:**
- Monitor connection pool utilization
- Check for connection leaks over time
- Validate transaction isolation behavior
- Test connection recovery after failures

**Official links:**
- [PgBouncer Documentation](https://www.pgbouncer.org/)
- [PostgreSQL Connection Pooling Best Practices](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-connection-pooling-best-practices)
- [MySQL Connection Management](https://dev.mysql.com/doc/refman/8.0/en/connection-management.html)

### Category 4: Indexing & Storage

**Error messages/symptoms:**
- Sequential scans on large tables
- "Using filesort" in MySQL query plans
- Slow INSERT/UPDATE/DELETE operations
- High disk I/O wait times
- "Index condition pushdown" not working

**Root causes:**
- Missing indexes on WHERE clause columns
- Incorrect composite index column order
- Too many indexes slowing write operations
- Statistics not updated causing poor index selection
- Wrong index type for query patterns

**Fix 1 (minimal):**
- Create indexes on frequently filtered columns
- Update table statistics regularly
- Remove unused indexes

**Fix 2 (better):**
- Create composite indexes with proper column order (most selective first)
- Use partial indexes for filtered queries
- Choose appropriate index types (B-tree, Hash, GIN, etc.)
- Monitor index usage and effectiveness

**Fix 3 (complete):**
- Implement automated index recommendation systems
- Use expression indexes for computed values
- Set up index maintenance scheduling
- Implement table partitioning for very large tables

**Diagnostic commands:**
```sql
-- PostgreSQL
SELECT schemaname, tablename, attname, n_distinct, correlation FROM pg_stats;
SELECT * FROM pg_stat_user_indexes ORDER BY idx_scan;
SELECT * FROM pg_statio_user_indexes;

-- MySQL
SHOW INDEX FROM table_name;
SELECT * FROM sys.schema_unused_indexes;
SELECT * FROM sys.schema_redundant_indexes;
```

**Validation steps:**
- Verify index usage in query execution plans
- Monitor index scan vs sequential scan ratios
- Check write performance impact of new indexes
- Validate index size vs performance benefit

**Official links:**
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [MySQL Index Optimization](https://dev.mysql.com/doc/refman/8.0/en/mysql-indexes.html)
- [Index Usage Patterns](https://use-the-index-luke.com/)

### Category 5: Security & Access Control

**Error messages/symptoms:**
- SQL injection attack attempts in logs
- "Access denied" or "Permission denied" errors
- Unauthorized data access attempts
- "SSL connection required" errors
- Password authentication failures

**Root causes:**
- Insufficient input validation and parameterization
- Overly permissive database user privileges
- Missing or misconfigured SSL/TLS encryption
- Weak password policies
- Inadequate audit logging

**Fix 1 (minimal):**
- Use parameterized queries/prepared statements
- Enable SSL connections
- Create separate database users with limited privileges

**Fix 2 (better):**
- Implement role-based access control (RBAC)
- Enable comprehensive audit logging
- Use connection encryption and certificate validation
- Implement password rotation policies

**Fix 3 (complete):**
- Deploy database firewall with query filtering
- Implement data masking for sensitive information
- Set up real-time security monitoring and alerting
- Use database activity monitoring (DAM) tools

**Diagnostic commands:**
```sql
-- PostgreSQL
SELECT * FROM pg_roles;
SELECT * FROM information_schema.role_table_grants;
SHOW ssl;

-- MySQL
SELECT user, host, authentication_string FROM mysql.user;
SHOW GRANTS FOR 'username'@'hostname';
SHOW STATUS LIKE 'Ssl_%';
```

**Validation steps:**
- Perform security scans and penetration testing
- Verify SSL certificate validity
- Check audit log completeness
- Test access control enforcement

**Official links:**
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [MySQL Security Guide](https://dev.mysql.com/doc/refman/8.0/en/security.html)
- [OWASP Database Security](https://owasp.org/www-project-database-security/)

### Category 6: Monitoring & Maintenance

**Error messages/symptoms:**
- "Disk full" or low storage warnings
- High memory usage alerts
- Slow query log entries
- Backup failure notifications
- Replication lag warnings

**Root causes:**
- Inadequate monitoring and alerting setup
- Missing routine maintenance tasks (VACUUM, ANALYZE)
- Insufficient backup and recovery testing
- Poor capacity planning
- Lack of performance baseline establishment

**Fix 1 (minimal):**
- Enable slow query logging
- Set up basic disk space monitoring
- Schedule regular backups

**Fix 2 (better):**
- Implement comprehensive database monitoring (CPU, memory, I/O, connections)
- Schedule automated maintenance tasks
- Set up backup verification and testing
- Create performance dashboards

**Fix 3 (complete):**
- Deploy full observability stack with metrics, logs, and traces
- Implement predictive alerting based on trends
- Set up automated backup rotation and archival
- Create disaster recovery runbooks and testing procedures

**Diagnostic commands:**
```sql
-- PostgreSQL
SELECT * FROM pg_stat_database;
SELECT * FROM pg_stat_bgwriter;
SELECT name, setting FROM pg_settings WHERE category = 'Resource Usage';

-- MySQL
SHOW ENGINE INNODB STATUS;
SHOW STATUS LIKE 'Com_%';
SHOW VARIABLES LIKE 'innodb_buffer_pool_%';
```

**Validation steps:**
- Verify monitoring data accuracy
- Test alert notification delivery
- Validate backup restore procedures
- Check maintenance task completion

**Official links:**
- [PostgreSQL Monitoring](https://www.postgresql.org/docs/current/monitoring.html)
- [MySQL Performance Monitoring](https://dev.mysql.com/doc/refman/8.0/en/performance-schema.html)
- [Database Observability Best Practices](https://www.datadoghq.com/blog/database-monitoring/)

## 3. ENVIRONMENT DETECTION

### Database Type Detection:
```bash
# Connection string patterns
postgresql:// | postgres://  -> PostgreSQL
mysql://                     -> MySQL  
mongodb://                   -> MongoDB
redis://                     -> Redis
sqlite:///                   -> SQLite

# Configuration files
postgresql.conf              -> PostgreSQL
my.cnf | my.ini             -> MySQL
mongod.conf                 -> MongoDB
redis.conf                  -> Redis

# Default ports
5432                        -> PostgreSQL
3306                        -> MySQL  
27017                       -> MongoDB
6379                        -> Redis
```

### ORM/Query Builder Detection:
```bash
# package.json dependencies
"prisma"                    -> Prisma
"@prisma/client"           -> Prisma
"typeorm"                  -> TypeORM
"sequelize"                -> Sequelize
"knex"                     -> Knex.js
"mongoose"                 -> Mongoose (MongoDB)
"drizzle-orm"              -> Drizzle ORM

# Configuration files
schema.prisma              -> Prisma
ormconfig.json            -> TypeORM
.sequelizerc              -> Sequelize
knexfile.js               -> Knex.js
```

### Database Version Detection:
```sql
-- PostgreSQL
SELECT version();
SHOW server_version;

-- MySQL
SELECT version();
SHOW variables LIKE 'version%';

-- MongoDB
db.version()
db.runCommand({buildinfo: 1})
```

### Environment Context:
```bash
# Environment indicators
NODE_ENV=production        -> Production
NODE_ENV=development       -> Development
NODE_ENV=test             -> Test

# Connection patterns
localhost:5432            -> Local development
*.amazonaws.com           -> AWS RDS
*.googleapis.com          -> Google Cloud SQL
*.database.windows.net    -> Azure SQL
```

## 4. SOURCE MATERIAL PRIORITIES

### Primary Documentation:
1. **PostgreSQL Official Docs**: https://www.postgresql.org/docs/current/
2. **MySQL Reference Manual**: https://dev.mysql.com/doc/refman/8.0/en/
3. **MongoDB Manual**: https://www.mongodb.com/docs/manual/
4. **Redis Documentation**: https://redis.io/documentation

### ORM Documentation:
1. **Prisma**: https://www.prisma.io/docs/
2. **TypeORM**: https://typeorm.io/
3. **Sequelize**: https://sequelize.org/docs/v6/
4. **Mongoose**: https://mongoosejs.com/docs/

### Performance & Security:
1. **PostgreSQL Performance**: https://wiki.postgresql.org/wiki/Performance_Optimization
2. **MySQL Performance**: https://dev.mysql.com/doc/refman/8.0/en/optimization.html
3. **Database Security**: https://owasp.org/www-project-database-security/
4. **Connection Pooling**: https://www.pgbouncer.org/

### Common Issues Sources:
1. **Stack Overflow**: Database-specific tags (postgresql, mysql, mongodb)
2. **GitHub Issues**: ORM and database driver repositories
3. **Database Performance Blogs**: Use The Index Luke, Percona, PostgreSQL Planet

## 5. CANONICAL TEMPLATE REQUIREMENTS

### Frontmatter:
```yaml
---
type: expert
name: Database Expert
description: Use PROACTIVELY for database performance optimization, schema design issues, query performance problems, connection management, and transaction handling
triggers:
  - Database connection errors
  - Slow query performance
  - Schema design questions
  - Migration issues
  - ORM configuration problems
allowed-tools: 
  - Bash(psql:*, mysql:*, mongosh:*)
  - Read
  - Grep
  - Edit
---
```

### Step 0 - Sub-Expert Routing:
- **PostgreSQL-specific issues**: Recommend `postgres-expert` for MVCC, advanced indexing, vacuum strategies
- **MongoDB document design**: Recommend `mongodb-expert` for aggregation pipelines, sharding, replica sets
- **Redis caching patterns**: Recommend `redis-expert` for session management, pub/sub, caching strategies
- **ORM-specific optimization**: Recommend `prisma-expert`, `typeorm-expert` for ORM-specific patterns

### Validation Flow:
1. **Connection Test**: Verify database connectivity and basic operations
2. **Schema Validation**: Check for proper constraints, indexes, and relationships
3. **Query Performance Check**: Analyze slow queries and execution plans
4. **Resource Monitoring**: Check connection counts, memory usage, disk space

### Safety Rules:
- **No destructive operations**: Never DROP tables, DELETE without WHERE, or TRUNCATE
- **Backup verification**: Always verify backups exist before schema changes
- **Transaction safety**: Use transactions for multi-statement operations
- **Read-only analysis**: Default to SELECT and EXPLAIN queries for diagnostics

### Runtime Caveats:
- **Transaction isolation**: Be aware of isolation level implications
- **Connection limits**: Monitor connection pool exhaustion, especially in PostgreSQL
- **Lock contention**: Avoid long-running transactions during peak hours
- **Memory usage**: PostgreSQL uses ~9MB per connection vs MySQL's ~256KB per thread

## 6. DISTILLATION GUIDELINES

### Non-obvious Patterns:
1. **PostgreSQL Connection Pooling**: Unlike other databases, PostgreSQL spawns a new process per connection (~9MB overhead), making connection pooling critical rather than optional
2. **Index Column Order**: In composite indexes, put most selective columns first, except for ORDER BY queries where sort order matters
3. **ORM N+1 Detection**: Use `relationLoadStrategy: "join"` in Prisma or `eager: true` in TypeORM to avoid N+1 queries
4. **Transaction Deadlock Prevention**: Always acquire locks in consistent order across application

### Small but Critical Snippets:

#### PostgreSQL Query Analysis:
```sql
-- Enable detailed query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s

-- Find missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY n_distinct DESC;
```

#### Connection Pool Monitoring:
```javascript
// Prisma connection pool monitoring
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

prisma.$on('query', (e) => {
  console.log(`Query: ${e.query} Duration: ${e.duration}ms`);
});
```

#### MySQL Performance Tuning:
```sql
-- Key performance metrics
SELECT 
  ROUND((SELECT SUM(data_length+index_length)/1024/1024 FROM information_schema.TABLES),2) AS "DB Size MB",
  ROUND((SELECT SUM(data_length)/1024/1024 FROM information_schema.TABLES),2) AS "Data Size MB",
  ROUND((SELECT SUM(index_length)/1024/1024 FROM information_schema.TABLES),2) AS "Index Size MB";

-- Find unused indexes
SELECT s.table_schema, s.table_name, s.index_name 
FROM information_schema.statistics s
LEFT JOIN performance_schema.table_io_waits_summary_by_index_usage i
  ON s.table_schema = i.object_schema AND s.table_name = i.object_name AND s.index_name = i.index_name
WHERE i.index_name IS NULL AND s.index_name != 'PRIMARY';
```

#### Schema Migration Best Practices:
```sql
-- Safe column addition (PostgreSQL)
BEGIN;
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
UPDATE users SET email_verified = true WHERE email IS NOT NULL;
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;
COMMIT;

-- Large table modification (MySQL)
-- Use pt-online-schema-change for large tables
pt-online-schema-change --alter "ADD COLUMN email_verified BOOLEAN DEFAULT false" D=mydb,t=users --execute
```

### Performance Optimization Patterns:
1. **Batch Operations**: Use `INSERT INTO ... VALUES (...), (...)` instead of individual INSERTs
2. **Pagination**: Always use LIMIT with OFFSET or cursor-based pagination for large result sets  
3. **Connection Reuse**: Single PrismaClient instance across application, connection pooling for direct database access
4. **Read Replicas**: Route read queries to replicas, writes to primary
5. **Index Covering**: Include all selected columns in index to avoid table lookups

This research document provides comprehensive coverage of database expert knowledge areas, from basic performance optimization to advanced troubleshooting patterns, suitable for creating an expert agent that can handle the full spectrum of database-related development issues.