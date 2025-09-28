# Kafka Expert Research Report

## Research Overview

This document contains comprehensive research from official Apache Kafka documentation (kafka.apache.org) and Confluent documentation to create a Kafka domain expert agent. The research focuses on common configuration issues, performance problems, operational challenges, and diagnostic approaches based on Kafka 2.8+ and modern deployment patterns.

## 1. Scope and Boundaries

**One-sentence scope**: "Kafka producer/consumer configuration, topic management, cluster operations, serialization, performance tuning, and operational troubleshooting"

**15 Recurring Problems** (frequency × complexity analysis):
1. **Consumer lag and backpressure** (HIGH freq, HIGH complexity) - Consumers falling behind producers
2. **Rebalancing storms** (MEDIUM freq, HIGH complexity) - Frequent consumer group rebalances
3. **Message ordering violations** (MEDIUM freq, MEDIUM complexity) - Lost ordering guarantees
4. **Serialization/deserialization errors** (HIGH freq, MEDIUM complexity) - Schema evolution issues
5. **Producer timeout exceptions** (HIGH freq, MEDIUM complexity) - Network and broker issues
6. **Partition skew and hotspots** (MEDIUM freq, HIGH complexity) - Uneven data distribution
7. **Duplicate message processing** (HIGH freq, MEDIUM complexity) - At-least-once delivery issues
8. **Consumer offset management** (MEDIUM freq, MEDIUM complexity) - Manual vs auto-commit issues
9. **Topic configuration mistakes** (HIGH freq, LOW complexity) - Retention, partition, replication settings
10. **Broker memory and disk issues** (MEDIUM freq, HIGH complexity) - Resource exhaustion
11. **Network configuration problems** (MEDIUM freq, MEDIUM complexity) - Security, connectivity
12. **Schema registry integration** (MEDIUM freq, MEDIUM complexity) - Schema evolution and compatibility
13. **Transaction and exactly-once issues** (LOW freq, HIGH complexity) - EOS configuration
14. **Monitoring and alerting gaps** (HIGH freq, LOW complexity) - Missing key metrics
15. **Client configuration tuning** (HIGH freq, MEDIUM complexity) - Performance optimization

**Sub-domain mapping**:
- **Container deployment issues** → docker-expert or devops-expert
- **Kubernetes orchestration** → devops-expert
- **Database integration (Kafka Connect)** → database-expert
- **Monitoring infrastructure** → devops-expert
- **Client library bugs (language-specific)** → language-specific experts

## 2. Topic Map (6 Categories)

### Category 1: Producer Configuration & Performance

**Common Error Messages:**
- `"org.apache.kafka.common.errors.TimeoutException: Topic X not present in metadata after 60000 ms"`
- `"org.apache.kafka.common.errors.NetworkException: Connection to node X could not be established"`
- `"org.apache.kafka.common.errors.RecordTooLargeException: The message is X bytes when serialized"`
- `"org.apache.kafka.clients.producer.BufferExhaustedException: Failed to allocate memory within timeout"`

**Root Causes:**
- Incorrect bootstrap servers configuration
- Network connectivity or firewall issues
- Message size exceeding broker limits
- Producer buffer pool exhaustion
- Insufficient acks configuration for durability

**Fix Strategies:**
1. **Minimal**: Increase timeout values and check network connectivity
2. **Better**: Optimize producer configuration (batch.size, linger.ms, compression.type)
3. **Complete**: Implement proper error handling, retry logic, and monitoring

**Diagnostics:**
```bash
# Check producer metrics
kafka-run-class.sh kafka.tools.JmxTool --object-name kafka.producer:type=producer-metrics,client-id=* --attributes record-send-rate

# Test connectivity
kafka-console-producer.sh --bootstrap-server localhost:9092 --topic test

# Check broker logs
tail -f /var/log/kafka/server.log | grep ERROR
```

**Validation:**
- Producer successfully sends messages without timeouts
- Metrics show healthy throughput and low error rates
- No memory allocation exceptions

