package br.com.coffeemail.workbench.runner.dto;

import org.jspecify.annotations.Nullable;

/** Envelope padrão do Runner API (SPEC §5.2). */
public record StandardResponse<T>(boolean success, RunnerInfo runner, long executionTimeMs, @Nullable T data, @Nullable RunnerError error) {}
