package br.com.coffeemail.workbench.runner.dto;

/** Resumo de supressão. */
public record SuppressionRecord(String id, String email, String reason, String createdAt) {}
