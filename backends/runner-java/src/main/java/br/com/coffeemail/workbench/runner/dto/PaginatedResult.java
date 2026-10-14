package br.com.coffeemail.workbench.runner.dto;

import java.util.List;

/** Página padronizada. */
public record PaginatedResult<T>(List<T> items, int total, int page, int limit, boolean hasMore) {}
