# Kafka Expert Research Report

## 1. Scope and Boundaries

**One-sentence scope:** "Apache Kafka distributed streaming platform including brokers, producers, consumers, ecosystem tools (Connect, Streams, Schema Registry), monitoring, and performance optimization."

### 20 Recurring Problems (with frequency × complexity ratings)

1. **Consumer Lag Buildup** - High Frequency × Medium Complexity = **High Priority**
2. **Consumer Group Rebalancing Issues** - Very High Frequency × Medium-High Complexity = **Very High Priority**
3. **Serialization/Deserialization Exceptions** - High Frequency × Medium Complexity = **High Priority**
4. **Under-replicated Partitions** - Medium Frequency × High Complexity = **High Priority**
5. **Broker Connection Failures** - High Frequency × Low-Medium Complexity = **Medium Priority**
6. **Offset Management Problems** - High Frequency × Medium Complexity = **High Priority**
7. **Configuration Errors** - High Frequency × Low-Medium Complexity = **Medium Priority**
8. **Request Timeout Errors** - Medium Frequency × Medium-High Complexity = **Medium Priority**
9. **Disk I/O Bottlenecks** - Medium Frequency × High Complexity = **High Priority**
10. **Memory/GC Issues** - Medium Frequency × High Complexity = **High Priority**
11. **SSL/SASL Authentication Failures** - Medium Frequency × Medium-High Complexity = **Medium Priority**
12. **Poison Pill Messages** - Medium Frequency × Medium Complexity = **Medium Priority**
13. **Schema Evolution Problems** - Medium Frequency × Medium Complexity = **Medium Priority**
14. **Topic Auto-creation Issues** - High Frequency × Low Complexity = **Medium Priority**
15. **Partition Count Misconfiguration** - High Frequency × Low-Medium Complexity = **Medium Priority**
16. **Network Bandwidth Saturation** - Medium Frequency × High Complexity = **High Priority**
17. **Thread Pool Exhaustion** - Medium Frequency × Medium-High Complexity = **Medium Priority**
18. **Monitoring/Alerting Gaps** - Medium Frequency × High Complexity = **High Priority**
19. **Cluster Scaling Challenges** - Medium Frequency × High Complexity = **High Priority**
20. **ISR Shrinking Issues** - Medium Frequency × High Complexity = **High Priority**

### Sub-domain mapping (when to delegate to specialists)

- **Advanced Stream Processing** → kafka-streams-expert (if exists)
- **Schema Registry Deep Issues** → schema-registry-expert (if exists)
- **Kubernetes/Container Orchestration** → devops-expert or kubernetes-expert
- **Database Integration** → database-expert
- **Security/Authentication** → security-expert
- **Cloud Provider Specifics** → aws-expert, gcp-expert, azure-expert

## 2. Topic Map (6 Categories)

### Category 1: Consumer Management & Performance

**Common Errors:**
- "Consumer group rebalancing in progress"
- "CommitFailedException: Commit cannot be completed since the group has already rebalanced"
- "TimeoutException: Timeout of 60000ms expired before successfully committing offsets"
- High consumer lag metrics (>1000 records lag)

**Root Causes:**
- Session timeouts due to slow message processing
- Frequent consumer crashes or network issues
- Improper offset management configuration
- Inefficient consumer fetch settings

**Fix Strategies:**
1. **Minimal**: Increase `session.timeout.ms` to 30000ms, tune `heartbeat.interval.ms` to 10000ms
2. **Better**: Implement manual commit strategies with proper error handling
3. **Complete**: Redesign consumer architecture with pause-resume patterns, implement DLT strategies

**Diagnostics:**
```bash
# Check consumer lag
kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group my-group

# Monitor rebalancing
grep "rebalance" /var/log/kafka/server.log

# Check JMX metrics
curl -s http://localhost:8080/actuator/metrics/kafka.consumer.lag.sum
```

**Validation:**
- Consumer lag remains stable under load
- No frequent rebalancing events in logs
- Successful offset commits without timeouts