**Resources:**
- [Producer Configuration](https://kafka.apache.org/documentation/#producerconfigs)
- [Producer Performance](https://kafka.apache.org/documentation/#producertuning)

### Category 2: Consumer Configuration & Processing

**Common Error Messages:**
- `"org.apache.kafka.clients.consumer.CommitFailedException: Commit cannot be completed since the group has already rebalanced"`
- `"org.apache.kafka.common.errors.WakeupException: Received wakeup which is used to break out of the consumer poll()"`
- `"org.apache.kafka.common.errors.InvalidOffsetException: Fetch position FetchPosition{offset=X, offsetEpoch=Optional.empty} is out of range"`
- `"java.util.concurrent.TimeoutException: Timeout of 30000ms expired before the position for partition X could be determined"`

**Root Causes:**
- Consumer group rebalancing due to processing time exceeding session timeout
- Improper offset management and commit strategies
- Consumer lag causing out-of-range offsets
- Inadequate consumer configuration for workload

**Fix Strategies:**
1. **Minimal**: Increase session.timeout.ms and max.poll.interval.ms
2. **Better**: Implement proper offset management strategy and error handling
3. **Complete**: Optimize consumer group sizing and implement monitoring

**Diagnostics:**
```bash
# Check consumer lag
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group your-group

# Monitor consumer metrics
kafka-run-class.sh kafka.tools.JmxTool --object-name kafka.consumer:type=consumer-fetch-manager-metrics,client-id=*

# Check rebalancing frequency
grep "rebalance" /var/log/kafka/server.log
```

**Validation:**
- Consumer lag remains within acceptable bounds
- No frequent rebalancing events
- Successful message processing without timeouts

**Resources:**
- [Consumer Configuration](https://kafka.apache.org/documentation/#consumerconfigs)
- [Consumer Group Management](https://kafka.apache.org/documentation/#consumergroup)

### Category 3: Topic & Partition Management

**Common Error Messages:**
- `"org.apache.kafka.common.errors.InvalidReplicationFactorException: Replication factor: X larger than available brokers: Y"`
- `"org.apache.kafka.common.errors.PolicyViolationException: Topic creation policy violation"`
- `"org.apache.kafka.common.errors.UnknownTopicOrPartitionException: This server does not host this topic-partition"`
- `"kafka.common.NotEnoughReplicasException: Number of alive replicas for partition X is [Y] which is below min.insync.replicas of [Z]"`

**Root Causes:**
- Insufficient brokers for desired replication factor
- Topic creation policies preventing creation
- Partition leadership issues after broker failures
- ISR (In-Sync Replica) configuration problems

**Fix Strategies:**
1. **Minimal**: Adjust replication factor or add more brokers
2. **Better**: Implement proper topic configuration standards and policies
3. **Complete**: Automate topic management with Infrastructure as Code

**Diagnostics:**
```bash
# List topics and partitions
kafka-topics.sh --bootstrap-server localhost:9092 --list --describe

# Check under-replicated partitions
kafka-topics.sh --bootstrap-server localhost:9092 --describe --under-replicated-partitions

# Monitor ISR status
kafka-log-dirs.sh --bootstrap-server localhost:9092 --describe --json
```

**Validation:**
- All partitions have sufficient replicas
- No under-replicated partitions
- Topic creation succeeds with proper configuration

**Resources:**
- [Topic Configuration](https://kafka.apache.org/documentation/#topicconfigs)
- [Partition Management](https://kafka.apache.org/documentation/#replication)

### Category 4: Cluster Operations & Performance

**Common Error Messages:**
- `"kafka.network.RequestChannel$CloseConnectionException: Broker received an invalid request"`
- `"java.io.IOException: Map failed at sun.nio.ch.FileChannelImpl.map"`
- `"kafka.server.LogDirFailureHandler: Error while deleting log for X-Y in dir /var/kafka-logs"`
- `"OutOfMemoryError: Java heap space"`

**Root Causes:**
- Broker resource exhaustion (memory, disk, file handles)
- Disk failures or permission issues
- JVM heap sizing problems
- Network configuration issues

**Fix Strategies:**
1. **Minimal**: Increase JVM heap size and clean up disk space
2. **Better**: Implement proper resource monitoring and alerting
3. **Complete**: Design proper capacity planning and auto-scaling

**Diagnostics:**
```bash
# Check broker health
kafka-broker-api-versions.sh --bootstrap-server localhost:9092

# Monitor JVM metrics
jstat -gc -t $(pgrep -f "kafka.Kafka") 5s

# Check disk usage
df -h /var/kafka-logs
lsof | grep kafka | wc -l

# Monitor broker metrics
kafka-run-class.sh kafka.tools.JmxTool --object-name kafka.server:type=BrokerTopicMetrics,name=MessagesInPerSec
```

**Validation:**
- Broker JVM metrics within healthy ranges
- Sufficient disk space and file handles
- No error messages in broker logs

**Resources:**
- [Broker Configuration](https://kafka.apache.org/documentation/#brokerconfigs)
- [Performance Tuning](https://kafka.apache.org/documentation/#hwandos)

### Category 5: Serialization & Schema Management

**Common Error Messages:**
- `"org.apache.kafka.common.errors.SerializationException: Error deserializing key/value for partition X at offset Y"`
- `"io.confluent.kafka.schemaregistry.client.rest.exceptions.RestClientException: Schema not found"`
- `"org.apache.avro.AvroTypeException: Expected field name not found"`
- `"com.fasterxml.jackson.databind.JsonMappingException: Cannot deserialize value"`

**Root Causes:**
- Schema evolution compatibility issues
- Missing or incorrect schema registry configuration
- Version mismatch between producer and consumer schemas
- Invalid data format or encoding

**Fix Strategies:**
1. **Minimal**: Fix schema compatibility and version alignment
2. **Better**: Implement proper schema evolution strategy
3. **Complete**: Automate schema management and compatibility testing

**Diagnostics:**
```bash
# Check schema registry
curl -X GET http://localhost:8081/subjects

# List schema versions
curl -X GET http://localhost:8081/subjects/your-topic-value/versions

# Test schema compatibility
curl -X POST -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"schema":"..."}' \
  http://localhost:8081/compatibility/subjects/your-topic-value/versions/latest

# Check serialization errors in consumer logs
grep "SerializationException" /var/log/your-app/consumer.log
```

**Validation:**
- Schema compatibility tests pass
- No serialization/deserialization errors
- Successful schema evolution without breaking consumers

**Resources:**
- [Schema Registry](https://docs.confluent.io/platform/current/schema-registry/index.html)
- [Avro Schema Evolution](https://docs.confluent.io/platform/current/schema-registry/avro.html)

### Category 6: Monitoring & Troubleshooting

**Common Error Messages:**
- `"org.apache.kafka.common.errors.UnknownServerException: The server experienced an unexpected error"`
- `"kafka.controller.ControllerEventManager: Error processing event"`
- `"kafka.coordinator.group.GroupCoordinator: Group X does not exist"`
- `"org.apache.kafka.common.errors.LeaderNotAvailableException: There is no leader for this topic-partition"`

**Root Causes:**
- Controller failover and election issues
- Network partitions or connectivity problems
- Group coordinator failures
- Missing monitoring and alerting on key metrics

**Fix Strategies:**
1. **Minimal**: Check cluster health and restart problematic brokers
2. **Better**: Implement comprehensive monitoring dashboard
3. **Complete**: Set up proactive alerting and automated remediation

**Diagnostics:**
```bash
# Check cluster metadata
kafka-metadata-shell.sh --snapshot /var/kafka-logs/__cluster_metadata-0/00000000000000000000.log

# Controller status
kafka-run-class.sh kafka.tools.JmxTool --object-name kafka.controller:type=KafkaController,name=ActiveControllerCount

# Group coordinator status
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list

# Network connectivity test
telnet broker1 9092

# Check Kafka logs for patterns
tail -f /var/kafka-logs/server.log | grep -E "(ERROR|WARN|Controller|Leader)"
```

**Validation:**
- All brokers are healthy and reachable
- Controller election is stable
- Consumer groups are active and processing
- Monitoring dashboards show green status

**Resources:**
- [Monitoring](https://kafka.apache.org/documentation/#monitoring)
- [Operations](https://kafka.apache.org/documentation/#operations)

## 3. Environmental Detection Patterns

### Framework Integration Detection
```bash
# Detect Spring Kafka
test -f pom.xml && grep -q "spring-kafka" pom.xml
test -f build.gradle && grep -q "spring-kafka" build.gradle

# Detect Confluent Platform
which confluent >/dev/null 2>&1
test -f /etc/confluent/docker/configure

# Detect Kafka Connect
test -f connect-standalone.properties
test -d /usr/share/confluent-hub-components

# Detect Schema Registry
curl -f http://localhost:8081/subjects >/dev/null 2>&1
test -f schema-registry.properties
```

### Configuration Detection
```bash
# Find Kafka installation
KAFKA_HOME=${KAFKA_HOME:-$(find /opt /usr -name "kafka_*" 2>/dev/null | head -1)}

# Detect configuration files
test -f server.properties
test -f producer.properties
test -f consumer.properties

# Check if Kafka is running
pgrep -f "kafka.Kafka" >/dev/null
ss -tlnp | grep :9092 >/dev/null
```

## 4. Tool Integration Patterns

### Production Readiness Checklist
- [ ] **Replication**: All topics have replication factor ≥ 3
- [ ] **ISR**: min.insync.replicas properly configured
- [ ] **Monitoring**: JMX metrics exported and monitored
- [ ] **Alerting**: Consumer lag and broker health alerts
- [ ] **Backup**: Topic configuration and offsets backed up
- [ ] **Security**: Authentication and authorization enabled
- [ ] **Network**: Proper security groups and encryption
- [ ] **Capacity**: Disk, memory, and network properly sized

### Common Command Sequences
```bash
# Health check sequence
kafka-broker-api-versions.sh --bootstrap-server localhost:9092
kafka-topics.sh --bootstrap-server localhost:9092 --list
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list

# Performance analysis sequence
kafka-run-class.sh kafka.tools.JmxTool --object-name kafka.server:type=BrokerTopicMetrics,name=MessagesInPerSec
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --all-groups
kafka-log-dirs.sh --bootstrap-server localhost:9092 --describe --json

# Troubleshooting sequence
tail -100 /var/kafka-logs/server.log
ss -tlnp | grep kafka
df -h /var/kafka-logs
```

## 5. Performance Optimization Patterns

### Producer Optimization
- **Batching**: Increase batch.size (16KB-32KB) and linger.ms (5-10ms)
- **Compression**: Enable compression.type=lz4 or snappy
- **Acks**: Use acks=1 for performance, acks=all for durability
- **Partitioning**: Implement proper partition key strategy

### Consumer Optimization
- **Fetch Size**: Increase fetch.min.bytes and max.partition.fetch.bytes
- **Concurrency**: Scale consumer instances to match partition count
- **Offset Management**: Use auto-commit for simplicity, manual for control
- **Session Timeout**: Balance between failure detection and rebalancing

### Broker Optimization
- **JVM Tuning**: -Xmx6G -Xms6G for dedicated Kafka brokers
- **OS Tuning**: vm.swappiness=1, increase file descriptor limits
- **Disk**: Use fast SSDs for logs, separate disks for OS and logs
- **Network**: Tune socket buffer sizes for high throughput

## 6. Operational Patterns

### Capacity Planning
- **Disk**: Plan for 3-7 days retention plus growth
- **Memory**: Allocate heap based on partition count and message size
- **Network**: Plan for peak throughput + replication overhead
- **CPU**: Generally not the bottleneck for Kafka

### Disaster Recovery
- **MirrorMaker**: For cross-cluster replication
- **Backup**: Regular metadata and configuration backups
- **Monitoring**: Continuous health monitoring and alerting
- **Runbooks**: Documented procedures for common issues

This research forms the foundation for creating a comprehensive Kafka domain expert that can handle the full spectrum of Kafka operational challenges from development through production deployment.