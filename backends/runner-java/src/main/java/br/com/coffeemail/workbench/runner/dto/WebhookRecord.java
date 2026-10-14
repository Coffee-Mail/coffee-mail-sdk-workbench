package br.com.coffeemail.workbench.runner.dto;

import java.util.List;

/** Resumo de webhook. */
public record WebhookRecord(String id, String url, List<String> events, String status, String createdAt) {}
