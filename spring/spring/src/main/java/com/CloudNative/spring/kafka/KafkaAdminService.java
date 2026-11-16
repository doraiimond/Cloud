package com.CloudNative.spring.kafka;

import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.Config;
import org.apache.kafka.clients.admin.ConfigEntry;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.admin.TopicDescription;
import org.apache.kafka.common.config.ConfigResource;
import org.springframework.kafka.core.KafkaAdmin;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
public class KafkaAdminService {
    private static final long TIMEOUT_SECONDS = 10;
    private final KafkaAdmin kafkaAdmin;

    public KafkaAdminService(KafkaAdmin kafkaAdmin) {
        this.kafkaAdmin = kafkaAdmin;
    }

    public List<Map<String, Object>> topics() throws Exception {
        try (AdminClient admin = AdminClient.create(kafkaAdmin.getConfigurationProperties())) {
            List<String> names = new ArrayList<>(admin.listTopics().names().get(TIMEOUT_SECONDS, TimeUnit.SECONDS));
            if (names.isEmpty()) return List.of();
            Map<String, TopicDescription> descriptions = admin.describeTopics(names)
                    .allTopicNames().get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
            Map<ConfigResource, Config> configs = admin.describeConfigs(
                    names.stream().map(n -> new ConfigResource(ConfigResource.Type.TOPIC, n)).toList())
                    .all().get(TIMEOUT_SECONDS, TimeUnit.SECONDS);

            return names.stream().sorted().map(name -> {
                TopicDescription description = descriptions.get(name);
                Map<String, Object> item = new HashMap<>();
                item.put("name", name);
                item.put("partitions", description == null ? 0 : description.partitions().size());
                item.put("replicas", description == null || description.partitions().isEmpty()
                        ? 0 : description.partitions().get(0).replicas().size());
                Config config = configs.get(new ConfigResource(ConfigResource.Type.TOPIC, name));
                if (config != null) {
                    item.put("retentionMs", value(config, "retention.ms"));
                    item.put("cleanupPolicy", value(config, "cleanup.policy"));
                }
                return item;
            }).toList();
        }
    }

    public void create(String name, int partitions, short replicationFactor) throws Exception {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("El nombre del tópico es obligatorio");
        if (partitions < 1 || replicationFactor < 1) throw new IllegalArgumentException("Particiones y réplicas deben ser mayores que cero");
        try (AdminClient admin = AdminClient.create(kafkaAdmin.getConfigurationProperties())) {
            admin.createTopics(List.of(new NewTopic(name, partitions, replicationFactor)))
                    .all().get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        }
    }

    public void updateRetention(String name, long retentionMs) throws Exception {
        if (retentionMs < 1000) throw new IllegalArgumentException("retentionMs debe ser mayor que 1000");
        try (AdminClient admin = AdminClient.create(kafkaAdmin.getConfigurationProperties())) {
            ConfigResource resource = new ConfigResource(ConfigResource.Type.TOPIC, name);
            admin.incrementalAlterConfigs(Map.of(resource, List.of(new org.apache.kafka.clients.admin.AlterConfigOp(
                    new ConfigEntry("retention.ms", String.valueOf(retentionMs)),
                    org.apache.kafka.clients.admin.AlterConfigOp.OpType.SET)))).all()
                    .get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        }
    }

    public void delete(String name) throws Exception {
        try (AdminClient admin = AdminClient.create(kafkaAdmin.getConfigurationProperties())) {
            admin.deleteTopics(List.of(name)).all().get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        }
    }

    public List<Map<String, String>> consumerGroups() throws Exception {
        try (AdminClient admin = AdminClient.create(kafkaAdmin.getConfigurationProperties())) {
            return admin.listConsumerGroups().all().get(TIMEOUT_SECONDS, TimeUnit.SECONDS).stream()
                    .map(group -> Map.of("id", group.groupId(), "state", String.valueOf(group.state().orElse(null))))
                    .sorted(Comparator.comparing(item -> item.get("id")))
                    .toList();
        }
    }

    private static String value(Config config, String key) {
        ConfigEntry entry = config.get(key);
        return entry == null ? null : entry.value();
    }
}