**Resources:**
- [Kafka Consumer Groups](https://kafka.apache.org/documentation/#consumerconfigs)
- [Spring Kafka Consumer Configuration](https://docs.spring.io/spring-kafka/reference/kafka/receiving-messages.html)

### Category 2: Producer Reliability & Idempotence

**Common Errors:**
- "org.apache.kafka.common.errors.OutOfOrderSequenceException"
- "ProducerFencedException: Producer has been fenced"
- "TimeoutException: Batch containing X record(s) expired"
- "NetworkException: The server disconnected before a response was received"

**Root Causes:**
- Idempotent producer misconfiguration
- Network timeouts during high-volume sending
- Batch size and compression optimization issues
- Resource exhaustion (memory, connections)

**Fix Strategies:**
1. **Minimal**: Enable idempotence with `enable.idempotence=true` and `acks=all`
2. **Better**: Optimize batching with `batch.size=16384` and `linger.ms=5`
3. **Complete**: Implement comprehensive error handling with retry logic and DLT publishing

**Diagnostics:**
```bash
# Check producer metrics
kafka-run-class kafka.tools.ConsumerPerformance --topic test --messages 1000

# Monitor JMX producer metrics
jconsole # Connect to Kafka process, check producer metrics

# Test idempotence
# Send duplicate messages and verify no duplicates in topic
```

**Validation:**
- No duplicate messages under network issues
- Successful batch sending without timeouts
- Producer metrics show healthy send rates

**Resources:**
- [Kafka Producer Configuration](https://kafka.apache.org/documentation/#producerconfigs)
- [Idempotent Producer Documentation](https://kafka.apache.org/documentation/#idempotence)

### Category 3: Cluster Operations & Monitoring

**Common Errors:**
- "Under-replicated partitions detected"
- "ISR shrinking for partition"
- "Controller failover detected"
- "kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions value > 0"

**Root Causes:**
- Broker failures or resource exhaustion
- Network partitions between brokers
- ZooKeeper/KRaft consensus issues
- Insufficient replication factor configuration

**Fix Strategies:**
1. **Minimal**: Restart affected brokers, check network connectivity
2. **Better**: Run preferred leader election, tune `replica.lag.time.max.ms`
3. **Complete**: Implement comprehensive monitoring with alerting, automated recovery procedures

**Diagnostics:**
```bash
# Check cluster status
kafka-broker-api-versions --bootstrap-server localhost:9092

# Monitor under-replicated partitions
kafka-log-dirs --bootstrap-server localhost:9092 --describe

# Check controller status
kafka-metadata-shell --snapshot /path/to/metadata

# JMX monitoring
kafka-run-class kafka.tools.JmxTool --object-name kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions
```

**Validation:**
- Under-replicated partitions count = 0
- All partitions have full ISR
- Controller is stable and responsive

**Resources:**
- [Kafka Operations Guide](https://kafka.apache.org/documentation/#operations)
- [JMX Monitoring](https://kafka.apache.org/documentation/#monitoring)

### Category 4: Serialization & Schema Management

**Common Errors:**
- "SerializationException: Error serializing Avro message"
- "RecordDeserializationException: Error deserializing key/value"
- "SchemaRegistryException: Subject not found"
- "AvroTypeException: Expected start-union"

**Root Causes:**
- Schema evolution without compatibility checks
- Producer using different serializer than consumer deserializer
- Missing schema registry configuration
- Incompatible schema changes (removal of required fields)

**Fix Strategies:**
1. **Minimal**: Implement `ErrorHandlingDeserializer` wrapper for poison pills
2. **Better**: Use Schema Registry with backward compatibility mode
3. **Complete**: Implement comprehensive schema governance with CI/CD validation

**Diagnostics:**
```bash
# Check schema registry
curl http://localhost:8081/subjects

# Validate schema compatibility
curl -X POST -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"schema":"{...}"}' \
  http://localhost:8081/compatibility/subjects/my-value/versions/latest

# Test deserialization with different schemas
kafka-avro-console-consumer --topic test --from-beginning
```

**Validation:**
- Schema compatibility tests pass
- No deserialization exceptions in consumer logs
- Schema evolution works without breaking consumers

**Resources:**
- [Schema Registry Documentation](https://docs.confluent.io/platform/current/schema-registry/index.html)
- [Avro Schema Evolution](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html)

### Category 5: Performance Optimization

**Common Errors:**
- "RequestTimeoutException: Request timed out"
- "OutOfMemoryError: Java heap space"
- "Too many open files" errors
- Slow throughput and high latency metrics

**Root Causes:**
- Inadequate JVM heap sizing for brokers
- Disk I/O bottlenecks (HDD vs SSD)
- Network bandwidth saturation
- Improper thread pool configuration

**Fix Strategies:**
1. **Minimal**: Increase JVM heap to 6-8GB, tune GC settings
2. **Better**: Migrate to SSD storage, optimize network configuration
3. **Complete**: Implement performance monitoring, auto-scaling, resource optimization

**Diagnostics:**
```bash
# Monitor JVM performance
jstat -gc <kafka-pid> 1s

# Check disk I/O
iostat -x 1

# Monitor network usage
iftop -i eth0

# Kafka performance testing
kafka-producer-perf-test --topic test --num-records 1000000 --record-size 1024 --throughput 10000
kafka-consumer-perf-test --topic test --messages 1000000
```

**Validation:**
- JVM GC pauses < 100ms
- Disk I/O utilization < 80%
- Network bandwidth utilization < 70%
- Request latency p99 < 500ms

**Resources:**
- [Kafka Performance Tuning](https://kafka.apache.org/documentation/#hwandos)
- [JVM Tuning for Kafka](https://docs.confluent.io/platform/current/kafka/deployment.html#jvm)

### Category 6: Development & Testing

**Common Errors:**
- "MockitoException: EmbeddedKafka failed to start"
- "KafkaException: Topic creation timeout"
- "ClassCastException in Spring Kafka tests"
- "Test containers failed to start Kafka"

**Root Causes:**
- Improper test environment setup
- Conflicting Spring Boot auto-configurations
- Port conflicts in CI environments
- Missing test dependencies or configurations

**Fix Strategies:**
1. **Minimal**: Use TestContainers instead of EmbeddedKafka for reliability
2. **Better**: Implement proper test lifecycle management with setup/teardown
3. **Complete**: Create comprehensive test framework with topic templates and mock strategies

**Diagnostics:**
```bash
# Validate test setup
./gradlew test --debug

# Check test container logs
docker logs $(docker ps -q --filter ancestor=confluentinc/cp-kafka)

# Test topic creation
kafka-topics --bootstrap-server localhost:9092 --list
```

**Validation:**
- All integration tests pass consistently
- Test environments start/stop cleanly
- No port conflicts or resource leaks

**Resources:**
- [Kafka Testing Strategies](https://kafka.apache.org/21/documentation/streams/developer-guide/testing.html)
- [Spring Kafka Testing](https://docs.spring.io/spring-kafka/reference/testing.html)

## 3. Environment Detection Patterns

### Kafka Installation Detection
```bash
# Check for Kafka installation
if command -v kafka-topics.sh &> /dev/null; then
    echo "Kafka CLI tools available"
fi

# Check for configuration files
if [[ -f "/etc/kafka/server.properties" ]]; then
    echo "Self-managed Kafka detected"
elif [[ -f "/opt/bitnami/kafka/config/server.properties" ]]; then
    echo "Containerized Kafka detected"
fi

# Check for KRaft vs ZooKeeper mode
if grep -q "process.roles" /etc/kafka/server.properties 2>/dev/null; then
    echo "KRaft mode detected"
elif grep -q "zookeeper.connect" /etc/kafka/server.properties 2>/dev/null; then
    echo "ZooKeeper mode detected"
fi
```

### Cloud Provider Detection
```bash
# Detect deployment type
if [[ "$BOOTSTRAP_SERVERS" == *"amazonaws.com"* ]]; then
    DEPLOYMENT_TYPE="MSK"
elif [[ "$BOOTSTRAP_SERVERS" == *"confluent.cloud"* ]]; then
    DEPLOYMENT_TYPE="CONFLUENT_CLOUD"
elif [[ "$BOOTSTRAP_SERVERS" == *"azure"* ]]; then
    DEPLOYMENT_TYPE="AZURE_EVENT_HUBS"
else
    DEPLOYMENT_TYPE="SELF_MANAGED"
fi
```

### Framework Detection
```bash
# Spring Boot detection
if [[ -f "pom.xml" ]] && grep -q "spring-kafka" pom.xml; then
    echo "Spring Kafka detected"
elif [[ -f "build.gradle" ]] && grep -q "spring-kafka" build.gradle; then
    echo "Spring Kafka detected"
fi

# Node.js detection
if [[ -f "package.json" ]] && grep -q "kafkajs\|node-rdkafka" package.json; then
    echo "Node.js Kafka client detected"
fi
```

## 4. Tool Integration Matrix

| Tool | Purpose | Detection Method | Configuration Location |
|------|---------|------------------|----------------------|
| Kafka CLI | Topic/Consumer Management | `kafka-topics.sh --version` | `/bin/` in Kafka installation |
| Schema Registry | Schema Management | `curl http://localhost:8081/subjects` | `schema-registry.properties` |
| Kafka Connect | Data Integration | `curl http://localhost:8083/connectors` | `connect-distributed.properties` |
| Confluent Control Center | Monitoring | Web UI on port 9021 | `control-center.properties` |
| Prometheus/Grafana | Metrics | JMX exporter configuration | `jmx_prometheus_javaagent.jar` |
| AKHQ | Web UI | Web interface on configured port | `application.yml` |

## 5. Common Integration Patterns

### Spring Boot Integration
- **Dependencies**: `spring-kafka`, `kafka-avro-serializer`
- **Configuration**: `application.yml` with `spring.kafka.*` properties
- **Error Handling**: `@KafkaListener` with `DefaultErrorHandler`
- **Testing**: `@EmbeddedKafka` or TestContainers

### Docker/Kubernetes Integration
- **Networking**: Service discovery via DNS
- **Configuration**: Environment variables and ConfigMaps
- **Persistence**: StatefulSets with persistent volumes
- **Monitoring**: Sidecar containers with metric exporters

### Microservices Patterns
- **Event Sourcing**: Kafka as event store
- **CQRS**: Separate read/write models
- **Saga Pattern**: Distributed transaction coordination
- **Outbox Pattern**: Reliable event publishing

## 6. Validation Strategies

### Health Checks
```bash
# Broker health
kafka-broker-api-versions --bootstrap-server localhost:9092

# Topic operations
kafka-topics --bootstrap-server localhost:9092 --list

# Consumer group status
kafka-consumer-groups --bootstrap-server localhost:9092 --list
```

### Performance Validation
```bash
# Throughput testing
kafka-producer-perf-test --topic test --num-records 100000 --record-size 1000 --throughput 10000

# End-to-end latency
kafka-run-class kafka.tools.EndToEndLatency localhost:9092 test 1000
```

### Monitoring Validation
```bash
# JMX metrics availability
kafka-run-class kafka.tools.JmxTool --object-name kafka.server:type=BrokerTopicMetrics,name=MessagesInPerSec

# Log analysis
tail -f /var/log/kafka/server.log | grep -i error
```

## Sources and References

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Confluent Platform Documentation](https://docs.confluent.io/platform/current/overview.html)
- [Spring Kafka Reference](https://docs.spring.io/spring-kafka/reference/)
- [Kafka Performance Testing](https://kafka.apache.org/documentation/#hwandos)
- [KRaft Mode Documentation](https://developer.confluent.io/learn/kraft/)
- [Schema Registry Guide](https://docs.confluent.io/platform/current/schema-registry/index.html)
- [Kafka Security Documentation](https://kafka.apache.org/documentation/#security)
- [Monitoring Kafka](https://kafka.apache.org/documentation/#monitoring)