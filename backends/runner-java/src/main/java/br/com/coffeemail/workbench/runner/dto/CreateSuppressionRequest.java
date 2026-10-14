package br.com.coffeemail.workbench.runner.dto;

import org.jspecify.annotations.Nullable;

/** Cadastro de supressão. */
public record CreateSuppressionRequest(@Nullable String email, @Nullable String reason) {}
