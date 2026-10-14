package br.com.coffeemail.workbench.runner.dto;

import java.util.Map;
import org.jspecify.annotations.Nullable;

/** Erro padronizado do envelope do runner. */
public record RunnerError(String code, String message, int status, @Nullable Map<String, Object> details) {}
