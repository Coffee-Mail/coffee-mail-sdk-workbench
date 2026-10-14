package br.com.coffeemail.workbench.runner.dto;

/** Resumo de estatísticas. */
public record StatsRecord(int totalSent, int totalDelivered, int totalBounced, double deliveryRate) {}
